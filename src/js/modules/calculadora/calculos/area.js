export function calculateArea(width, length) {
  if (!Number.isFinite(width) || !Number.isFinite(length)) {
    throw new Error("Informe largura e comprimento válidos.");
  }

  if (width <= 0 || length <= 0) {
    throw new Error("As medidas devem ser maiores que zero.");
  }

  return width * length;
}
