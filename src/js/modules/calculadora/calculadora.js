import { calculateBasic } from "./calculos/basica.js";

const formatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 6,
});

export function setupBasicCalculator() {
  const form = document.querySelector("#basic-calculator");
  const firstInput = document.querySelector("#first-value");
  const secondInput = document.querySelector("#second-value");
  const operationInput = document.querySelector("#operation");
  const result = document.querySelector("#calculator-result");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const firstValue = firstInput.valueAsNumber;
    const secondValue = secondInput.valueAsNumber;

    try {
      const answer = calculateBasic(
        firstValue,
        operationInput.value,
        secondValue,
      );

      result.textContent = `Resultado: ${formatter.format(answer)}`;
      result.className = "result-area has-result";
    } catch (error) {
      result.textContent = error.message;
      result.className = "result-area has-error";
    }
  });
}
