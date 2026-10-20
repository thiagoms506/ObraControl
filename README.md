# ObraControl

Aplicação web inicial para apoiar a organização do dia a dia de uma obra.

## Estrutura atual

- `index.html`: conteúdo da página inicial e da calculadora.
- `src/css/styles.css`: cores, espaçamentos e adaptação para telas menores.
- `src/js/app.js`: inicialização da página e navegação.
- `src/js/modules/calculadora/calculadora.js`: conecta os campos da calculadora às contas.
- `src/js/modules/calculadora/calculos/basica.js`: funções matemáticas da calculadora básica.
- `src/js/modules/calculadora/calculos/area.js`: cálculo de superfícies retangulares em metros quadrados.
- `src/js/modules/calculadora/calculos/volume.js`: cálculo de volumes em metros cúbicos.
- `src/js/modules/obras/obras.js`: cadastro, lista e resumo financeiro das obras.
- `src/js/modules/obras/financeiro.js`: cálculos de valores a receber, saldo e dados do gráfico.
- `src/js/modules/despesas/despesas.js`: lançamentos de despesas e resumo financeiro geral.
- `src/js/modules/materiais/pedidos.js`: catálogo interno e montagem temporária de pedidos de materiais.

## Pedidos de materiais

Na seção **Materiais**, selecione uma obra, adicione itens do catálogo ou cadastre materiais manualmente e revise quantidades e unidades. O pedido permanece somente na memória da página; atualizar ou fechar a página limpa a lista.

Ao gerar o documento, escolha **Salvar como PDF** na janela de impressão do navegador. O título do documento sugere um nome de arquivo baseado na obra. A exportação em JPEG não está incluída para manter texto e tabela nítidos.

## Como abrir

Como o JavaScript usa módulos do navegador, abra a pasta no VS Code e inicie `index.html` com uma extensão de servidor local, como Live Server. Depois, abra o endereço local informado pela extensão no navegador.

## Como experimentar a calculadora

No menu, escolha **Calculadora**. Informe dois valores, selecione a operação e pressione **Calcular**. Para porcentagem, `Valor A` é a taxa e `Valor B` é o valor base; por exemplo, `10` e `200` calculam 10% de 200. As calculadoras de área e volume recebem todas as medidas em metros.

Na área **Obras**, use **Nova obra** para cadastrar contratos e **Editar obra** para atualizar seus dados. Os registros ficam salvos no armazenamento local deste navegador. Informe valores monetários no formato brasileiro: por exemplo, `50.000` ou `50.000,00` representam cinquenta mil reais. O gráfico de cada obra divide o valor contratado entre gastos registrados e valor ainda não gasto.

Use **Excluir obra** no cartão para removê-la. O sistema pede confirmação e informa o valor de despesas que também será removido.

Use a aba **Histórico** para consultar obras com a situação **Concluída**. Ao alterar a situação no formulário, a obra passa para a lista correspondente sem perder os dados.

Na área **Despesas**, registre gastos associados a uma obra. A categoria **Gastos gerais** permite lançar um total acumulado sem informar cada item. As despesas somadas aparecem no cartão da obra e no gráfico. O resumo geral soma o recebido, o que falta receber e as despesas de todas as obras; o saldo mostra recebido menos despesas.

Se já havia um valor no campo antigo **Já gasto**, o sistema o transforma em um lançamento **Gastos anteriores sem detalhamento** na primeira abertura. O registro original é zerado após a migração para evitar que o mesmo valor seja contado duas vezes. Os dados continuam salvos somente neste navegador.

## Backend (Etapa 1)

O servidor Express é independente da interface atual. Ele disponibiliza as rotas de saúde na porta `3000` por padrão e usa um pool `mysql2` para conectar ao banco `obracontrol`.

### Configuração

1. Copie `.env.example` para `.env` na raiz do projeto.
2. Preencha `DB_USER` e `DB_PASSWORD` com as credenciais locais do MySQL. Ajuste `DB_HOST`, `DB_PORT` ou `DB_NAME` se necessário. Não versione o arquivo `.env`.
3. Instale as dependências com `npm install`.
4. Inicie o servidor com `npm start`.

O servidor escuta em `127.0.0.1` por padrão. `PORT` e `HOST` podem ser alterados no `.env`.

### Verificação

Com o servidor iniciado, teste no PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/health
Invoke-RestMethod http://127.0.0.1:3000/api/health/db
```

`/api/health` verifica apenas se o servidor está respondendo. `/api/health/db` executa `SELECT 1` no MySQL e retorna HTTP `503` se a conexão falhar, sem expor credenciais ou detalhes internos.

## Backend de autenticacao

A autenticacao oferece cadastro, login, consulta da sessao e logout nas rotas /api/auth. O servidor usa Argon2id para senhas, sessoes persistentes na tabela MySQL sessions, cookies HttpOnly com SameSite=Lax e Secure quando NODE_ENV=production, token CSRF para operacoes de escrita e limite de tentativas de login por endereco IP. A aplicacao nao registra senhas, hashes, cookies, tokens CSRF nem identificadores de sessao.

Antes de iniciar o servidor com esta etapa, configure SESSION_SECRET no arquivo .env com um valor aleatorio de pelo menos 32 bytes. O servidor recusa segredos ausentes ou fracos. O arquivo .env e ignorado pelo Git; mantenha o valor local ou em um gerenciador de segredos. Em producao, defina NODE_ENV=production e sirva a API por HTTPS. Se houver proxy reverso, configure TRUST_PROXY_HOPS com a quantidade exata de proxies confiaveis entre o cliente e a API (por exemplo, 1 para um proxy); nao confie em cabecalhos enviados diretamente por clientes.

A tabela de sessoes precisa ser criada manualmente: revise server/sql/002_create_sessions.sql e execute-o no banco obracontrol somente depois de aprovar o conteudo. O servidor nao executa migracoes automaticamente. Esta migracao cria somente sessions e nao modifica as tabelas de negocio existentes.

### Rotas de autenticacao

- GET /api/auth/csrf: cria ou retorna o token CSRF da sessao no campo csrfToken.
- POST /api/auth/register: recebe um objeto com email e password e requer o cabecalho X-CSRF-Token. A senha aceita de 15 a 128 caracteres, ate 512 bytes.
- POST /api/auth/login: recebe os mesmos campos e requer X-CSRF-Token. O limite e de 60 tentativas malsucedidas por IP em 15 minutos; tentativas bem-sucedidas nao contam.
- GET /api/auth/session: informa se a sessao atual esta autenticada.
- POST /api/auth/logout: requer X-CSRF-Token e encerra a sessao.

O token CSRF deve ser obtido e enviado pelo cliente em cada operacao de escrita. O frontend existente ainda nao esta integrado a essas rotas.

### Testes

Execute npm test. Os testes usam o MemoryStore do express-session e um repositorio de usuarios em memoria, sem importar o pool MySQL nem alterar usuarios ou sessoes do banco de desenvolvimento.
