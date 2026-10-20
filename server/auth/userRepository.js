import { randomUUID } from "node:crypto";

export class UserRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findByEmail(email) {
    const [rows] = await this.pool.execute(
      "SELECT id, email, password_hash FROM usuarios WHERE email = ? LIMIT 1",
      [email],
    );
    return rows[0] ?? null;
  }

  async create({ email, passwordHash }) {
    const user = { id: randomUUID(), email };
    await this.pool.execute(
      "INSERT INTO usuarios (id, email, password_hash) VALUES (?, ?, ?)",
      [user.id, user.email, passwordHash],
    );
    return user;
  }
}
