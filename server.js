import "dotenv/config";
import {
  checkDatabaseConnection,
  closeDatabasePool,
  pool,
} from "./server/database.js";
import { UserRepository } from "./server/auth/userRepository.js";
import { createApp } from "./server/app.js";
import { requireSessionSecret } from "./server/config.js";
import { MySQLSessionStore } from "./server/session/mysqlStore.js";

const port = Number.parseInt(process.env.PORT || "3000", 10);
const host = process.env.HOST || "127.0.0.1";
const sessionSecret = requireSessionSecret(process.env.SESSION_SECRET);
const sessionStore = new MySQLSessionStore(pool);
const app = createApp({
  userRepository: new UserRepository(pool),
  sessionStore,
  sessionSecret,
  checkDatabaseConnection,
});

const server = app.listen(port, host, () => {
  console.log(`ObraControl API disponível em http://${host}:${port}`);
});

async function shutdown() {
  server.close(async () => {
    sessionStore.close();
    await closeDatabasePool();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
