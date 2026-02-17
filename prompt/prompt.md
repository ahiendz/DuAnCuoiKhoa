You are working on a production-ready system called School Manager Pro.

This is NOT a demo project.

The system stack:

Frontend: React (Vite), Bootstrap 5, Framer Motion
Backend: Node.js + Express
Database: PostgreSQL
Auth: JWT

Database schema already exists (DO NOT add new tables).

Existing tables:

users

students

classes

grades

attendance

subjects

🎨 UI REQUIREMENTS

⚠️ IMPORTANT:

Keep the EXACT dark theme style from the existing app.

Keep table structure similar to the old Parent Window UI.

Use tab-based layout (Bootstrap Tabs).

Do NOT redesign theme.

Do NOT change color system.

Keep card borders, table look, spacing consistent.

🧭 PARENT SIDEBAR NAVIGATION

Create sidebar navigation:

Dashboard

Bảng điểm

Điểm danh

Nhận xét

So sánh lớp

Cảnh báo học tập

Báo cáo PDF

Đổi mật khẩu

🏠 1️⃣ DASHBOARD TAB
Layout

Top card:

Avatar

Họ tên

Lớp

Trung bình hiện tại

Xếp loại

Tab sections inside Dashboard

Use nested tabs:

Tổng quan

Biểu đồ điểm

Điểm danh

Cảnh báo

🔹 Biểu đồ điểm
Line Chart:

Trend điểm trung bình theo:

HK1

HK2

Cả năm

Calculation:

Weighted average:
SUM(score * weight) / SUM(weight)

Bar Chart:

Trung bình từng môn

🔹 Biểu đồ điểm danh

Pie Chart:

Present

Absent

Late

🚨 2️⃣ SMART ALERT SYSTEM TAB

⚠️ DO NOT create new DB table.

Generate alerts dynamically from:

grades
attendance

Alert Conditions:

1️⃣ Nếu trung bình HK2 < HK1
→ Alert: “Học lực đang giảm so với học kỳ trước”

2️⃣ Nếu điểm môn bất kỳ < 5
→ Alert: “Môn X đang dưới trung bình”

3️⃣ Nếu nghỉ > 10% số buổi
→ Alert: “Tỷ lệ chuyên cần thấp”

Return format:

[
{
type: "academic_decline",
severity: "warning",
message: "Học lực đang giảm 1.2 điểm so với HK1"
}
]

📊 3️⃣ BẢNG ĐIỂM TAB

Tabs:

Học kỳ 1

Học kỳ 2

Cả năm

Table structure must remain identical to old UI:

| Môn | Miệng | 15p | 1 tiết | GK | CK | Trung bình |

Enhancements:

Hover show calculation tooltip

Color coding:

= 8: green

6–7.9: yellow

< 6: red

📅 4️⃣ ĐIỂM DANH TAB

Tabs:

Theo tháng

Theo học kỳ

Table:

| Ngày | Trạng thái | Ghi chú |

Add:

Mini monthly summary

% attendance rate

📝 5️⃣ NHẬN XÉT TAB

Since no remarks table exists:

Use workaround:

Use grades.recorded_by
If needed, create API to return mock teacher remarks based on subject.

Grouped by subject:

Card style:
Subject name
Latest comment
Date

📊 6️⃣ SO SÁNH LỚP (ẨN DANH)

⚠️ No new table.

Use aggregate query:

SELECT subject_id,
AVG(score * weight) / SUM(weight) AS class_avg
FROM grades
JOIN students ON students.id = grades.student_id
WHERE students.class_id = ?
GROUP BY subject_id

Return:

{
subject: "Toán",
student_avg: 7.2,
class_avg: 6.5
}

Display as:

| Môn | Con bạn | Trung bình lớp |

No other student names exposed.

📄 7️⃣ BÁO CÁO PDF

Endpoint:

GET /api/reports/student/:id?term=HK1

Include:

Student info

Grade table

Attendance %

Alerts summary

🔐 8️⃣ ĐỔI MẬT KHẨU

Form fields:

Current password

New password

Confirm new password

Validation:

= 8 characters

Must include number

Must include uppercase

Confirm must match

Backend:

POST /api/auth/change-password

Steps:

Verify current password

Hash new password

Save

Invalidate refresh token

🧠 BACKEND ROUTES REQUIRED

Create:

GET /api/parent/dashboard
GET /api/parent/grades
GET /api/parent/attendance
GET /api/parent/alerts
GET /api/parent/class-comparison

POST /api/auth/change-password

All routes must verify:

req.user.role === "parent"

🏗 FRONTEND STRUCTURE

Create folder:

src/modules/parent/

Components:

ParentDashboard.jsx
ParentGrades.jsx
ParentAttendance.jsx
ParentAlerts.jsx
ParentComparison.jsx
ParentChangePassword.jsx

Use:

Recharts for charts

Bootstrap tabs

Framer Motion for fade animation

🚫 DO NOT

Do NOT create new DB tables

Do NOT modify schema

Do NOT redesign UI theme

Do NOT break existing style

🎯 GOAL

Parent module must feel:

Professional

Insight-driven

Data analytical

Clean and structured

Not overloaded

Production ready