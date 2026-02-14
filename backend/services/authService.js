const bcrypt = require("bcrypt");
const { pool } = require("../config/db");

function isBcryptHash(value) {
  return typeof value === "string" && value.startsWith("$2");
}

async function login({ email, password, role }) {
  if (!email || !password || !role) {
    throw new Error("Thiếu thông tin đăng nhập");
  }

  const { rows } = await pool.query(
    "SELECT id, name, email, role, password_hash FROM users WHERE email = $1 AND role = $2 LIMIT 1",
    [email, role]
  );

  if (!rows.length) {
    throw new Error("Sai tài khoản hoặc mật khẩu");
  }

  const user = rows[0];

  if (isBcryptHash(user.password_hash)) {
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new Error("Sai tài khoản hoặc mật khẩu");
    }
  } else {
    if (user.password_hash !== password) {
      throw new Error("Sai tài khoản hoặc mật khẩu");
    }
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [hashed, user.id]
    );
  }

  return {
    id: user.id,
    name: user.name,
    role: user.role
  };
}

module.exports = {
  login
};
