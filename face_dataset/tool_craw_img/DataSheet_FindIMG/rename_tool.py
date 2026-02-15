import os
from PIL import Image

def sync_and_rename_dataset(folder_path, prefix="student"):
    if not os.path.exists(folder_path):
        print("Folder không tồn tại bro ơi!")
        return

    # Lấy tất cả các file trong folder
    all_files = [f for f in os.listdir(folder_path)]
    # Chỉ lọc các file có định dạng ảnh
    image_extensions = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.jfif')
    image_files = [f for f in all_files if f.lower().endswith(image_extensions)]
    
    # Sort để đổi tên cho đúng thứ tự
    image_files.sort()

    print(f"--- Bắt đầu đồng bộ {len(image_files)} ảnh về định dạng .jpg ---")

    for index, filename in enumerate(image_files):
        old_path = os.path.join(folder_path, filename)
        
        try:
            # 1. Mở ảnh bất kể định dạng
            with Image.open(old_path) as img:
                # 2. Chuyển về RGB (quan trọng để tránh lỗi khi lưu JPG từ PNG/WebP)
                rgb_img = img.convert('RGB')
                
                # 3. Tạo tên mới chuẩn OCD (ví dụ: student_001.jpg)
                new_filename = f"{prefix}_{str(index + 1).zfill(3)}.jpg"
                new_path = os.path.join(folder_path, new_filename)
                
                # 4. Lưu ảnh mới
                rgb_img.save(new_path, "JPEG", quality=95)
            
            # 5. Xóa file cũ nếu tên nó khác tên mới (tránh xóa nhầm file vừa tạo)
            if filename != new_filename:
                os.remove(old_path)
                
            if (index + 1) % 50 == 0:
                print(f"Đã xử lý xong: {index + 1} tấm...")

        except Exception as e:
            print(f"Lỗi khi xử lý file {filename}: {e}")

    print("\n--- KẾT QUẢ ---")
    print(f"Tất cả ảnh đã được chuyển về .jpg và rename sạch sẽ!")
    print(f"Folder: {os.path.abspath(folder_path)}")

# Triển khai luôn cho folder của bro
if __name__ == "__main__":
    # Nhớ điền đúng tên folder chứa đống ảnh "cực phẩm" của bro vào đây
    target_folder = 'face_datasheet' 
    sync_and_rename_dataset(target_folder, prefix="student_pro")