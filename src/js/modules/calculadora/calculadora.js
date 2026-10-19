import { calculateBasic } from "./calculos/basica.js";
import { calculateArea } from "./calculos/area.js";
import { calculateVolume } from "./calculos/volume.js";

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

export function setupAreaCalculator() {
  const form = document.querySelector("#area-calculator");
  const widthInput = document.querySelector("#area-width");
  const lengthInput = document.querySelector("#area-length");
  const result = document.querySelector("#area-result");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    try {
      const area = calculateArea(
        widthInput.valueAsNumber,
        lengthInput.valueAsNumber,
      );

      result.textContent = `Área: ${formatter.format(area)} m²`;
      result.className = "result-area has-result";
    } catch (error) {
      result.textContent = error.message;
      result.className = "result-area has-error";
    }
  });
}

export function setupVolumeCalculator() {
  const form = document.querySelector("#volume-calculator");
  const widthInput = document.querySelector("#volume-width");
  const lengthInput = document.querySelector("#volume-length");
  const heightInput = document.querySelector("#volume-height");
  const result = document.querySelector("#volume-result");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    try {
      const volume = calculateVolume(
        widthInput.valueAsNumber,
        lengthInput.valueAsNumber,
        heightInput.valueAsNumber,
      );

      result.textContent = `Volume: ${formatter.format(volume)} m³`;
      result.className = "result-area has-result";
    } catch (error) {
      result.textContent = error.message;
      result.className = "result-area has-error";
    }
  });
}
