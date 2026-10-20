import session from "express-session";

const SESSION_TABLE = "sessions";

function expirationInSeconds(sessionData) {
  const expiresAt = sessionData?.cookie?.expires
    ? new Date(sessionData.cookie.expires).getTime()
    : Date.now() + 8 * 60 * 60 * 1000;
  return Math.max(0, Math.floor(expiresAt / 1000));
}

export class MySQLSessionStore extends session.Store {
  constructor(pool, { cleanupIntervalMs = 15 * 60 * 1000 } = {}) {
    super();
    this.pool = pool;
    this.cleanupTimer = setInterval(() => {
      this.clearExpired().catch(() => {});
    }, cleanupIntervalMs);
    this.cleanupTimer.unref?.();
  }

  get(sessionId, callback) {
    this.pool
      .execute(
        `SELECT data, expires FROM ${SESSION_TABLE} WHERE session_id = ? LIMIT 1`,
        [sessionId],
      )
      .then(async ([rows]) => {
        const row = rows[0];
        if (!row) return callback(null, null);
        if (Number(row.expires) <= Math.floor(Date.now() / 1000)) {
          await this.destroy(sessionId, () => {});
          return callback(null, null);
        }
        try {
          callback(null, JSON.parse(row.data));
        } catch {
          await this.destroy(sessionId, () => {});
          callback(null, null);
        }
      })
      .catch((error) => callback(error));
  }

  set(sessionId, sessionData, callback = () => {}) {
    const expires = expirationInSeconds(sessionData);
    const data = JSON.stringify(sessionData);
    this.pool
      .execute(
        `INSERT INTO ${SESSION_TABLE} (session_id, expires, data) VALUES (?, ?, ?) ` +
          "ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)",
        [sessionId, expires, data],
      )
      .then(() => callback(null))
      .catch((error) => callback(error));
  }

  touch(sessionId, sessionData, callback = () => {}) {
    this.pool
      .execute(`UPDATE ${SESSION_TABLE} SET expires = ? WHERE session_id = ?`, [
        expirationInSeconds(sessionData),
        sessionId,
      ])
      .then(() => callback(null))
      .catch((error) => callback(error));
  }

  destroy(sessionId, callback = () => {}) {
    this.pool
      .execute(`DELETE FROM ${SESSION_TABLE} WHERE session_id = ?`, [sessionId])
      .then(() => callback(null))
      .catch((error) => callback(error));
  }

  async clearExpired() {
    await this.pool.execute(`DELETE FROM ${SESSION_TABLE} WHERE expires < ?`, [
      Math.floor(Date.now() / 1000),
    ]);
  }

  close() {
    clearInterval(this.cleanupTimer);
  }
}
