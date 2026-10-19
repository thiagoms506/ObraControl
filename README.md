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

## Como abrir

Como o JavaScript usa módulos do navegador, abra a pasta no VS Code e inicie `index.html` com uma extensão de servidor local, como Live Server. Depois, abra o endereço local informado pela extensão no navegador.

## Como experimentar a calculadora

No menu, escolha **Calculadora**. Informe dois valores, selecione a operação e pressione **Calcular**. Para porcentagem, `Valor A` é a taxa e `Valor B` é o valor base; por exemplo, `10` e `200` calculam 10% de 200. As calculadoras de área e volume recebem todas as medidas em metros.
