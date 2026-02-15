import json
import sys
import urllib.request
from io import BytesIO
from pathlib import Path

import face_recognition

MATCH_THRESHOLD = 0.65


def load_train_input(train_input_path: Path):
    if not train_input_path or not train_input_path.exists():
        return []
    try:
        with train_input_path.open("r", encoding="utf-8-sig") as file:
            data = json.load(file)
    except Exception:
        return []

    if isinstance(data, dict) and isinstance(data.get("students"), list):
        return data["students"]
    if isinstance(data, list):
        return data
    return []


def safe_text(value):
    if value is None:
        return ""
    return str(value).strip()


def build_student_meta(raw):
    if not isinstance(raw, dict):
        return None
    student_code = safe_text(raw.get("student_code"))
    if not student_code:
        return None
    return {
        "id": raw.get("id"),
        "student_code": student_code,
        "full_name": safe_text(raw.get("full_name")),
        "class_name": safe_text(raw.get("class_name") or raw.get("class_id")),
        "class_id": safe_text(raw.get("class_id")),
        "avatar_url": safe_text(raw.get("avatar_url")),
    }


def is_http_url(value):
    value = safe_text(value)
    return value.startswith("http://") or value.startswith("https://")


def encode_from_url(image_url: str):
    request = urllib.request.Request(
        image_url,
        headers={"User-Agent": "Mozilla/5.0 FaceTrainer/1.0"},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        content = response.read()
    image = face_recognition.load_image_file(BytesIO(content))
    encodings = face_recognition.face_encodings(image)
    if not encodings:
        return None
    return encodings[0]


def main():
    current_file = Path(__file__).resolve()
    output_path = current_file.parent / "face_encodings.json"
    train_input_path = current_file.parent / "train_input.json"

    if len(sys.argv) >= 2:
        train_input_path = Path(sys.argv[1]).resolve()

    remote_students_raw = load_train_input(train_input_path)
    remote_students = []
    for item in remote_students_raw:
        meta = build_student_meta(item)
        if not meta:
            continue
        remote_students.append(meta)

    results = []
    trained_codes = set()
    processed = 0
    skipped = 0
    trained_from_local = 0
    trained_from_url = 0
    skipped_local = 0
    skipped_url = 0

    for item in remote_students:
        student_code = item.get("student_code", "")
        avatar_url = item.get("avatar_url", "")
        if not student_code or not is_http_url(avatar_url):
            skipped += 1
            skipped_url += 1
            continue
        if student_code in trained_codes:
            continue

        try:
            encoding = encode_from_url(avatar_url)
        except Exception:
            skipped += 1
            skipped_url += 1
            continue

        if encoding is None:
            skipped += 1
            skipped_url += 1
            continue

        results.append(
            {
                "student_code": student_code,
                "full_name": item.get("full_name", ""),
                "class_name": item.get("class_name", ""),
                "class_id": item.get("class_id", ""),
                "student_id": item.get("id"),
                "avatar_url": avatar_url,
                "source": "avatar_url",
                "encoding": encoding.tolist(),
            }
        )
        trained_codes.add(student_code)
        processed += 1
        trained_from_url += 1

    with output_path.open("w", encoding="utf-8") as file:
        json.dump(results, file, indent=2, ensure_ascii=False)

    print(
        json.dumps(
            {
                "status": "success",
                "message": "Training completed",
                "match_threshold": MATCH_THRESHOLD,
                "trained": processed,
                "trained_from_local": trained_from_local,
                "trained_from_url": trained_from_url,
                "skipped": skipped,
                "skipped_local": skipped_local,
                "skipped_url": skipped_url,
                "candidate_urls": len(remote_students),
                "output": str(output_path),
            },
            ensure_ascii=True,
        )
    )


if __name__ == "__main__":
    main()
