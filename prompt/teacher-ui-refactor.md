School Manager Pro – Teacher UI Refactor Specification
CONTEXT

This refactor must strictly follow the original Teacher UI design shown in the provided screenshots.

Do NOT redesign layout.
Do NOT remove existing features.
Only fix structure, logic clarity, and data binding.

Follow existing dark theme style system.

1️⃣ Teacher Layout Structure
Header

Top header must include:

Logo text: SCHOOL MANAGER PRO

Page title: Bảng Điều Khiển Giáo Viên

Subtitle: Giáo viên: {teacher_name}

Navigation buttons (right side):

Trang chủ

Tính năng

Ghi chú

Nhập điểm

Đăng xuất

DO NOT remove any of these buttons.

2️⃣ Teacher Dashboard Page

Route example:

/teacher/dashboard

Filters Section (Top)

Must contain:

Dropdown: Lớp – Môn phụ trách

Dropdown: Học kỳ phân tích (HK1, HK2)

Input: Năm học (example: 2025-2026)

Button: Tải Dashboard

Button must reload dashboard data.

Summary Cards Row

Must display:

Trung bình lớp

Sĩ số lớp

Bản ghi điểm

Môn học

All must be dynamic from backend.

No hardcoded values.

Charts Section

Two charts side by side:

Left:

Phân bố điểm cuối kỳ

Grouped into:

0-4

5-6

7-8

9-10

Use real grade distribution.

Right:

So sánh TBHK1 và TBHK2

Bar chart:

HK1

HK2

Must use actual calculated averages.

Notes Section

Title:
Ghi chú vận hành

Must dynamically generate:

Lớp {class} có trung bình {avg}

Phổ điểm chiếm ưu thế

Số bản ghi đã nhập

No fake data.

3️⃣ Teacher Grade Entry Page

Route example:

/teacher/grades

Top Section

Must contain:

Dropdown: Lớp – Môn phụ trách

Dropdown: Học kỳ

Input: Năm học

Button: Tải Danh Sách

Action Buttons Row

Must include:

Lưu Toàn Bộ

Nhập CSV

Xuất CSV

Keep all three.

Quick Tag Section

Must contain:

Dropdown: Quick tag (Tiến bộ, Tốt, Cần cố gắng...)

Button: Áp Dụng Tag Cho Tất Cả

Grade Table

Columns must match exactly:

STT

Mã HS

Họ tên

Miệng (C1, C2)

15 phút (C1, C2)

1 tiết (C1, C2)

Giữa kỳ

Cuối kỳ

TBHK

Quick Tag

Nhận xét

TBHK must auto-calculate in real-time.

No manual TBHK editing.

4️⃣ Teacher Attendance View Page

Route example:

/teacher/attendance`

Must include:

- Date filter
- Class filter
- Button: Lọc dữ liệu

Table columns:

- Mã học sinh
- Họ tên
- Lớp
- Ngày
- Giờ
- Độ tin cậy

Read-only view.
Teacher cannot manually edit attendance.

---

# 5️⃣ Teacher Permissions

Teacher can:

- View dashboard
- Enter grades
- View attendance
- Export CSV

Teacher CANNOT:

- Add new class
- Edit class structure
- Add teacher
- Edit system configuration

---

# 6️⃣ Technical Rules

Follow:

- Incremental patch principle
- Do not refactor unrelated files
- Do not touch admin modules
- Use existing API services
- No new database schema changes

---

# 7️⃣ Required Backend Endpoints

Ensure teacher UI uses:

GET /api/teacher/class-subjects  
GET /api/teacher/grades  
POST /api/teacher/grades  
GET /api/teacher/dashboard  
GET /api/attendance?class_id=...  

No hardcoded logic allowed.

---

# 8️⃣ Strict UI Preservation

DO NOT:

- Change layout structure
- Remove navigation buttons
- Simplify chart system
- Remove grade columns
- Replace table with minimal version

UI must visually match the original screenshots.

---

# 9️⃣ Validation Rules

- All numeric grades must be 0–10
- TBHK calculated weighted properly
- CSV import must validate structure
- Attendance view must not show manual edit

---

# Final Instruction

Refactor teacher pages to:

- Match original UI layout exactly
- Remove any logic bugs
- Remove hardcoded values
- Keep dark theme intact
- Keep all action buttons

Do NOT redesign.

---

Nếu muốn, tao viết luôn thêm:

- `teacher-attendance-logic.md`
- `teacher-grade-calculation.md`
- `teacher-permission-policy.md`

để nó không dám phá kiến trúc nữa 😈