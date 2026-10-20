import "dotenv/config";
import express from "express";
import {
  checkDatabaseConnection,
  closeDatabasePool,
} from "./server/database.js";

const app = express();
const port = Number.parseInt(process.env.PORT || "3000", 10);
const host = process.env.HOST || "127.0.0.1";

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

app.use((_request, response) => {
  response.status(404).json({
    status: "error",
    message: "Rota não encontrada.",
  });
});

app.use((error, _request, response, _next) => {
  console.error("Erro interno ao processar a requisição.");
  response.status(500).json({
    status: "error",
    message: "Ocorreu um erro interno.",
  });
});

const server = app.listen(port, host, () => {
  console.log(`ObraControl API disponível em http://${host}:${port}`);
});

async function shutdown() {
  server.close(async () => {
    await closeDatabasePool();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
