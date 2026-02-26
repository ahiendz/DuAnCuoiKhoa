import api from './api';

export const getStudents = (filters = {}) => {
    // Support both legacy (classId string) and new (filters object) calling styles
    const params = typeof filters === 'string'
        ? (filters ? { class_id: filters } : {})
        : Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined && v !== null));
    return api.get('/students', { params }).then(r => r.data);
};
export const createStudent = (data) => api.post('/students', data).then(r => r.data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data).then(r => r.data);
export const deleteStudent = (id) => api.delete(`/students/${id}`).then(r => r.data);
export const importStudents = (rows, mode, classId) => api.post('/students/import', { rows, mode, class_id: classId }).then(r => r.data);

export const exportStudentsTemplate = () => {
    const headers = ['student_code', 'full_name', 'dob', 'gender', 'parent_name', 'parent_email', 'parent_phone', 'parent_relation', 'avatar_url'];
    const csv = `${headers.join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
};
