export function calculateBasic(firstValue, operation, secondValue) {
  if (!Number.isFinite(firstValue) || !Number.isFinite(secondValue)) {
    throw new Error("Informe dois valores numéricos válidos.");
  }

  switch (operation) {
    case "add":
      return firstValue + secondValue;
    case "subtract":
      return firstValue - secondValue;
    case "multiply":
      return firstValue * secondValue;
    case "divide":
      if (secondValue === 0) {
        throw new Error("Não é possível dividir por zero.");
      }
      return firstValue / secondValue;
    case "percentage":
      return (firstValue / 100) * secondValue;
    default:
      throw new Error("Selecione uma operação válida.");
  }
}
