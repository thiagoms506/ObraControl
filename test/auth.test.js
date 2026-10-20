import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import request from "supertest";
import session from "express-session";
import { verifyPassword } from "../server/auth/passwords.js";
import { createApp } from "../server/app.js";

const validPassword = "Uma senha longa para teste 2026!";

function createHarness() {
  const users = new Map();
  const userRepository = {
    async findByEmail(email) {
      return users.get(email) ?? null;
    },
    async create({ email, passwordHash }) {
      if (users.has(email)) {
        const error = new Error("duplicate");
        error.code = "ER_DUP_ENTRY";
        throw error;
      }
      const user = { id: `test-${users.size + 1}`, email };
      users.set(email, { ...user, password_hash: passwordHash });
      return user;
    },
  };
  const app = createApp({
    userRepository,
    sessionStore: new session.MemoryStore(),
    sessionSecret: randomBytes(48).toString("base64url"),
    checkDatabaseConnection: async () => {},
  });
  return { app, users };
}

async function csrfToken(agent) {
  const response = await agent.get("/api/auth/csrf").expect(200);
  return response.body.csrfToken;
}

test("cadastro normaliza e-mail e armazena somente hash Argon2id", async () => {
  const { app, users } = createHarness();
  const agent = request.agent(app);
  const csrf = await csrfToken(agent);
  const response = await agent
    .post("/api/auth/register")
    .set("X-CSRF-Token", csrf)
    .send({ email: "  Obra.Teste@Example.com ", password: validPassword })
    .expect(201);

  assert.equal(response.body.user.email, "obra.teste@example.com");
  const savedUser = users.get("obra.teste@example.com");
  assert.ok(savedUser.password_hash.startsWith("$argon2id$"));
  assert.notEqual(savedUser.password_hash, validPassword);
  assert.equal(
    await verifyPassword(savedUser.password_hash, validPassword),
    true,
  );
});

test("e-mail duplicado retorna conflito sem expor dados internos", async () => {
  const { app } = createHarness();
  const agent = request.agent(app);
  const csrf = await csrfToken(agent);
  const body = { email: "dup@example.com", password: validPassword };
  await agent
    .post("/api/auth/register")
    .set("X-CSRF-Token", csrf)
    .send(body)
    .expect(201);
  await agent
    .post("/api/auth/register")
    .set("X-CSRF-Token", csrf)
    .send(body)
    .expect(409);
});

test("login cria sessão autenticada e logout encerra a sessão", async () => {
  const { app } = createHarness();
  const agent = request.agent(app);
  let csrf = await csrfToken(agent);
  await agent
    .post("/api/auth/register")
    .set("X-CSRF-Token", csrf)
    .send({ email: "login@example.com", password: validPassword })
    .expect(201);

  const login = await agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", csrf)
    .send({ email: "login@example.com", password: validPassword })
    .expect(200);
  assert.equal(login.body.authenticated, true);
  assert.equal(login.body.user.email, "login@example.com");
  assert.match(login.headers["set-cookie"][0], /HttpOnly/i);
  assert.match(login.headers["set-cookie"][0], /SameSite=Lax/i);

  await agent.get("/api/auth/session").expect(200, {
    authenticated: true,
    user: { id: "test-1", email: "login@example.com" },
  });
  csrf = login.body.csrfToken;
  await agent
    .post("/api/auth/logout")
    .set("X-CSRF-Token", csrf)
    .send({})
    .expect(200, { status: "ok", authenticated: false });
  await agent.get("/api/auth/session").expect(200, { authenticated: false });
});

test("credenciais inválidas retornam a mesma resposta genérica", async () => {
  const { app } = createHarness();
  const agent = request.agent(app);
  let csrf = await csrfToken(agent);
  await agent
    .post("/api/auth/register")
    .set("X-CSRF-Token", csrf)
    .send({ email: "valid@example.com", password: validPassword })
    .expect(201);

  const wrongPassword = await agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", csrf)
    .send({ email: "valid@example.com", password: "Senha errada, longa 2026!" })
    .expect(401);
  const unknownEmail = await agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", csrf)
    .send({ email: "missing@example.com", password: validPassword })
    .expect(401);
  assert.deepEqual(wrongPassword.body, unknownEmail.body);
  assert.equal(wrongPassword.body.message, "E-mail ou senha inválidos.");
});

test("mutação sem token CSRF é recusada", async () => {
  const { app } = createHarness();
  await request(app)
    .post("/api/auth/register")
    .send({ email: "csrf@example.com", password: validPassword })
    .expect(403);
});

test("senha fora dos limites não é truncada nem cadastrada", async () => {
  const { app, users } = createHarness();
  const agent = request.agent(app);
  const csrf = await csrfToken(agent);
  await agent
    .post("/api/auth/register")
    .set("X-CSRF-Token", csrf)
    .send({ email: "long@example.com", password: "a".repeat(129) })
    .expect(400);
  assert.equal(users.size, 0);
});
