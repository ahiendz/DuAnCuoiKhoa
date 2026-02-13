import json
from pathlib import Path

import face_recognition

MATCH_THRESHOLD = 0.65


def load_students(students_path: Path):
    if not students_path.exists():
        return []
    with students_path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, list):
        return []
    return data


def main():
    current_file = Path(__file__).resolve()
    project_root = current_file.parents[2]
    dataset_dir = project_root / "face_dataset"
    students_path = dataset_dir / "students.json"
    images_dir = dataset_dir / "images"
    output_path = current_file.parent / "face_encodings.json"

    students = load_students(students_path)
    student_map = {
        item.get("student_code", ""): {
            "full_name": item.get("full_name", ""),
            "class_name": item.get("class_name", "")
        }
        for item in students
        if item.get("student_code")
    }

    results = []
    processed = 0
    skipped = 0

    if images_dir.exists():
        image_files = sorted(
            [
                p
                for p in images_dir.iterdir()
                if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png"}
            ]
        )
    else:
        image_files = []

    for image_path in image_files:
        student_code = image_path.stem.split("_")[0]
        info = student_map.get(student_code)
        if not info:
            skipped += 1
            continue

        image = face_recognition.load_image_file(str(image_path))
        encodings = face_recognition.face_encodings(image)
        if not encodings:
            skipped += 1
            continue

        results.append(
            {
                "student_code": student_code,
                "full_name": info["full_name"],
                "class_name": info["class_name"],
                "encoding": encodings[0].tolist()
            }
        )
        processed += 1

    with output_path.open("w", encoding="utf-8") as file:
        json.dump(results, file, indent=2, ensure_ascii=False)

    print(
        json.dumps(
            {
                "status": "success",
                "message": "Training completed",
                "match_threshold": MATCH_THRESHOLD,
                "trained": processed,
                "skipped": skipped,
                "output": str(output_path)
            },
            ensure_ascii=True
        )
    )


if __name__ == "__main__":
    main()
