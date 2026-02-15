import os
import cv2
import face_recognition
from PIL import Image, ImageTk
import tkinter as tk
from tkinter import messagebox

# Cấu hình - Bro trỏ đúng vào folder ảnh nhé
TARGET_DIR = 'dataset_VIETNAM_jpg'

class FaceCleanerApp:
    def __init__(self, root, folder):
        self.root = root
        self.folder = folder
        
        # Lấy danh sách ảnh
        self.image_list = [os.path.join(folder, f) for f in os.listdir(folder) 
                          if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        self.duplicates = []
        self.current_idx = 0
        
        self.process_dataset()

    def process_dataset(self):
        print(f"[+] Đang quét {len(self.image_list)} file. Chế độ: Lọc rác & Tìm trùng...")
        encodings = []
        known_paths = []
        
        for path in self.image_list:
            if not os.path.exists(path): continue
            
            # Đọc ảnh bằng face_recognition (nó sẽ check mặt chuẩn hơn)
            try:
                image = face_recognition.load_image_file(path)
                
                # 1. Check mặt thật (Lọc rác: áo, bụng, đồ vật...)
                # face_locations sẽ trả về list các khuôn mặt tìm thấy
                face_locs = face_recognition.face_locations(image)
                
                if not face_locs:
                    print(f"[-] Xóa rác (Không thấy mặt người): {os.path.basename(path)}")
                    os.remove(path)
                    continue

                # 2. Lấy mã nhận diện (Encoding) để so trùng
                face_encs = face_recognition.face_encodings(image, face_locs)
                
                if face_encs:
                    current_enc = face_encs[0]
                    # So sánh với đống ảnh xịn đã lưu trước đó
                    # tolerance=0.5: Càng nhỏ càng khắt khe, càng lớn càng dễ cho là trùng
                    matches = face_recognition.compare_faces(encodings, current_enc, tolerance=0.5)
                    
                    if True in matches:
                        match_idx = matches.index(True)
                        self.duplicates.append((known_paths[match_idx], path))
                    else:
                        encodings.append(current_enc)
                        known_paths.append(path)
            except Exception as e:
                print(f"[!] Lỗi file {path}: {e}")
                continue

        if not self.duplicates:
            print("[✓] Đã dọn xong! Không thấy ảnh nào trùng.")
            messagebox.showinfo("Xong", "Đã dọn sạch rác! Không còn ảnh trùng.")
            self.root.destroy()
        else:
            print(f"[!] Tìm thấy {len(self.duplicates)} cặp nghi vấn.")
            self.setup_ui()
            self.show_pair()

    def setup_ui(self):
        self.root.title("AI Face Cleaner - Bro xem cái nào trùng thì sút")
        self.label_info = tk.Label(self.root, text="", font=('Arial', 11, 'bold'))
        self.label_info.pack(pady=10)
        
        frame = tk.Frame(self.root)
        frame.pack()
        
        self.img_a_label = tk.Label(frame, text="Ảnh gốc (Giữ)", compound='top')
        self.img_a_label.grid(row=0, column=0, padx=20)
        
        self.img_b_label = tk.Label(frame, text="Ảnh trùng (Xóa)", compound='top', fg="red")
        self.img_b_label.grid(row=0, column=1, padx=20)

        btn_frame = tk.Frame(self.root)
        btn_frame.pack(pady=20)
        
        tk.Button(btn_frame, text="XÓA ẢNH PHẢI", bg="#e74c3c", fg="white", font=('Arial', 10, 'bold'),
                  width=15, height=2, command=self.delete_right).pack(side=tk.LEFT, padx=10)
        
        tk.Button(btn_frame, text="GIỮ CẢ HAI", bg="#95a5a6", font=('Arial', 10),
                  width=15, height=2, command=self.keep_both).pack(side=tk.LEFT, padx=10)

    def show_pair(self):
        if self.current_idx >= len(self.duplicates):
            messagebox.showinfo("Xong", "Hết ảnh rồi bro ơi!")
            self.root.destroy()
            return
            
        path_a, path_b = self.duplicates[self.current_idx]
        self.label_info.config(text=f"Cặp {self.current_idx + 1} / {len(self.duplicates)}")
        
        # Load ảnh lên UI
        img_a = Image.open(path_a).resize((350, 350))
        img_b = Image.open(path_b).resize((350, 350))
        
        self.tk_a = ImageTk.PhotoImage(img_a)
        self.tk_b = ImageTk.PhotoImage(img_b)
        
        self.img_a_label.config(image=self.tk_a)
        self.img_b_label.config(image=self.tk_b)

    def delete_right(self):
        _, path_b = self.duplicates[self.current_idx]
        if os.path.exists(path_b):
            os.remove(path_b)
            print(f"[X] Đã xóa: {os.path.basename(path_b)}")
        self.current_idx += 1
        self.show_pair()

    def keep_both(self):
        self.current_idx += 1
        self.show_pair()

if __name__ == "__main__":
    root = tk.Tk()
    root.geometry("850x600")
    app = FaceCleanerApp(root, TARGET_DIR)
    root.mainloop()