import os
import shutil

def merge_folders():
    # Danh sách 3 folder nguồn của bro
    source_folders = [
        'dataset_asia_3000_jpg',
        'dataset_faces_hq_v1',
        'dataset_VIETNAM_jpg'
    ]
    
    # Folder đích
    destination_folder = 'merged_dataset'
    
    if not os.path.exists(destination_folder):
        os.makedirs(destination_folder)
        print(f"[+] Đã tạo folder: {destination_folder}")

    count = 0
    print("[!] Đang bắt đầu gom quân...")

    for folder in source_folders:
        if not os.path.exists(folder):
            print(f"[?] Folder {folder} không tồn tại, bỏ qua...")
            continue
        
        print(f"--> Đang quét: {folder}")
        for filename in os.listdir(folder):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                source_path = os.path.join(folder, filename)
                
                # Tạo tên mới để tránh trùng: face_all_00001.jpg
                new_name = f"face_all_{str(count).zfill(5)}.jpg"
                dest_path = os.path.join(destination_folder, new_name)
                
                # Dùng shutil.copy để giữ lại ảnh gốc ở folder cũ cho chắc
                # Nếu muốn xóa folder cũ luôn thì dùng shutil.move
                shutil.copy(source_path, dest_path)
                count += 1

    print(f"\n[✓] XONG! Tổng cộng đã gom được {count} ảnh vào '{destination_folder}'")

if __name__ == "__main__":
    merge_folders()