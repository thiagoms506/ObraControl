import { randomBytes, timingSafeEqual } from "node:crypto";

export function createCsrfToken() {
  return randomBytes(32).toString("hex");
}

export function csrfGuard(request, response, next) {
  const expected = request.session?.csrfToken;
  const supplied = request.get("X-CSRF-Token");
  if (
    typeof expected !== "string" ||
    typeof supplied !== "string" ||
    expected.length !== supplied.length
  ) {
    return response.status(403).json({
      status: "error",
      message: "Solicitação inválida. Atualize a página e tente novamente.",
    });
  }

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    return response.status(403).json({
      status: "error",
      message: "Solicitação inválida. Atualize a página e tente novamente.",
    });
  }
  next();
}
