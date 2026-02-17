# School Manager Pro – Face Attendance Full Debug Mode

## PURPOSE

We are enabling FULL DEBUG + DB ACCESS mode for Face Attendance.

The agent is now allowed to:

- Read backend routes related to:
  - /api/face/*
  - /api/attendance/*
- Read face recognition service logic
- Read Arduino integration logic
- Read database queries for:
  - students
  - attendance
  - face training
- Inspect schema related to avatar_url
- Test recognition flow end-to-end

The agent is NOT allowed to:
- Refactor unrelated modules
- Change authentication logic
- Modify database schema
- Touch teacher/class/dashboard modules

Scope is STRICTLY Face Attendance module.

---

# REQUIRED SYSTEM LOGIC (MUST MATCH EXACTLY)

## 1️⃣ Camera Flow

When "Start Camera" is clicked:

- Start camera stream immediately.
- Begin continuous scanning loop.

---

## 2️⃣ Face Stability Detection (3 seconds)

Recognition MUST NOT start immediately.

Rules:

- A face must remain visible continuously for 3 seconds.
- If face disappears before 3 seconds → reset timer.
- If face changes → reset timer.

Only after 3 seconds stability → start recognition.

---

## 3️⃣ Recognition Phase

If recognition succeeds:

Display on UI:
- avatar_url
- student name
- student code
- confidence score

Log timestamp.

Then:
- Send signal to Arduino.
- Log "Arduino signal sent".

---

## 4️⃣ Arduino Cooldown (2 seconds)

After sending Arduino signal:

- Block recognition for 2 seconds.
- Show cooldown countdown on UI.
- Do NOT allow duplicate recognition.
- Do NOT allow repeated Arduino signals.

After cooldown:
- Resume scanning.

---

## 5️⃣ Attendance Statistics Logic

TotalStudents = COUNT(students WHERE avatar_url IS NOT NULL)

Initialize:
Present = 0
Absent = TotalStudents

Each time student confirmed:
- Present += 1
- Absent -= 1

DO NOT base absent on class size.
Only count students with avatar_url.

---

# TRAIN DATA MODULE

When "Train Data" button is clicked:

- Fetch all students WHERE avatar_url IS NOT NULL.
- Display:
  - Avatar
  - Student code
  - Name
  - Class
- Add CONFIRM TRAIN button for each student.
- When confirm:
  - Call training API
  - Show success/fail status

The button must NOT only show list.
It must allow training confirmation.

---

# DEBUG PANEL (REQUIRED)

Add visible debug timeline:

Example:

[10:12:03] Camera started  
[10:12:05] Face detected  
[10:12:08] Face stable for 3s  
[10:12:08] Recognition started  
[10:12:09] Recognition success – Student A  
[10:12:09] Arduino signal sent  
[10:12:11] Cooldown finished  

Logs must show real timestamps.

---

# TECHNICAL REQUIREMENTS

Must implement:

- isRecognizing flag
- isCooldown flag
- faceStableTimer
- lastRecognizedId
- clearInterval on unmount
- stop camera stream on unmount
- prevent multiple API overlap

No artificial loading delays allowed.

Only allowed timers:
- 3 second stability timer
- 2 second cooldown timer

---

# PRE-CODE OUTPUT REQUIRED

Before modifying code, agent must return:

1. Backend routes found.
2. DB schema related to:
   - students
   - attendance
   - face data
3. Potential race conditions.
4. Proposed state machine for recognition flow.

Only after approval → implement.

---

# GOAL

We are testing FULL END-TO-END recognition:

Camera → Stability → Recognition → Arduino → Cooldown → Resume

This must behave like a real production biometric system.
