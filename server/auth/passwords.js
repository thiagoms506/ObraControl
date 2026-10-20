import argon2 from "argon2";
import { randomBytes } from "node:crypto";

const OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

let dummyHashPromise;

export async function hashPassword(password) {
  return argon2.hash(password, OPTIONS);
}

export async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password, { type: argon2.argon2id });
  } catch {
    return false;
  }
}

export async function verifyUnknownAccount(password) {
  dummyHashPromise ??= hashPassword(randomBytes(32).toString("base64url"));
  const hash = await dummyHashPromise;
  await verifyPassword(hash, password);
}
