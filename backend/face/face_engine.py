import json
import sys
from pathlib import Path

import face_recognition
import numpy as np

MATCH_THRESHOLD = 0.50


def fail(message: str):
    print(json.dumps({"status": "fail", "message": message}, ensure_ascii=True))


def main():
    if len(sys.argv) < 2:
        fail("Image path is required")
        return

    image_path = Path(sys.argv[1]).resolve()
    if not image_path.exists():
        fail("Image file not found")
        return

    current_file = Path(__file__).resolve()
    encodings_path = current_file.parent / "face_encodings.json"
    if not encodings_path.exists():
        fail("face_encodings.json not found")
        return

    with encodings_path.open("r", encoding="utf-8") as file:
        known_faces = json.load(file)

    if not known_faces:
        fail("No match found")
        return

    image = face_recognition.load_image_file(str(image_path))
    input_encodings = face_recognition.face_encodings(image)
    if not input_encodings:
        fail("No match found")
        return

    input_encoding = input_encodings[0]

    best_item = None
    best_distance = None

    for item in known_faces:
        known_vector = np.array(item.get("encoding", []), dtype=float)
        if known_vector.size == 0:
            continue

        distance = face_recognition.face_distance([known_vector], input_encoding)[0]
        if best_distance is None or distance < best_distance:
            best_distance = float(distance)
            best_item = item

    if best_item is None or best_distance is None or best_distance >= MATCH_THRESHOLD:
        fail("No match found")
        return

    confidence = round(max(0.0, 1.0 - best_distance), 2)
    print(
        json.dumps(
            {
                "status": "success",
                "student_code": best_item.get("student_code", ""),
                "full_name": best_item.get("full_name", ""),
                "class_name": best_item.get("class_name", ""),
                "confidence": confidence
            },
            ensure_ascii=True
        )
    )


if __name__ == "__main__":
    main()
