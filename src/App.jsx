import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ThemeProvider } from '@/context/ThemeContext';

// Layouts
import PublicLayout from '@/layouts/PublicLayout';
import DashboardLayout from '@/layouts/DashboardLayout';

// Public pages
import PublicHome from '@/pages/public/Home';
import Features from '@/pages/public/Features';
import Support from '@/pages/public/Support';
import Login from '@/pages/auth/Login';
import PublicAttendance from '@/pages/public/Attendance';

// Admin pages
import AdminDashboard from '@/pages/admin/Dashboard';
import Classes from '@/pages/admin/Classes';
import Teachers from '@/pages/admin/Teachers';
import Students from '@/pages/admin/Students';
import AdminAttendance from '@/pages/admin/Attendance';

// Teacher pages
import TeacherDashboard from '@/pages/teacher/Dashboard';
import Gradebook from '@/pages/teacher/Gradebook';
import Notes from '@/pages/teacher/Notes';
import TeacherClasses from '@/pages/teacher/Classes';

// Parent pages
import ParentDashboard from '@/pages/parent/Dashboard';
import ParentGrades from '@/pages/parent/Grades';
import ParentAttendance from '@/pages/parent/Attendance';
import ParentChangePassword from '@/modules/parent/ParentChangePassword';
import ParentNotifications from '@/pages/parent/Notifications';

import {
    LayoutDashboard, Users, GraduationCap, BookOpen,
    ClipboardList, StickyNote, Calendar, FileText, Bell
} from 'lucide-react';

const adminNav = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/classes', icon: BookOpen, label: 'Lớp học' },
    { to: '/admin/teachers', icon: Users, label: 'Giáo viên' },
    { to: '/admin/students', icon: GraduationCap, label: 'Học sinh' },
    { to: '/admin/attendance', icon: ClipboardList, label: 'Điểm danh' },
];

const teacherNav = [
    { to: '/teacher', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/teacher/classes', icon: BookOpen, label: 'Lớp phụ trách' },
    { to: '/teacher/gradebook', icon: FileText, label: 'Nhập điểm' },
    { to: '/teacher/notes', icon: StickyNote, label: 'Ghi chú' },
];

const parentNav = [
    { to: '/parent', icon: LayoutDashboard, label: 'Tổng quan' },
    { to: '/parent/grades', icon: FileText, label: 'Điểm số' },
    { to: '/parent/attendance', icon: Calendar, label: 'Lịch sử điểm danh' },
    { to: '/parent/notifications', icon: Bell, label: 'Thông báo' },
];

function ProtectedRoute({ children, allowedRoles }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
    // Block parent dashboard until they change their default password
    if (user.role === 'parent' && user.force_change_password) {
        return <Navigate to="/parent/change-password" replace />;
    }
    return children;
}

function AppRoutes() {
    const { user } = useAuth();

    return (
        <Routes>
            {/* Public */}
            <Route element={<PublicLayout />}>
                <Route path="/" element={<PublicHome />} />
                <Route path="/features" element={<Features />} />
                <Route path="/attendance" element={<PublicAttendance />} />
                <Route path="/support" element={<Support />} />
            </Route>

            <Route path="/login" element={user ? <Navigate to={`/${user.role}`} replace /> : <Login />} />

            {/* Admin */}
            <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout sidebarItems={adminNav} roleTitle="Quản trị viên" />
                </ProtectedRoute>
            }>
                <Route index element={<AdminDashboard />} />
                <Route path="classes" element={<Classes />} />
                <Route path="teachers" element={<Teachers />} />
                <Route path="students" element={<Students />} />
                <Route path="attendance" element={<AdminAttendance />} />
            </Route>

            {/* Teacher */}
            <Route path="/teacher" element={
                <ProtectedRoute allowedRoles={['teacher']}>
                    <DashboardLayout sidebarItems={teacherNav} roleTitle="Giáo viên" />
                </ProtectedRoute>
            }>
                <Route index element={<TeacherDashboard />} />
                <Route path="classes" element={<TeacherClasses />} />
                <Route path="gradebook" element={<Gradebook />} />
                <Route path="notes" element={<Notes />} />
            </Route>

            {/* Parent */}
            {/* Parent - Password Change (no layout, before login redirect) */}
            <Route path="/parent/change-password" element={<ParentChangePassword />} />

            <Route path="/parent" element={
                <ProtectedRoute allowedRoles={['parent']}>
                    <DashboardLayout sidebarItems={parentNav} roleTitle="Phụ huynh" />
                </ProtectedRoute>
            }>
                <Route index element={<ParentDashboard />} />
                <Route path="grades" element={<ParentGrades />} />
                <Route path="attendance" element={<ParentAttendance />} />
                <Route path="notifications" element={<ParentNotifications />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <AuthProvider>
                    <NotificationProvider>
                        <AppRoutes />
                    </NotificationProvider>
                </AuthProvider>
            </BrowserRouter>
        </ThemeProvider>
    );
}
