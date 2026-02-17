import api from './api';

export const getAssignments = (userId) => api.get('/teacher/class-subjects', { params: { user_id: userId } }).then(r => r.data);
export const getGrades = (params) => api.get('/teacher/grades', { params }).then(r => r.data);
export const saveGrade = (data) => api.post('/teacher/grades', data).then(r => r.data);
export const getDashboard = (params) => api.get('/teacher/dashboard', { params }).then(r => r.data);
export const exportGradesCsv = (params) => {
    return api.get('/teacher/export', {
        params,
        responseType: 'blob'
    }).then(res => {
        // Create filename from params
        const filename = `grades_${params.class_subject_teacher_id}_${params.semester}.csv`;
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    });
};
export const importGradesCsv = (formData) => api.post('/teacher/import', formData).then(r => r.data);
