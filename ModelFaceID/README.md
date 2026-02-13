# Face Recognition Engine (Node.js Integration)

This module has been refactored for a Node.js (Express) backend where Python is used only as a face recognition engine.

## Scope

- No Flask server
- No liveness detection
- No blink/EAR logic
- No pickle storage
- JSON storage only
- Demo mode only (no database)

## New Structure

```
backend/
  face/
    train_faces.py
    face_engine.py
    face_encodings.json      # auto-created by train script
  data/
    attendance_debug.json    # auto-created by Express route
```

## Dataset Format

```
face_dataset/
  students.json
  images/
    HS2025-01_1.jpg
    HS2025-01_2.jpg
```

`students.json`:

```json
[
  {
    "student_code": "HS2025-01",
    "full_name": "Nguyen Van A",
    "class_name": "9A1"
  }
]
```

## Training

Run from project root:

```bash
python backend/face/train_faces.py
```

Output file:

- `backend/face/face_encodings.json`

## Verify Single Image

```bash
python backend/face/face_engine.py backend/face/temp.jpg
```

Stdout returns JSON only:

- Success: `status = success`
- Fail: `status = fail`

## Express API

- `POST /api/face/train`
- `POST /api/face/verify`

On verify success, Express appends one record to `backend/data/attendance_debug.json`.

## Dependencies

Install with:

```bash
pip install -r ModelFaceID/requirements.txt
```
