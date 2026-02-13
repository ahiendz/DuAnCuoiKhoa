# 🎓 School Manager Pro

A production-oriented web-based school management system.

## 📌 Overview

School Manager Pro is a full-stack application designed for managing:

- Classes
- Teachers
- Students
- Attendance (Face-ID based)

The system is built for a **single-school deployment** and follows clean backend architecture principles.

---

## 🏗 Tech Stack

### Backend
- Node.js
- Express.js
- JSON storage (development phase)
- PostgreSQL (production phase)
- bcrypt (password hashing)

### Frontend
- HTML / CSS / JS
- Bootstrap

### Database Design
- PostgreSQL
- Normalized relational schema
- ERD designed using drawSQL

---

## 🧩 Core Modules

### 1️⃣ Users
Roles:
- admin
- teacher

Passwords are hashed using bcrypt.

---

### 2️⃣ Teachers

Rules:
- Each teacher can teach **maximum 4 classes**
- Each teacher can be **homeroom teacher of only 1 class**
- Subjects are fixed:
  - Toán
  - Văn
  - Anh
  - KHTN

---

### 3️⃣ Classes

Each class must have:
- 1 Homeroom Teacher
- 4 Subject Teachers (one per subject)

Validation enforced at backend level.

---

### 4️⃣ Students

Two modes only:
- Manual Add
- CSV Import

Manual Add:
- student_code auto-generated
- Format: `HS{year}-{increment}`
- Example: `HS2026-001`

CSV Import:
- student_code must be present
- No auto-generation
- Validation:
  - Unique student_code
  - Valid class_id
  - Correct selected class

---

### 5️⃣ Attendance

Unified Face-ID attendance system.

- No manual attendance UI
- Face recognition integration
- Daily attendance tracking
- Filter by class and date

---

## 🗄 Database Schema (PostgreSQL)

Main Tables:

- users
- teachers
- classes
- class_subject_teachers
- students
- attendance

The database is normalized and ready for production migration.

---

## 🔐 Validation Rules

Enforced strictly at backend:

- Teacher max 4 classes
- Teacher only 1 homeroom role
- Class must have 4 subject teachers
- student_code must be unique
- class_id must be valid

---

## 🚀 Development Roadmap

Phase 1:
- JSON storage
- Full business logic implementation

Phase 2:
- PostgreSQL migration
- Seed script
- Production deployment

Phase 3:
- Performance optimization
- Analytics dashboard
- AI-based attendance insights

---

## 📦 Migration Strategy

1. Create PostgreSQL schema
2. Run migration scripts
3. Import seed data
4. Switch storage layer from JSON to DB

---

## 🎯 Design Principles

- Backend-first validation
- Clean service layer
- No business rule logic in frontend
- Production-ready schema
- Stable system over feature overload

---

## 👨‍💻 Author

School Manager Pro – Full-stack architecture project.

---

