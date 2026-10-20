const PLACEHOLDER_VALUES = new Set([
  "",
  "changeme",
  "change-me",
  "replace-me",
  "your-secret",
  "your_session_secret",
]);

export function validateSessionSecret(secret) {
  if (typeof secret !== "string") return false;
  const normalized = secret.trim();
  if (PLACEHOLDER_VALUES.has(normalized.toLowerCase())) return false;
  if (Buffer.byteLength(normalized, "utf8") < 32 || normalized.length < 43) {
    return false;
  }
  return new Set(normalized).size >= 12;
}

export function requireSessionSecret(secret) {
  if (!validateSessionSecret(secret)) {
    throw new Error(
      "SESSION_SECRET ausente ou fraco. Configure pelo menos 32 bytes aleatórios no .env.",
    );
  }
  return secret;
}
