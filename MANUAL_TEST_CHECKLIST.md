# Parent Module - Manual Testing Checklist

## ⚠️ Browser automation không khả dụng - Test manual theo checklist này

---

## 🔧 Pre-Test Setup

### 1. Verify Servers Running
- [ ] Backend running on port 5000: `npm start` (in root)
- [ ] Frontend running on port 3000: Check terminal output
- [ ] Database connection OK

### 2. Create Test Data (Via Admin UI or SQL)

**Option A: Via Admin UI** (Recommended)
1. Login as admin at http://localhost:3000/login
2. Go to Students page
3. Click "Add Student" or "Import Students"
4. Fill in student info + parent info:
   - Student name: `Test Student Alpha`
   - DOB: `2010-05-15`
   - Gender: `male`
   - Class: Select any existing class
   - **Parent email:** `parent.test@school.com`
   - **Parent name:** `Nguyen Van Parent`
   - **Parent phone:** `0909123456`
   - **Relationship:** `father`
5. Save and note the **student_code** (e.g., HS2026-001)

**Option B: Via SQL** (If admin UI not ready)
```sql
-- First, create parent user
INSERT INTO users (name, email, password_hash, role, must_change_password, is_active)
VALUES ('Nguyen Van Parent', 'parent.test@school.com', 
        '$2b$10$abcdefghijklmnopqrstuvwxyz', -- dummy hash, will be replaced
        'parent', TRUE, TRUE)
RETURNING id;

-- Then create parent record
INSERT INTO parents (user_id, full_name, phone)
VALUES (<user_id_from_above>, 'Nguyen Van Parent', '0909123456')
RETURNING id;

-- Create student
INSERT INTO students (full_name, student_code, dob, gender, class_id)
VALUES ('Test Student Alpha', 'HS2026-001', '2010-05-15', 'male', 1)
RETURNING id;

-- Link parent to student
INSERT INTO student_parents (parent_id, student_id, relationship)
VALUES (<parent_id>, <student_id>, 'father');

-- Update parent password to student_code
UPDATE users SET password_hash = crypt('HS2026-001', gen_salt('bf'))
WHERE email = 'parent.test@school.com';
```

---

## 📋 Test Scenario 1: First Login & Forced Password Change

### Step 1: Navigate to Login Page
1. Open browser: http://localhost:3000/login
2. **Verify:** Login page loads with 3 role options

### Step 2: Login as Parent
1. Select role: **Phụ huynh**
2. Email: `parent.test@school.com`
3. Password: `HS2026-001` (the student_code you noted)
4. Click **Đăng nhập**

**Expected Result:**
- [ ] Login successful (no error message)
- [ ] **Auto-redirect to** `/parent/change-password`
- [ ] URL shows: `http://localhost:3000/parent/change-password`
- [ ] Page title: "Đổi Mật Khẩu" or "Đổi Mật Khẩu Lần Đầu"
- [ ] Warning message visible about password requirements

### Step 3: Test Password Validation (Negative Tests)

**Test 3.1: Password too short**
- New password: `Pass1` (only 5 chars)
- Confirm: `Pass1`
- Click submit
- [ ] **Expected:** Error "Mật khẩu phải có ít nhất 8 ký tự"

**Test 3.2: Password without numbers**
- New password: `Password` (no numbers)
- Confirm: `Password`
- Click submit
- [ ] **Expected:** Error "Mật khẩu phải chứa số"

**Test 3.3: Password without letters**
- New password: `12345678` (no letters)
- Confirm: `12345678`
- Click submit
- [ ] **Expected:** Error "Mật khẩu phải chứa chữ cái"

**Test 3.4: Reuse default password**
- New password: `HS2026-001` (same as default)
- Confirm: `HS2026-001`
- Click submit
- [ ] **Expected:** Error "Không thể sử dụng mật khẩu mặc định"

**Test 3.5: Passwords don't match**
- New password: `NewPass123`
- Confirm: `NewPass456`
- Click submit
- [ ] **Expected:** Error "Mật khẩu xác nhận không khớp"

### Step 4: Change Password Successfully
1. New password: `SecurePass123`
2. Confirm: `SecurePass123`
3. Click **Đổi Mật Khẩu**

**Expected Result:**
- [ ] Success message or alert appears
- [ ] **Auto-redirect to** `/login`
- [ ] localStorage cleared (open DevTools > Application > Local Storage - should be empty)

---

## 📋 Test Scenario 2: Login with New Password

### Step 1: Login Again
1. At login page: http://localhost:3000/login
2. Role: **Phụ huynh**
3. Email: `parent.test@school.com`
4. Password: `SecurePass123` (NEW password)
5. Click **Đăng nhập**

**Expected Result:**
- [ ] Login successful
- [ ] **NO redirect to password change** (goes directly to dashboard)
- [ ] URL: `http://localhost:3000/parent`
- [ ] Dashboard page loads

### Step 2: Verify Old Password Doesn't Work
1. Logout (if logout button exists, or clear localStorage)
2. Try login with old password: `HS2026-001`
3. **Expected:** Login fails with error

---

## 📋 Test Scenario 3: Parent Dashboard

### Step 1: View Dashboard
At http://localhost:3000/parent

**Expected Elements:**
- [ ] Page title: "Dashboard Phụ Huynh" or similar
- [ ] Student information card visible:
  - [ ] Student name: "Test Student Alpha"
  - [ ] Student code: "HS2026-001"
  - [ ] Class name displayed
  - [ ] Relationship: "father"

**If NO grades/attendance data exists:**
- [ ] Shows message: "Chưa có dữ liệu điểm số và điểm danh"

**If grades/attendance data exists:**
- [ ] Current term average displayed
- [ ] Attendance rate displayed (%)
- [ ] Risk level shown (low/medium/high)
- [ ] Alert count shown
- [ ] Class comparison visible

### Step 2: Check Network Requests (DevTools)
1. Open DevTools (F12) > Network tab
2. Refresh page
3. **Verify API calls:**
   - [ ] `GET /api/parent/students` - Status 200
   - [ ] `GET /api/parent/dashboard/:id` - Status 200 (or 404 if no data)
   - [ ] Authorization header present: `Bearer <token>`

---

## 📋 Test Scenario 4: Multiple Children Support

### Step 1: Create Second Student
1. Login as admin
2. Create another student with **SAME parent email**:
   - Student name: `Test Student Beta`
   - Parent email: `parent.test@school.com` (same!)
   - Parent name: `Nguyen Van Parent`
   - Relationship: `mother`

### Step 2: Login as Parent
1. Login with parent account
2. Go to dashboard

**Expected Result:**
- [ ] **Student selector dropdown** appears
- [ ] Dropdown shows both students:
  - [ ] Test Student Alpha (HS2026-001)
  - [ ] Test Student Beta (HS2026-XXX)
- [ ] Can switch between students
- [ ] Dashboard data updates when switching

---

## 📋 Test Scenario 5: Security - Ownership Validation

### Step 1: Check API Security (via DevTools Console)
1. Login as parent
2. Open DevTools > Console
3. Get the JWT token:
```javascript
localStorage.getItem('token')
```
4. Try to access another student's data (student ID that parent doesn't own):
```javascript
fetch('http://localhost:5000/api/parent/dashboard/999', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => r.json())
.then(console.log)
```

**Expected Result:**
- [ ] Response status: 403 Forbidden
- [ ] Error message: "Phụ huynh không có quyền xem học sinh này" or similar

---

## 📋 Test Scenario 6: Navigation & Routes

### Step 1: Test Routes
While logged in as parent, manually navigate to:

1. **http://localhost:3000/parent**
   - [ ] Dashboard loads (authorized)

2. **http://localhost:3000/parent/grades**
   - [ ] Grades page loads (may show "no data" if not implemented)

3. **http://localhost:3000/parent/attendance**
   - [ ] Attendance page loads

4. **http://localhost:3000/parent/change-password**
   - [ ] Should redirect to `/parent` (already changed password)

5. **http://localhost:3000/admin**
   - [ ] Should redirect to `/` or `/login` (not authorized for admin)

---

## 📋 Test Scenario 7: Logout & Re-login

### Step 1: Logout
1. Click logout button (if exists)
2. **OR** manually clear localStorage:
   - DevTools > Application > Local Storage > Clear All

**Expected Result:**
- [ ] Redirected to login or home page
- [ ] Cannot access `/parent` routes (redirects to login)

### Step 2: Re-login
1. Login again with parent credentials
2. **Expected:** Normal login flow (no password change required)

---

## ✅ Test Summary Checklist

### Core Functionality
- [ ] Parent account created during student enrollment
- [ ] Default password = student_code
- [ ] Forced password change on first login
- [ ] Password validation working (all 5 negative tests passed)
- [ ] New password works for subsequent logins
- [ ] Old password rejected after change

### Dashboard
- [ ] Student information displayed correctly
- [ ] API calls successful (check Network tab)
- [ ] Multi-student support (dropdown appears)
- [ ] Can switch between children

### Security
- [ ] Cannot access other students' data (403 error)
- [ ] JWT token required for API calls
- [ ] Unauthorized routes redirect properly

### UX Flow
- [ ] Login → Password Change → Dashboard (smooth flow)
- [ ] No password change prompt on subsequent logins
- [ ] Logout works correctly

---

## 🐛 Common Issues & Solutions

### Issue 1: "Lớp học không tồn tại"
**Solution:** Create a class first via Admin UI or SQL:
```sql
INSERT INTO classes (name, grade_level) VALUES ('10A1', 10);
```

### Issue 2: Login fails with "Đăng nhập thất bại"
**Check:**
- Backend server running on port 5000?
- Database connection OK?
- Check backend terminal for errors

### Issue 3: Dashboard shows no data
**Expected behavior** if:
- No grades entered for student
- No attendance records
- This is normal for new test data

### Issue 4: Password change doesn't redirect
**Check:**
- Browser console for errors (F12)
- Network tab - did API call succeed?
- Check `localStorage.getItem('user')` - is `force_change_password` false?

### Issue 5: 404 on `/parent/change-password`
**Check:**
- Frontend server restarted after code changes?
- Route added to App.jsx?
- Component imported correctly?

---

## 📊 Test Results Template

Copy this and fill in your results:

```
## Test Results - [Date/Time]

### Scenario 1: First Login & Password Change
- Login redirect: ✅ / ❌
- Password validation: ✅ / ❌
- Password change success: ✅ / ❌

### Scenario 2: New Password Login
- Login with new password: ✅ / ❌
- Old password rejected: ✅ / ❌

### Scenario 3: Dashboard
- Student info displayed: ✅ / ❌
- API calls successful: ✅ / ❌

### Scenario 4: Multiple Children
- Student selector appears: ✅ / ❌
- Can switch students: ✅ / ❌

### Scenario 5: Security
- Ownership validation: ✅ / ❌
- 403 on unauthorized access: ✅ / ❌

### Scenario 6: Navigation
- All routes accessible: ✅ / ❌
- Unauthorized routes blocked: ✅ / ❌

### Scenario 7: Logout
- Logout works: ✅ / ❌
- Re-login works: ✅ / ❌

### Overall Status: PASS / FAIL
### Notes:
[Add any issues or observations here]
```

---

## 🚀 Next Steps After Testing

If all tests pass:
1. ✅ Mark parent module as production-ready
2. Update walkthrough.md with test results
3. Deploy to staging/production

If issues found:
1. Document specific failures
2. Create bug fix tasks
3. Re-test after fixes
