const { pool } = require("../backend/config/db");

async function checkServiceQuery() {
    const client = await pool.connect();
    try {
        console.log("--- CHECKING SERVICE QUERY ---");

        // Hardcoded User ID 4 (Lê Minh Anh) from previous run
        const userId = 4;

        const query = `
      SELECT
        cst.id AS class_subject_teacher_id,
        cst.class_id,
        c.name AS class_name,
        cst.subject,
        t.id AS teacher_id,
        u.id AS user_id,
        u.name AS teacher_name
      FROM class_subject_teachers cst
      JOIN classes c ON c.id = cst.class_id
      JOIN teachers t ON t.id = cst.teacher_id
      JOIN users u ON u.id = t.user_id
      WHERE u.id = $1
      ORDER BY c.name, cst.subject;
    `;

        const res = await client.query(query, [userId]);
        console.log(`Service Query found ${res.rows.length} rows.`);
        console.table(res.rows);

        if (res.rows.length === 0) {
            console.log("!!! SERVICE QUERY RETURNED EMPTY !!!");
            console.log("Checking individual tables...");

            const u = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
            console.log("User:", u.rows[0]);

            const t = await client.query("SELECT * FROM teachers WHERE user_id = $1", [userId]);
            console.log("Teacher:", t.rows[0]);

            if (t.rows.length > 0) {
                const tid = t.rows[0].id;
                const cst = await client.query("SELECT * FROM class_subject_teachers WHERE teacher_id = $1", [tid]);
                console.log("Assignments (raw):", cst.rows);

                // Check Class existence for each assignment
                for (const assign of cst.rows) {
                    const c = await client.query("SELECT * FROM classes WHERE id = $1", [assign.class_id]);
                    console.log(`Class ${assign.class_id} exists?`, c.rows.length > 0);
                }
            }
        } else {
            console.log("Data looks OK. The API should work.");
        }

    } catch (err) {
        console.error("ERROR:", err);
    } finally {
        client.release();
        process.exit();
    }
}

checkServiceQuery();
