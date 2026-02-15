import os
import cv2
import hashlib
import time
from PIL import Image
from icrawler.builtin import BingImageCrawler

def get_file_hash(file_path):
    """Tạo mã vân tay ảnh để chống trùng lặp tuyệt đối"""
    with open(file_path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()

def massive_asia_miner(total_target=3000):
    raw_dir = 'raw_mining_zone'
    final_dir = 'dataset_VIETNAM_jpg'
    
    if not os.path.exists(raw_dir): os.makedirs(raw_dir)
    if not os.path.exists(final_dir): os.makedirs(final_dir)

    # DANH SÁCH KEYWORD TIẾNG VIỆT + ANH ĐỂ VÉT SẠCH
    keywords = [
        # Việt Nam
        'gái xinh', 'gái đẹp', 'trai đẹp', 'gái múp', 'gái mập', 'gái chân dài', 'gái mặt xinh', 'gái tóc dài', 'gái tóc ngắn',

    ]

    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    hashes = set()
    face_count = 0
    start_time = time.time()
    
    # Tính toán số lượng ảnh mỗi keyword cần tải để đủ target
    imgs_per_kw = (total_target // len(keywords)) + 200 # Cộng 200 để trừ hao ảnh lỗi/không có mặt

    for kw in keywords:
        if face_count >= total_target: break
        
        print(f"\n[+] Đang đổ quân vào nguồn: {kw}")
        crawler = BingImageCrawler(downloader_threads=4, storage={'root_dir': raw_dir})
        crawler.crawl(keyword=kw, max_num=imgs_per_kw)

        files = os.listdir(raw_dir)
        for filename in files:
            if face_count >= total_target: break
            
            raw_path = os.path.join(raw_dir, filename)
            
            try:
                # 1. CHỐNG TRÙNG BẰNG MD5
                h = get_file_hash(raw_path)
                if h in hashes:
                    os.remove(raw_path)
                    continue
                hashes.add(h)

                # 2. ĐỌC ẢNH VÀ KIỂM TRA MẶT
                img = cv2.imread(raw_path)
                if img is None: 
                    os.remove(raw_path)
                    continue
                
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                # Gắt nhẹ: minNeighbors=6 để lấy mặt thẳng và chuẩn
                faces = face_cascade.detectMultiScale(gray, 1.2, 6)

                for (x, y, w, h_f) in faces:
                    if w > 120 and h_f > 120: # Chỉ lấy mặt rõ nét
                        # Cắt mặt
                        face_crop = img[y:y+h_f, x:x+w]
                        
                        # 3. CHUYỂN VỀ .JPG VÀ RENAME OCD
                        # Chuyển BGR sang RGB để Pillow hiểu đúng màu
                        rgb_img = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
                        pil_img = Image.fromarray(rgb_img)
                        
                        # Tên file chuẩn: student_0001.jpg -> student_3000.jpg
                        new_name = f"student_asia_{str(face_count + 1).zfill(4)}.jpg"
                        final_path = os.path.join(final_dir, new_name)
                        
                        # Lưu chất lượng cao
                        pil_img.save(final_path, "JPEG", quality=95)
                        face_count += 1
                        
                        # In tiến độ cho bro đỡ sốt ruột
                        if face_count % 50 == 0:
                            print(f"-> Đã lượm được: {face_count}/{total_target} mặt xịn...")

                # Xử lý xong thì xóa ảnh raw cho nhẹ ổ cứng
                os.remove(raw_path)

            except Exception:
                if os.path.exists(raw_path): os.remove(raw_path)
                continue

    # Dọn dẹp folder tạm cuối cùng
    if os.path.exists(raw_dir):
        import shutil
        shutil.rmtree(raw_dir)

    total_time = (time.time() - start_time) / 60
    print(f"\n--- CHIẾN DỊCH KẾT THÚC ---")
    print(f"Tổng thu hoạch: {face_count} ảnh mặt chuẩn .jpg")
    print(f"Thời gian chạy: {total_time:.2f} phút")
    print(f"Toàn bộ dataset nằm tại: {os.path.abspath(final_dir)}")

if __name__ == "__main__":
    massive_asia_miner(3000)