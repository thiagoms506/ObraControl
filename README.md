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

## Como abrir

Como o JavaScript usa módulos do navegador, abra a pasta no VS Code e inicie `index.html` com uma extensão de servidor local, como Live Server. Depois, abra o endereço local informado pela extensão no navegador.

## Como experimentar a calculadora

No menu, escolha **Calculadora**. Informe dois valores, selecione a operação e pressione **Calcular**. Para porcentagem, `Valor A` é a taxa e `Valor B` é o valor base; por exemplo, `10` e `200` calculam 10% de 200. As calculadoras de área e volume recebem todas as medidas em metros.

Na área **Obras**, use **Nova obra** para cadastrar contratos e **Editar obra** para atualizar seus dados. Os registros ficam salvos no armazenamento local deste navegador. Informe valores monetários no formato brasileiro: por exemplo, `50.000` ou `50.000,00` representam cinquenta mil reais. O gráfico de cada obra divide o valor contratado entre gastos registrados e valor ainda não gasto.

Use **Excluir obra** no cartão para removê-la. O sistema pede confirmação e informa o valor de despesas que também será removido.

Use a aba **Histórico** para consultar obras com a situação **Concluída**. Ao alterar a situação no formulário, a obra passa para a lista correspondente sem perder os dados.

Na área **Despesas**, registre gastos associados a uma obra. A categoria **Gastos gerais** permite lançar um total acumulado sem informar cada item. As despesas somadas aparecem no cartão da obra e no gráfico. O resumo geral soma o recebido, o que falta receber e as despesas de todas as obras; o saldo mostra recebido menos despesas.

Se já havia um valor no campo antigo **Já gasto**, o sistema o transforma em um lançamento **Gastos anteriores sem detalhamento** na primeira abertura. O registro original é zerado após a migração para evitar que o mesmo valor seja contado duas vezes. Os dados continuam salvos somente neste navegador.
