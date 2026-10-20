import express from "express";
import session from "express-session";
import { createAuthRouter } from "./routes/auth.js";
import { requireSessionSecret } from "./config.js";

export function createApp({
  userRepository,
  sessionStore,
  sessionSecret,
  checkDatabaseConnection,
}) {
  if (!userRepository || !sessionStore || !checkDatabaseConnection) {
    throw new Error("Dependências da aplicação incompletas.");
  }

  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  const validatedSessionSecret = requireSessionSecret(sessionSecret);
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? "0");
  if (!Number.isSafeInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error(
      "TRUST_PROXY_HOPS deve ser um inteiro maior ou igual a zero.",
    );
  }

  app.disable("x-powered-by");
  if (trustProxyHops > 0) app.set("trust proxy", trustProxyHops);
  app.use(express.json({ limit: "10kb", strict: true }));
  app.use(
    session({
      name: "obracontrol.sid",
      secret: validatedSessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 8 * 60 * 60 * 1000,
      },
    }),
  );

  app.get("/api/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.get("/api/health/db", async (_request, response) => {
    try {
      await checkDatabaseConnection();
      response.status(200).json({ status: "ok", database: "connected" });
    } catch {
      response.status(503).json({
        status: "error",
        database: "unavailable",
        message: "Não foi possível conectar ao banco de dados.",
      });
    }
  });

  app.use("/api/auth", createAuthRouter({ userRepository }));

  app.use((_request, response) => {
    response.status(404).json({
      status: "error",
      message: "Rota não encontrada.",
    });
  });

  app.use((error, _request, response, next) => {
    if (response.headersSent) return next(error);
    if (error?.type === "entity.too.large") {
      return response.status(413).json({
        status: "error",
        message: "A solicitação excede o tamanho permitido.",
      });
    }
    if (error?.type === "entity.parse.failed") {
      return response.status(400).json({
        status: "error",
        message: "O corpo da solicitação é inválido.",
      });
    }
    return response.status(500).json({
      status: "error",
      message: "Ocorreu um erro interno.",
    });
  });

  return app;
}
