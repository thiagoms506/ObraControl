export function calculateVolume(width, length, height) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(length) ||
    !Number.isFinite(height)
  ) {
    throw new Error("Informe largura, comprimento e altura válidos.");
  }

  if (width <= 0 || length <= 0 || height <= 0) {
    throw new Error("As medidas devem ser maiores que zero.");
  }

  return width * length * height;
}
