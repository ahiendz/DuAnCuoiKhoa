const bcrypt = require("bcrypt");
const { pool } = require("../config/db");

/**
 * Parent Service
 * Handles parent account creation and management
 */

/**
 * Creates a new parent account or retrieves existing one by email
 * This is idempotent - safe to call multiple times with same email
 * 
 * @param {Object} params
 * @param {string} params.email - Parent email (unique identifier)
 * @param {string} params.full_name - Parent full name
 * @param {string} params.phone - Parent phone number
 * @param {string} params.default_password - Default password (usually student_code)
 * @param {Object} params.client - Optional pg client for transaction support
 * @returns {Promise<{parent_id: number, user_id: number, is_new: boolean}>}
 */
async function createOrGetParent({ email, full_name, phone, default_password, client: externalClient }) {
    if (!email || !full_name) {
        throw new Error("Email và họ tên phụ huynh là bắt buộc");
    }

    const client = externalClient || await pool.connect();
    const shouldManageTransaction = !externalClient;

    try {
        if (shouldManageTransaction) {
            await client.query('BEGIN');
        }

        // Check if parent already exists by email
        const existingUserQuery = `
      SELECT u.id as user_id, p.id as parent_id
      FROM users u
      LEFT JOIN parents p ON p.user_id = u.id
      WHERE u.email = $1 AND u.role = 'parent'
      LIMIT 1;
    `;
        const existingResult = await client.query(existingUserQuery, [email]);

        if (existingResult.rows.length > 0) {
            // Parent already exists
            const existing = existingResult.rows[0];

            // If user exists but parent record doesn't (edge case), create parent record
            if (!existing.parent_id) {
                const insertParentQuery = `
          INSERT INTO parents (user_id, phone, full_name)
          VALUES ($1, $2, $3)
          RETURNING id;
        `;
                const parentResult = await client.query(insertParentQuery, [existing.user_id, phone, full_name]);

                if (shouldManageTransaction) {
                    await client.query('COMMIT');
                }
                return {
                    parent_id: parentResult.rows[0].id,
                    user_id: existing.user_id,
                    is_new: false
                };
            }

            if (shouldManageTransaction) {
                await client.query('COMMIT');
            }
            return {
                parent_id: existing.parent_id,
                user_id: existing.user_id,
                is_new: false
            };
        }

        // Create new parent account
        // 1. Hash the default password
        const password_hash = await bcrypt.hash(default_password, 10);

        // 2. Create user account
        const insertUserQuery = `
      INSERT INTO users (name, email, password_hash, role, must_change_password, is_active)
      VALUES ($1, $2, $3, 'parent', TRUE, TRUE)
      RETURNING id;
    `;
        const userResult = await client.query(insertUserQuery, [full_name, email, password_hash]);
        const user_id = userResult.rows[0].id;

        // 3. Create parent record
        const insertParentQuery = `
      INSERT INTO parents (user_id, phone, full_name)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;
        const parentResult = await client.query(insertParentQuery, [user_id, phone, full_name]);
        const parent_id = parentResult.rows[0].id;

        if (shouldManageTransaction) {
            await client.query('COMMIT');
        }

        return {
            parent_id,
            user_id,
            is_new: true
        };
    } catch (error) {
        if (shouldManageTransaction) {
            await client.query('ROLLBACK');
        }
        console.error("Error in createOrGetParent:", error);
        throw new Error(`Không thể tạo tài khoản phụ huynh: ${error.message}`);
    } finally {
        if (shouldManageTransaction) {
            client.release();
        }
    }
}

/**
 * Links a parent to a student
 * 
 * @param {Object} params
 * @param {number} params.parent_id - Parent ID
 * @param {number} params.student_id - Student ID
 * @param {string} params.relationship - Relationship type (e.g., 'father', 'mother', 'guardian')
 * @param {Object} params.client - Optional pg client for transaction support
 * @returns {Promise<void>}
 */
async function linkParentToStudent({ parent_id, student_id, relationship, client }) {
    if (!parent_id || !student_id) {
        throw new Error("Parent ID và Student ID là bắt buộc");
    }

    try {
        const insertQuery = `
      INSERT INTO student_parents (parent_id, student_id, relationship, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT ON CONSTRAINT student_parents_unique_link DO NOTHING;
    `;
        const queryClient = client || pool;
        await queryClient.query(insertQuery, [parent_id, student_id, relationship || null]);
    } catch (error) {
        console.error("Error in linkParentToStudent:", error);
        throw new Error(`Không thể liên kết phụ huynh với học sinh: ${error.message}`);
    }
}

/**
 * Gets all students for a parent (by user_id)
 * Used for ownership validation and dashboard
 * 
 * @param {number} user_id - Parent's user ID
 * @returns {Promise<Array>}
 */
async function getParentStudents(user_id) {
    if (!user_id) {
        throw new Error("User ID là bắt buộc");
    }

    try {
        const query = `
      SELECT 
        s.id,
        s.full_name,
        s.student_code,
        s.dob,
        s.gender,
        s.class_id,
        c.name as class_name,
        sp.relationship
      FROM students s
      JOIN student_parents sp ON sp.student_id = s.id
      JOIN parents p ON p.id = sp.parent_id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE p.user_id = $1
      ORDER BY s.full_name;
    `;
        const result = await pool.query(query, [user_id]);
        return result.rows;
    } catch (error) {
        console.error("Error in getParentStudents:", error);
        throw new Error(`Không thể lấy danh sách học sinh: ${error.message}`);
    }
}

/**
 * Validates that a parent owns/has access to a specific student
 * 
 * @param {number} user_id - Parent's user ID
 * @param {number} student_id - Student ID to check
 * @returns {Promise<boolean>}
 */
async function validateParentOwnership(user_id, student_id) {
    if (!user_id || !student_id) {
        return false;
    }

    try {
        const query = `
      SELECT 1
      FROM student_parents sp
      JOIN parents p ON p.id = sp.parent_id
      WHERE p.user_id = $1 AND sp.student_id = $2
      LIMIT 1;
    `;
        const result = await pool.query(query, [user_id, student_id]);
        return result.rows.length > 0;
    } catch (error) {
        console.error("Error in validateParentOwnership:", error);
        return false;
    }
}

module.exports = {
    createOrGetParent,
    linkParentToStudent,
    getParentStudents,
    validateParentOwnership
};
