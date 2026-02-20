import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';

/**
 * useParentDashboard
 * Manages student list + per-student API calls for the parent dashboard.
 * All data refreshes automatically when selectedStudentId changes.
 */
export function useParentDashboard() {
    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState(null);

    // Per-category data & states
    const [summary, setSummary] = useState(null);
    const [grades, setGrades] = useState(null);
    const [attendance, setAttendance] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [notes, setNotes] = useState([]);

    const [loadingStudents, setLoadingStudents] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState(null);

    // Load student list once
    useEffect(() => {
        const fetchStudents = async () => {
            setLoadingStudents(true);
            setError(null);
            try {
                const res = await api.get('/parent/students');
                if (res.data.ok && res.data.data && res.data.data.length > 0) {
                    setStudents(res.data.data);
                    setSelectedStudentId(res.data.data[0].id);
                } else {
                    setStudents([]);
                    setError('Không tìm thấy học sinh nào liên kết với tài khoản này.');
                }
            } catch (err) {
                const status = err.response?.status;
                if (status === 401 || status === 403) {
                    setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                } else {
                    setError('Không thể tải danh sách học sinh. Vui lòng thử lại.');
                }
            } finally {
                setLoadingStudents(false);
            }
        };

        fetchStudents();
    }, []);

    // Fetch all dashboard data whenever selectedStudentId changes
    const fetchStudentData = useCallback(async (studentId) => {
        if (!studentId) return;
        setLoadingData(true);
        setSummary(null);
        setGrades(null);
        setAttendance(null);
        setAlerts([]);
        setNotes([]);

        const results = await Promise.allSettled([
            api.get(`/parent/dashboard/${studentId}`),
            api.get(`/parent/grades/${studentId}`),
            api.get(`/parent/attendance/${studentId}`),
            api.get(`/parent/alerts/${studentId}`),
            api.get(`/parent/notes/${studentId}`),
        ]);

        const [summaryRes, gradesRes, attendanceRes, alertsRes, notesRes] = results;

        if (summaryRes.status === 'fulfilled' && summaryRes.value.data.ok) {
            setSummary(summaryRes.value.data.data);
        }
        if (gradesRes.status === 'fulfilled' && gradesRes.value.data.ok) {
            setGrades(gradesRes.value.data.data);
        }
        if (attendanceRes.status === 'fulfilled' && attendanceRes.value.data.ok) {
            setAttendance(attendanceRes.value.data.data);
        }
        if (alertsRes.status === 'fulfilled' && alertsRes.value.data.ok) {
            setAlerts(alertsRes.value.data.data || []);
        }
        if (notesRes.status === 'fulfilled' && notesRes.value.data.ok) {
            setNotes(notesRes.value.data.data || []);
        }

        setLoadingData(false);
    }, []);

    useEffect(() => {
        if (selectedStudentId) {
            fetchStudentData(selectedStudentId);
        }
    }, [selectedStudentId, fetchStudentData]);

    const selectedStudent = students.find((s) => s.id === selectedStudentId) || null;

    return {
        // Students
        students,
        selectedStudent,
        selectedStudentId,
        setSelectedStudentId,
        // Data
        summary,
        grades,
        attendance,
        alerts,
        notes,
        // States
        loadingStudents,
        loadingData,
        error,
        // Helpers
        refetch: () => fetchStudentData(selectedStudentId),
    };
}
