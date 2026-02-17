---
description: Pre-release validation workflow for School Manager Pro. Simulates real user flows and checks auth, CRUD, DB integrity, realtime and UI polish before demo or deployment.
---

# School Manager Pro – Release Readiness Check

## Goal
Ensure system is demo-ready or production-ready.
Detect blockers before deploy.

---

## Step 1 – Authentication Flow

Test:

- Login success
- Invalid login
- Token expiration
- Refresh token rotation
- Logout invalidation

Output:
Auth Status:

---

## Step 2 – Core CRUD Smoke Test

Simulate:

- Create class
- Import CSV
- Add student
- Add grade
- Mark attendance
- Generate PDF

Output:
CRUD Stability Report:

---

## Step 3 – Role Simulation

Simulate login as:

- Admin
- Teacher
- Parent

Verify permission boundaries.

Output:
Role Isolation Status:

---

## Step 4 – IoT Simulation (if enabled)

Simulate:

POST /api/attendance/mark-face

Verify:
- DB record created
- WebSocket broadcast works

Output:
IoT Pipeline Status:

---

## Step 5 – Database Integrity

Check:

- Foreign keys
- Cascade delete
- Unique constraints
- Index usage

Output:
DB Integrity Status:

---

## Step 6 – UI Polish

Check:

- No console errors
- Proper loading state
- Empty state handled
- Error toast visible
- No layout break

Output:

Release Readiness Score (0–100):
Blockers:
Improvements:
