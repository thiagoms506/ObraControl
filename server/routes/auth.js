import { Router } from "express";
import rateLimit from "express-rate-limit";
import validator from "validator";
import { createCsrfToken, csrfGuard } from "../middleware/csrf.js";
import {
  hashPassword,
  verifyPassword,
  verifyUnknownAccount,
} from "../auth/passwords.js";

const MAX_PASSWORD_CODEPOINTS = 128;
const MAX_PASSWORD_BYTES = 512;
const REGISTER_MIN_PASSWORD_CODEPOINTS = 15;
const GENERIC_CREDENTIAL_ERROR = "E-mail ou senha inválidos.";

function validateCredentialShape(body, { registration = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (Object.keys(body).some((key) => !["email", "password"].includes(key))) {
    return null;
  }
  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return null;
  }

  const email = body.email.normalize("NFC").trim().toLowerCase();
  const emailBytes = Buffer.byteLength(email, "utf8");
  if (
    !email ||
    emailBytes > 254 ||
    [...email].length > 254 ||
    !validator.isEmail(email)
  ) {
    return null;
  }

  const passwordLength = [...body.password].length;
  const passwordBytes = Buffer.byteLength(body.password, "utf8");
  if (
    passwordLength === 0 ||
    passwordLength > MAX_PASSWORD_CODEPOINTS ||
    passwordBytes > MAX_PASSWORD_BYTES ||
    (registration && passwordLength < REGISTER_MIN_PASSWORD_CODEPOINTS)
  ) {
    return null;
  }
  return { email, password: body.password };
}

function regenerateSession(request) {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function destroySession(request) {
  return new Promise((resolve, reject) => {
    if (!request.session) return resolve();
    request.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

function validateLoginInput(request, response, next) {
  const credentials = validateCredentialShape(request.body);
  if (!credentials) {
    return response.status(400).json({
      status: "error",
      message: "Informe um e-mail válido e uma senha de até 128 caracteres.",
    });
  }
  request.authCredentials = credentials;
  next();
}

export function createAuthRouter({ userRepository }) {
  const router = Router();
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    },
  });

  router.get("/csrf", (request, response) => {
    request.session.csrfToken ??= createCsrfToken();
    response.status(200).json({ csrfToken: request.session.csrfToken });
  });

  router.get("/session", (request, response) => {
    const user = request.session?.user;
    if (!user) return response.status(200).json({ authenticated: false });
    response.status(200).json({
      authenticated: true,
      user: { id: user.id, email: user.email },
    });
  });

  router.post("/register", csrfGuard, async (request, response, next) => {
    const credentials = validateCredentialShape(request.body, {
      registration: true,
    });
    if (!credentials) {
      return response.status(400).json({
        status: "error",
        message:
          "Informe um e-mail válido e uma senha de 15 a 128 caracteres (até 512 bytes).",
      });
    }

    try {
      const passwordHash = await hashPassword(credentials.password);
      const user = await userRepository.create({
        email: credentials.email,
        passwordHash,
      });
      return response.status(201).json({
        status: "ok",
        user: { id: user.id, email: user.email },
      });
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY") {
        return response.status(409).json({
          status: "error",
          message: "Já existe um cadastro com este e-mail.",
        });
      }
      return next(error);
    }
  });

  router.post(
    "/login",
    csrfGuard,
    validateLoginInput,
    loginLimiter,
    async (request, response, next) => {
      const credentials = request.authCredentials;
      try {
        const user = await userRepository.findByEmail(credentials.email);
        if (!user) {
          await verifyUnknownAccount(credentials.password);
          return response.status(401).json({
            status: "error",
            message: GENERIC_CREDENTIAL_ERROR,
          });
        }
        const validPassword = await verifyPassword(
          user.password_hash,
          credentials.password,
        );
        if (!validPassword) {
          return response.status(401).json({
            status: "error",
            message: GENERIC_CREDENTIAL_ERROR,
          });
        }

        await regenerateSession(request);
        request.session.user = { id: user.id, email: user.email };
        request.session.csrfToken = createCsrfToken();
        return response.status(200).json({
          status: "ok",
          authenticated: true,
          user: { id: user.id, email: user.email },
          csrfToken: request.session.csrfToken,
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post("/logout", csrfGuard, async (request, response, next) => {
    try {
      await destroySession(request);
      response.clearCookie("obracontrol.sid", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      return response.status(200).json({
        status: "ok",
        authenticated: false,
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
