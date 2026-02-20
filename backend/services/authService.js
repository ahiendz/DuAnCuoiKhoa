const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_123";

function isBcryptHash(value) {
  return typeof value === "string" && value.startsWith("$2");
}

async function login({ email, password, role }) {
  if (!email || !password || !role) {
    throw new Error("Thiếu thông tin đăng nhập");
  }

  const { rows } = await pool.query(
    "SELECT id, name, email, role, password_hash, must_change_password, is_active FROM users WHERE email = $1 AND role = $2 LIMIT 1",
    [email, role]
  );

  if (!rows.length) {
    throw new Error("Sai tài khoản hoặc mật khẩu");
  }

  const user = rows[0];

  // Check if account is active
  if (!user.is_active) {
    throw new Error("Tài khoản đã bị vô hiệu hóa");
  }

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

  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  const response = {
    id: user.id,
    name: user.name,
    role: user.role,
    token
  };

  // Check if user must change password
  if (user.must_change_password) {
    response.force_change_password = true;
  }

  return response;
}

/**
 * Changes password for first-time login (forced password change)
 * 
 * @param {Object} params
 * @param {number} params.user_id - User ID
 * @param {string} params.new_password - New password
 * @param {string} params.default_password - Default password (to prevent reuse)
 * @returns {Promise<void>}
 */
async function changePasswordFirstTime({ user_id, new_password, default_password }) {
  if (!user_id || !new_password) {
    throw new Error("Thiếu thông tin");
  }

  // Validate password strength
  if (new_password.length < 8) {
    throw new Error("Mật khẩu phải có ít nhất 8 ký tự");
  }

  const hasLetter = /[a-zA-Z]/.test(new_password);
  const hasNumber = /[0-9]/.test(new_password);

  if (!hasLetter || !hasNumber) {
    throw new Error("Mật khẩu phải chứa cả chữ và số");
  }

  // Prevent reusing default password
  if (default_password && new_password === default_password) {
    throw new Error("Không thể sử dụng mật khẩu mặc định");
  }

  try {
    const password_hash = await bcrypt.hash(new_password, 10);

    await pool.query(
      "UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [password_hash, user_id]
    );
  } catch (error) {
    console.error("Error in changePasswordFirstTime:", error);
    throw new Error("Không thể đổi mật khẩu");
  }
}

module.exports = {
  login,
  changePasswordFirstTime
};
