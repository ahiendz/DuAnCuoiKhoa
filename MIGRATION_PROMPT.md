🎯 Objective

Refactor the entire backend from JSON file storage to PostgreSQL.

The system currently uses:

data/users.json

data/teachers.json

data/classes.json

data/students.json

data/attendance.json

PostgreSQL schema is already finalized and created.

You must:

Remove all JSON storage usage

Migrate all services to PostgreSQL

Keep API routes unchanged

Preserve all business rules

Ensure system runs successfully

You have full permission to refactor backend structure.

🧱 Database

Tables already exist:

users

teachers

classes

class_subject_teachers

students

parents

parent_students

attendance

ENUM types:

user_role

gender_type

subject_type

attendance_status

Do not modify schema. Adapt code to match schema.

🔧 Required Work
1️⃣ Create DB Connection

Create:

/config/db.js


Using pg Pool.

Use env variables:

DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME

2️⃣ Remove JSON Storage Completely

Delete all usage of:

fs.readFile
fs.writeFile
require('./data/*.json')


No fallback allowed.

3️⃣ Refactor Services

Refactor:

authService

teacherService

classService

studentService

attendanceService

All CRUD must use SQL.

4️⃣ Business Rules (Must Still Work)
Teachers

Max 4 teaching classes

Max 1 homeroom assignment

Password hashed using bcrypt

Never return password_hash

Classes

Exactly 4 subject teachers

1 homeroom teacher

Students

Unique student_code

Manual add → auto generate HSYYYY-XXX

CSV import:

Merge mode → UPSERT

Replace mode → DELETE WHERE class_id + INSERT

Attendance

Unique (student_id, date)

Store confidence

ENUM status

Use transactions where needed.

5️⃣ Create Seed Script

Create:

/scripts/seed.js


Seed must:

Insert 1 admin

Insert 4 teachers

Insert 2 classes

Assign subject teachers

Insert 10 students per class

Insert attendance sample

Insert 1 parent linked to student

Add in package.json:

"seed": "node scripts/seed.js"

6️⃣ Optional: JSON Migration Script

Create:

/scripts/migrate-json.js


Import old JSON data into PostgreSQL once.

🧪 Mandatory Testing

Before completing:

Run server

Run seed script

Test endpoints:

GET /api/teachers

POST /api/teachers

GET /api/classes

POST /api/students

POST /api/students/import

GET /api/attendance

POST /api/auth/login

Confirm:

No JSON usage remains

All CRUD works

Business rules enforced

No unhandled errors

No SQL injection risk

Only finish after successful testing.

⚠️ Rules

Use async/await

Use transactions

Keep API contract unchanged

Do not weaken validation

Do not partially migrate

✅ Final Deliverables

db.js

Updated services

seed.js

Optional migrate-json.js

Updated package.json

Confirmation server runs successfully

Proceed with full migration.