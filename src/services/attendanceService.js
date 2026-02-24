import api from './api';

export const getAttendance = (params) => api.get('/attendance', { params }).then(r => r.data);
export const getFaceAttendance = (params) => api.get('/attendance/face', { params }).then(r => r.data);
export const saveManualAttendance = (data) => api.post('/attendance', data).then(r => r.data);
export const getAttendanceAnalytics = () => api.get('/attendance/analytics').then(r => r.data);
export const exportAttendanceDbCsv = async () => {
    const res = await api.get('/attendance');
    const rows = Array.isArray(res.data) ? res.data : [];
    const header = ['student_id', 'class_id', 'date', 'status', 'confidence'];
    const csv = [
        header.join(','),
        ...rows.map(r => header
            .map(key => {
                const value = r[key] ?? '';
                const safe = String(value).replace(/"/g, '""');
                return `"${safe}"`;
            })
            .join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'attendance_export.csv';
    link.click();
    window.URL.revokeObjectURL(url);
};
