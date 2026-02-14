🎓 School Manager Pro – Database Specification

Production-grade PostgreSQL schema specification.

1️⃣ Overview

This document defines the final relational database architecture for School Manager Pro.

The system is designed for:

Single-school deployment

Strict relational integrity

Backend-enforced business rules

Migration from JSON → PostgreSQL

Production readiness

2️⃣ Design Principles

Authentication separated from domain data

Fully normalized relational schema

ENUM-based constraints

Strict foreign key enforcement

No duplicated profile data

Business rules enforced in service layer

Cloud-ready image storage (image_url)

3️⃣ ENUM Types
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'parent');
CREATE TYPE gender_type AS ENUM ('male', 'female');
CREATE TYPE subject_type AS ENUM ('Toán', 'Văn', 'Anh', 'KHTN');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late');

4️⃣ Tables
4.1 USERS (Authentication + Base Profile)

Stores all login accounts.

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

Notes

name is stored here (single source of truth)

Password must be bcrypt-hashed

One-to-one relation with:

teachers

parents

4.2 TEACHERS
CREATE TABLE teachers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    gender gender_type NOT NULL,
    subject subject_type NOT NULL
);

Notes

user_id is UNIQUE (1 user → 1 teacher)

No duplicated name column

Subject is ENUM

4.3 CLASSES
CREATE TABLE classes (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL,
    grade_level INT NOT NULL,
    homeroom_teacher_id BIGINT UNIQUE
        REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

Notes

Each class has:

1 homeroom teacher

4 subject teachers (stored separately)

homeroom_teacher_id is UNIQUE (1 teacher → max 1 homeroom)

4.4 CLASS SUBJECT TEACHERS
CREATE TABLE class_subject_teachers (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL
        REFERENCES classes(id) ON DELETE CASCADE,
    subject subject_type NOT NULL,
    teacher_id BIGINT NOT NULL
        REFERENCES teachers(id) ON DELETE CASCADE,
    UNIQUE(class_id, subject)
);

Notes

Exactly one teacher per subject per class

Constraint:

UNIQUE(class_id, subject)

4.5 STUDENTS
CREATE TABLE students (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    student_code VARCHAR(50) UNIQUE NOT NULL,
    dob DATE NOT NULL,
    gender gender_type NOT NULL,
    class_id BIGINT NOT NULL
        REFERENCES classes(id) ON DELETE CASCADE,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

Notes

student_code must be UNIQUE

image_url stores Cloud image link

Student belongs to exactly one class

4.6 PARENTS
CREATE TABLE parents (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20)
);

Notes

Linked 1-1 with users

Parent name stored in users table

4.7 PARENT – STUDENT RELATIONSHIP
CREATE TABLE parent_students (
    parent_id BIGINT NOT NULL
        REFERENCES parents(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL
        REFERENCES students(id) ON DELETE CASCADE,
    PRIMARY KEY (parent_id, student_id)
);

Relationship

One parent → multiple students

One student → multiple parents

Many-to-many mapping table

4.8 ATTENDANCE
CREATE TABLE attendance (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL
        REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status attendance_status NOT NULL,
    confidence NUMERIC(4,3),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, date)
);

Notes

One attendance record per student per day

confidence stores Face-ID score

5️⃣ Business Rules (Service Layer Enforced)

The database ensures structural integrity.

Business rules must be enforced in backend services:

Teacher

Max 4 teaching classes

Max 1 homeroom assignment

Class

Exactly 4 subject teachers

Exactly 1 homeroom teacher

Student

Unique student_code

Valid class_id

Attendance

One record per student per day

6️⃣ Insertion Order (Seed / Migration)

Correct insertion order:

users
teachers
classes
class_subject_teachers
students
parents
parent_students
attendance


Foreign keys must be respected.

7️⃣ Migration Strategy (JSON → PostgreSQL)

Create schema

Run seed script

Migrate JSON data into relational format

Replace JSON service layer with SQL services

Remove JSON storage

Verify integrity

8️⃣ Architecture Guarantees

No duplicated identity fields

Strong relational consistency

ENUM-enforced domain constraints

Cloud image support

Production-ready normalization

Scalable structure

9️⃣ Current Status

Database design finalized.

Ready for:

Seed script implementation

Service refactor

JSON → PostgreSQL migration

Production deployment