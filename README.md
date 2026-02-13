# Face Recognition Attendance System - Refactor Documentation

## 1. Project Overview

This project is a school attendance and management system using face recognition with a Node.js backend, Python AI engine, browser camera frontend, and Arduino serial integration.

The system evolved from a pure Face Recognition prototype into a structured school management platform with enforced business rules and scalable data architecture.

### Current goals achieved

- Single startup command: `npm start`
- Stable operation without browser AI/WASM
- Controlled recognition flow to avoid backend overload
- Clear separation of frontend orchestration and backend AI processing
- Structured Admin module with enforced business rules
- CSV import/export workflows with validation
- JSON-based temporary storage (migration-ready architecture)

## 2. Original Architecture (Before Refactor)

### Frontend-heavy approach

- Browser used MediaPipe FaceDetection (WASM) for local face detection
- Frontend handled both camera stream and AI detection logic
- Verification requests were triggered from frontend state logic

### Observed issues

- Frequent MediaPipe runtime crashes in browser
- Constructor loading inconsistency across environments
- Race conditions around detector initialization and frame send
- Infinite restart loops after WASM abort
- Browser performance degradation under heavy AI workload

## 3. Technical Problems Encountered

- `Aborted(native code called abort())` during `detector.send()`
- `FaceDetection is not a constructor`
- CDN-based runtime instability
- Async race conditions corrupting detector lifecycle
- Overlapping verification calls causing backend overload

## 4. Root Cause Analysis

The root causes were architectural and runtime-related:

- **Browser WASM dependency in critical path**
  - MediaPipe lifecycle became a runtime reliability bottleneck.
- **Async race conditions**
  - Frame pipeline could run while detector was not fully initialized.
- **Inconsistent runtime loading**
  - Global constructor availability depended on script timing.
- **Error-recovery loop amplification**
  - Abort → restart → immediate resend created instability.

## 5. Refactoring Strategy

### Strategic changes

- Removed MediaPipe from frontend entirely
- Kept Python AI engine (`face_engine.py`, `train_faces.py`)
- Moved all AI inference to backend
- Converted frontend into deterministic FSM orchestrator
- Introduced service-layer backend architecture for Admin module

### Design principles used

- Move heavy AI logic out of browser
- Backend-first validation
- Deterministic frontend state machine
- Strict business rule enforcement
- Migration-ready data design
- Maintain single command startup (`npm start`)

## 6. Final Architecture Diagram (ASCII)

```
[Browser Frontend]
  - Camera stream
  - FSM orchestration
  - Poll /api/face/detect every 200ms
  - Call /api/face/verify after 5s stable presence
         |
         v
[Node.js Server (Express)]
  - Service-layer architecture
  - Spawns Python AI on startup
  - /api/face/detect  -> lightweight detection
  - /api/face/verify  -> recognition
  - CSV import/export
  - Attendance analytics
         |
         v
[Python AI Engine]
  - face_recognition
  - Detect: face_locations
  - Verify: encoding + distance matching
```

## 7. Face Scanning Logic (5s Confirm + 2s Cooldown)

### FSM flow

```
IDLE
 -> SCANNING
 -> CONFIRMING (5 seconds)
 -> VERIFYING
 -> COOLDOWN (2 seconds)
 -> SCANNING
```

### Behavior

- Detection runs every 200ms
- Confirmation requires 5 continuous seconds
- Verification called once per cycle
- Cooldown prevents rapid re-trigger

## 8. Performance Optimization

- Detection endpoint uses lightweight `face_locations`
- Verification gated behind FSM
- No continuous recognition loop
- Backend handles AI workload
- Frontend CPU load significantly reduced

## 9. Admin Module Architecture

### Service Layer Structure

Business logic isolated into:

- `teacherService`
- `classService`
- `studentService`

Controllers are thin and only:

- Parse requests
- Call services
- Return responses

## 10. Business Rules Enforcement

### Teacher

- Maximum 4 teaching classes
- Only 1 homeroom assignment
- Auto-generate password if omitted
- Hash password using bcrypt
- Never return password from storage

### Class

- Must have exactly 4 subject teachers
- Must have 1 homeroom teacher
- Backend rejects violations

### Student

- `student_code` unique
- Manual add → auto-generated format `HSYYYY-XXX`
- CSV import requires explicit `student_code`

## 11. CSV Import System

### Two import modes

#### Merge mode (default)

- Existing `student_code` → UPDATE
- New → INSERT
- No deletions

#### Replace mode

- DELETE all students of selected class
- INSERT entire CSV

### Editable Preview Grid

- Client-side CSV parsing
- Real-time validation
- Duplicate detection (in CSV + DB)
- Invalid rows highlighted
- Tooltip error explanation
- Import disabled if validation fails

## 12. CSV Export

### Endpoints

- `GET /api/teachers/export`
- `GET /api/classes/export`

### Frontend trigger

```
window.location.href = "/api/teachers/export";
window.location.href = "/api/classes/export";
```

Exports correct headers and UTF-8 encoding.

## 13. Data Consistency Fix

### Issue

Mixed `class_id` types:

- Some numeric
- Some string

This caused:

- Filter failure
- Import mismatch
- Silent UI inconsistencies

### Resolution

Normalized to use class name string as canonical identifier in JSON phase.
Backend performs normalization during load.

## 14. UTF-8 Encoding Fix

Vietnamese names were corrupted.

Fixes:

- All JSON rewritten in UTF-8
- Explicit response header: `Content-Type: application/json; charset=utf-8`

## 15. JSON Storage (Temporary Database)

Temporary files:

- `data/classes.json`
- `data/teachers.json`
- `data/students.json`
- `data/users.json`
- `data/attendance.json`

Hard-coded subjects:

- Toán
- Văn
- Anh
- KHTN

## 16. Database Migration Plan (PostgreSQL)

Future architecture:

- Replace JSON with PostgreSQL
- Proper foreign keys
- Merge → UPSERT
- Replace → `DELETE WHERE class_id`
- Seed script for migration
- Remove file-based storage

## 17. Lessons Learned

- Browser AI is fragile in critical workflows.
- Backend-first validation increases stability.
- Service-layer separation improves maintainability.
- FSM gating prevents endpoint abuse.
- JSON storage does not scale for transactional logic.
- Data normalization must be enforced early.

## 18. System Maturity

| Component | Status |
| --- | --- |
| Face Recognition Engine | Stable |
| Backend Service Layer | Structured |
| CSV Import System | Advanced |
| Export System | Operational |
| Attendance Analytics | Functional |
| Data Model Consistency | Normalized |
| Migration Readiness | High |

## Run

```
npm start
```

## Key Endpoints

- `POST /api/face/detect`
- `POST /api/face/verify`
- `POST /api/face/train`
- `GET/POST/PUT/DELETE /api/teachers`
- `GET/POST/PUT/DELETE /api/classes`
- `GET/POST/PUT/DELETE /api/students`
- `POST /api/students/import`
- `GET /api/teachers/export`
- `GET /api/classes/export`
- `GET /api/summary`
