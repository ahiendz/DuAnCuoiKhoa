Face Recognition Attendance & School Management System
1. Project Overview

This project evolved from a Face Recognition Attendance prototype into a structured School Management Platform with:

Backend-first architecture

Service-layer separation

PostgreSQL relational model

Controlled AI recognition pipeline

CSV-driven data workflows

Role-based module separation (Admin / Teacher)

The system is designed to be production-ready and migration-safe.

2. Current Architecture
Backend

Node.js (Express)

PostgreSQL

Service-layer pattern

Parameterized SQL queries (no ORM)

AI Engine

Python face_recognition

Backend-driven inference

No browser WASM dependency

Frontend

Vanilla JS

Modular JS files

Dark theme UI

Chart.js for analytics

3. High-Level System Architecture
[Browser Frontend]
  - FSM camera orchestration
  - Teacher & Admin UI
  - Dashboard charts
         |
         v
[Node.js Backend]
  - Routes
  - Controllers
  - Services
  - Grade calculator
  - CSV parser
         |
         v
[PostgreSQL]
  - students
  - teachers
  - classes
  - class_subject_teachers
  - grades

4. Teacher Module (Production Refactor)
Backend Structure
/routes
  teacherRoutes.js

/controllers
  teacherController.js

/services
  teacherGradeService.js

/utils
  gradeCalculator.js

Implemented Endpoints

GET /api/teacher/class-subjects

GET /api/teacher/grades

POST /api/teacher/grades (UPSERT + TBHK calculation)

GET /api/teacher/dashboard

POST /api/teacher/import (CSV)

GET /api/teacher/export (CSV)

5. PostgreSQL Grade Model
grades Table

Each row represents:

1 student
+ 1 subject assignment (class_subject_teacher)
+ 1 semester
+ 1 academic year

Key Columns

student_id

class_subject_teacher_id

semester (HK1 | HK2)

academic_year

Component scores

average_semester

quick_tag

comment_text

Constraint
UNIQUE(student_id, class_subject_teacher_id, semester, academic_year)


Prevents duplicate grade records.

6. Grade Calculation Logic
Weight System
Component	Weight
Miệng	1
15 phút	1
1 tiết	1
Giữa kỳ	2
Cuối kỳ	2
Formula
TBHK =
( sum(weight1_scores)
+ 2 * giuaki
+ 2 * cuoiki )
/
( count(weight1_scores) + 4 )


Rounded to 2 decimal places.

Year Average
TB_NAM = (TBHK1 + 2 * TBHK2) / 3


Calculated dynamically (not stored).

7. Teacher Dashboard
Metrics

Class average

Semester comparison (HK1 vs HK2)

Score distribution (0–4, 5–6, 7–8, 9–10)

Charts

Animated Bar Chart (HK1 vs HK2)

Distribution Chart

UI Stability Fix

maintainAspectRatio: true

Fixed container height

Prevented infinite resize loop

8. CSV Workflow (Teacher)
Import

Fully CSV-based (removed Excel dependency)

Student matching via student_code

UPSERT logic

Class validation accepts:

class_id numeric

class name string

Export

Export by:

class

semester

academic year

UTF-8 safe

9. Admin UI Refactor

Rebuilt in consistent dark theme:

dashboard

classes

teachers

students

attendance

Admin Dashboard Charts

Students per grade level

Teachers per subject

Class size comparison

10. Stability Fixes
Encoding

Standardized UTF-8

Removed corrupted Vietnamese characters

Chart.js Resize Loop

Aspect ratio enforced

Canvas max-height set

Data Normalization

CSV parser rewritten

Robust comma handling inside quotes

Cleaned legacy inconsistent class_id values

11. Performance Improvements

Backend UPSERT instead of delete/insert cycles

Parameterized queries only

Clean service-layer isolation

Reduced frontend computation

Chart rendering stabilized

12. System Maturity
Component	Status
Face Recognition	Stable
PostgreSQL Integration	Operational
Teacher Module	Production-ready
CSV Import/Export	Stable
Dashboard Analytics	Stable
Service Layer	Structured
UI Consistency	Unified
13. Key Endpoints
Face Recognition

POST /api/face/detect

POST /api/face/verify

POST /api/face/train

Teacher

GET /api/teacher/class-subjects

GET /api/teacher/grades

POST /api/teacher/grades

GET /api/teacher/dashboard

POST /api/teacher/import

GET /api/teacher/export

Admin

GET/POST/PUT/DELETE /api/teachers

GET/POST/PUT/DELETE /api/classes

GET/POST/PUT/DELETE /api/students

POST /api/students/import

GET /api/summary

14. Lessons Learned

Browser AI in critical workflows is fragile.

Service-layer separation is mandatory at scale.

UPSERT logic prevents data corruption.

Encoding consistency must be enforced early.

CSV import requires strict validation.

Chart rendering must consider layout constraints.

15. Run
npm start
