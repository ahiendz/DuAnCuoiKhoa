# Face Recognition Attendance System - Refactor Documentation

## 1. Project Overview
This project is a school attendance system using face recognition with a Node.js backend, Python AI engine, browser camera frontend, and Arduino serial integration.

### Current goals achieved
- Single startup command: `npm start`
- Stable operation without browser AI/WASM
- Controlled recognition flow to avoid backend overload
- Clear separation of frontend orchestration and backend AI processing

---

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

---

## 3. Technical Problems Encountered
- `Aborted(native code called abort())` during `detector.send()`
- Missing constructor in some runtimes (`FaceDetection is not a constructor`)
- Unstable script/global loading behavior from CDN contexts
- Overlapping async calls creating detector lifecycle corruption
- Browser-side performance degradation under continuous frame processing

---

## 4. Root Cause Analysis
The root causes were architectural and runtime-related:

1. Browser WASM dependency in critical path:
   MediaPipe lifecycle became a runtime reliability bottleneck.

2. Async race conditions:
   Frame pipeline could run while detector was not fully initialized or recovering.

3. Inconsistent runtime loading:
   Global constructor availability depended on script timing and environment behavior.

4. Error-recovery loop amplification:
   Abort -> restart -> immediate re-send could repeat indefinitely.

---

## 5. Refactoring Strategy
### Strategic changes
- Removed MediaPipe from frontend entirely
- Kept existing Python AI components (`face_engine.py`, `train_faces.py`)
- Shifted detection and verification responsibility to backend/Python
- Converted frontend to a pure camera + FSM orchestrator

### Design principles used
- Move heavy AI logic out of browser
- Keep frontend deterministic and lightweight
- Protect expensive verification with multi-stage gating
- Keep operational simplicity (`npm start`)

---

## 6. Final Architecture Diagram (ASCII)
```text
[Browser Frontend]
  - Camera stream
  - FSM only (no AI model)
  - Poll /api/face/detect every 200ms
  - Call /api/face/verify only after 5s stable face
         |
         v
[Node.js Server (Express)]
  - Single entrypoint: npm start
  - Spawns Python AI on startup (warmup)
  - /api/face/detect  -> lightweight Python detect
  - /api/face/verify  -> Python recognition
  - Arduino serial bridge (Y/N payload)
         |
         v
[Python AI Engine]
  - face_recognition
  - Detect: face_locations only
  - Verify: encoding + distance matching
  - JSON response contract
```

---

## 7. Face Scanning Logic (5s Confirm + 2s Cooldown)
### FSM flow
```text
IDLE
 -> SCANNING
 -> CONFIRMING (face must remain present for 5s)
 -> VERIFYING (single verify call)
 -> COOLDOWN (2s)
 -> SCANNING
```

### Behavior details
- Frontend captures frame and calls `/api/face/detect` every 200ms
- If `hasFace=false` before 5 seconds, confirm timer resets
- Verification is triggered once per confirmation cycle
- During cooldown, no verify call is allowed

---

## 8. Performance Optimization
- Detection endpoint is lightweight (`face_locations`) to support frequent polling
- Verification endpoint is gated by 5-second continuous presence
- No continuous heavy recognition calls
- Browser CPU usage reduced by removing MediaPipe/WASM workload
- Backend handles AI with controlled request cadence

---

## 9. Lessons Learned
1. Browser AI is fragile for critical attendance workflows when runtime consistency is required.
2. Moving AI inference off frontend greatly improves operational stability.
3. FSM gating is essential to prevent expensive endpoint abuse.
4. Explicit separation of detect (cheap) vs verify (expensive) improves scalability.
5. Single-command operations (`npm start`) reduce deployment friction.

---

## 10. Future Improvements
- Replace inline Python detect call with persistent Python API process for lower latency
- Introduce queue/rate-limit per camera session
- Add health-check endpoint for Python bridge and serial status
- Add structured logging and metrics (detect rate, verify success, cooldown skips)
- Add integration tests for FSM transitions and endpoint contracts
- Add containerized deployment profile (Node + Python runtime)

---

## Run
```bash
npm start
```

## Key Endpoints
- `POST /api/face/detect` -> `{ "hasFace": true | false }`
- `POST /api/face/verify` -> recognition result JSON
- `POST /api/face/train` -> train/update encodings
