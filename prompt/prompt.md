School Manager Pro – Parent Module Refactor & Enhancement (Production)
1. Project Context

You are working on a production-ready system called School Manager Pro.

Tech stack:

Frontend: React (Vite)

Backend: Node.js + Express

Database: PostgreSQL

Auth: JWT

Password hashing: bcrypt

A full database backup has already been created.

You are allowed to:

Add columns if necessary

Add constraints

Add indexes

Add migration SQL

You are NOT allowed to:

Drop existing tables

Remove existing columns

Break existing foreign key relationships

Modify unrelated modules

All changes must be backward compatible.

2. Current Relevant Database Structure
users
id (PK)
email (UNIQUE)
password_hash
role ('admin','teacher','parent')
created_at


Login is email-based.

parents
id (PK)
user_id (FK -> users.id)
phone


Stores parent contact info.

student_parents
parent_id (FK)
student_id (FK)


Many-to-many relationship.

students
id
full_name
student_code (UNIQUE)
dob
gender
class_id

grades
attendance
teacher_notes
classes
subjects

These must NOT be modified unless absolutely required for Parent logic.

3. Goal

Refactor and enhance the Parent module to meet production standards.

You may add:

must_change_password column to users

relationship column to student_parents

full_name column to parents (if missing)

necessary indexes

Do not redesign authentication architecture.

4. Parent Account Creation Logic

When creating a student (manual or Excel import):

Input must include:

parent_name

parent_email

parent_phone

relationship

Backend Flow (Transaction per student)
BEGIN

1. Insert student

2. Check if parent_email exists in users WHERE role='parent'

IF exists:
    → get user_id
    → get parent_id

ELSE:
    → default_password = student_code
    → hash password
    → INSERT users (email, password_hash, role='parent', must_change_password=TRUE)
    → INSERT parents (user_id, phone, full_name)

3. Insert student_parents (student_id, parent_id, relationship)

COMMIT


Rollback on failure.

5. Required Enhancements (If Not Present)

You are allowed to generate migration SQL for:

users

Add:

must_change_password BOOLEAN DEFAULT TRUE
is_active BOOLEAN DEFAULT TRUE
updated_at TIMESTAMP

parents

Ensure:

full_name VARCHAR(200)
phone VARCHAR(20)

student_parents

Add:

relationship VARCHAR(20)
created_at TIMESTAMP DEFAULT NOW()
UNIQUE(student_id, parent_id)

6. Parent Login Logic

POST /api/auth/login

Authenticate by email

Verify password_hash

Check role = 'parent'

If:

must_change_password = TRUE


Return:

{
  force_change_password: true
}


Frontend must redirect to password change page.

7. Force Change Password

Endpoint:

POST /api/auth/change-password-first-time

Rules:

New password >= 8 characters

Must contain letters and numbers

Cannot match default password (student_code)

After success:

UPDATE users
SET password_hash = new_hash,
    must_change_password = FALSE

8. Parent Dashboard Requirements

Parent can only access their own children.

Ownership query:

SELECT s.*
FROM students s
JOIN student_parents sp ON sp.student_id = s.id
JOIN parents p ON p.id = sp.parent_id
WHERE p.user_id = current_user_id

Dashboard Sections
1. Summary

Current term average

Attendance rate

Risk level

2. Grade Analytics

Weighted average:

SUM(score * weight) / SUM(weight)


Grouped by:

Term

Subject

3. Attendance Analytics

Attendance rate:

present / total_days


Alert if < 90%

4. Smart Alert System (Dynamic, no new table)

Trigger:

Term average drops ≥ 1.0

Any subject average < 5

Attendance rate < 90%

Return JSON alerts only.

Do NOT store alerts in DB.

5. Class Comparison (Anonymous)

Compare:

Student average vs class average

Without exposing other student identities.

9. Excel Import Rules

Template must include:

parent_email

parent_phone

relationship

Transaction per row.

Return import summary.

10. Security Rules

Never expose password_hash

Never log plain passwords

Always filter data by parent ownership

Use transactions

Validate foreign keys

11. Output Requirements

You must provide:

Migration SQL (if needed)

Updated ERD description

Backend service logic

API contract definitions

Edge case handling

Security validation logic

All code must be production-ready.

No demo shortcuts.

End of Specification