import os
import tkinter as tk
from tkinter import messagebox
from PIL import Image, ImageTk
from send2trash import send2trash # Thư viện để đưa file vào thùng rác

class DatasetReviewer:
    def __init__(self, root, folder_path):
        self.root = root
        self.root.title("Gemini's Dataset Reviewer Pro - Bro's Edition")
        self.folder_path = folder_path
        
        # Lấy danh sách ảnh
        self.image_list = [f for f in os.listdir(folder_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        self.current_idx = 0
        self.deleted_list = [] # Danh sách các ảnh tạm đánh dấu xóa

        if not self.image_list:
            messagebox.showerror("Lỗi", "Thư mục không có ảnh nào bro ơi!")
            root.destroy()
            return

        # --- GIAO DIỆN UI ---
        self.label_info = tk.Label(root, text="", font=("Arial", 12))
        self.label_info.pack(pady=10)

        self.canvas = tk.Canvas(root, width=500, height=500)
        self.canvas.pack()

        self.btn_frame = tk.Frame(root)
        self.btn_frame.pack(pady=20)

        tk.Button(self.btn_frame, text="<< Trái (Back)", command=self.prev_img).grid(row=0, column=0, padx=10)
        tk.Button(self.btn_frame, text="XÓA (Delete)", fg="red", command=self.mark_delete).grid(row=0, column=1, padx=10)
        tk.Button(self.btn_frame, text="Phải (Next) >>", command=self.next_img).grid(row=0, column=2, padx=10)
        
        tk.Button(root, text="XÁC NHẬN & ĐÓNG", bg="green", fg="white", command=self.final_confirm).pack(pady=10)

        # Bind phím tắt cho ngầu
        root.bind("<Left>", lambda e: self.prev_img())
        root.bind("<Right>", lambda e: self.next_img())
        root.bind("<Delete>", lambda e: self.mark_delete())

        self.show_image()

    def show_image(self):
        if 0 <= self.current_idx < len(self.image_list):
            img_name = self.image_list[self.current_idx]
            img_path = os.path.join(self.folder_path, img_name)
            
            # Cập nhật thông tin
            status = "[ĐÃ ĐÁNH DẤU XÓA]" if img_name in self.deleted_list else ""
            self.label_info.config(text=f"Ảnh {self.current_idx + 1}/{len(self.image_list)}: {img_name} {status}")

            # Load và resize ảnh hiển thị
            img = Image.open(img_path)
            img.thumbnail((500, 500))
            self.tk_img = ImageTk.PhotoImage(img)
            self.canvas.create_image(250, 250, image=self.tk_img)

    def next_img(self):
        if self.current_idx < len(self.image_list) - 1:
            self.current_idx += 1
            self.show_image()

    def prev_img(self):
        if self.current_idx > 0:
            self.current_idx -= 1
            self.show_image()

    def mark_delete(self):
        img_name = self.image_list[self.current_idx]
        if img_name not in self.deleted_list:
            self.deleted_list.append(img_name)
            print(f"Đã đánh dấu xóa: {img_name}")
        else:
            self.deleted_list.remove(img_name) # Nhấn lần nữa để hoàn tác
            print(f"Đã hoàn tác: {img_name}")
        self.show_image()

    def final_confirm(self):
        if not self.deleted_list:
            messagebox.showinfo("Xong", "Không có ảnh nào bị xóa. Bye bro!")
            self.root.destroy()
            return

        confirm = messagebox.askyesno("Xác nhận lần cuối", f"Bro chắc chắn muốn quăng {len(self.deleted_list)} ảnh vào thùng rác chứ?")
        if confirm:
            for img_name in self.deleted_list:
                full_path = os.path.join(self.folder_path, img_name)
                send2trash(full_path) # Đưa vào thùng rác thật của Windows
            messagebox.showinfo("Thành công", "Đã dọn dẹp xong dataset!")
            self.root.destroy()

# Chạy tool
if __name__ == "__main__":
    root = tk.Tk()
    # Bro nhớ sửa đường dẫn folder này cho đúng với folder chứa ảnh đã cắt nhé
    app = DatasetReviewer(root, 'dataset_asia_3000_jpg')
    root.mainloop()