import api from './api';

export const getStudents = (classId) => api.get('/students', { params: classId ? { class_id: classId } : {} }).then(r => r.data);
export const createStudent = (data) => api.post('/students', data).then(r => r.data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data).then(r => r.data);
export const deleteStudent = (id) => api.delete(`/students/${id}`).then(r => r.data);
export const importStudents = (rows, mode, classId) => api.post('/students/import', { rows, mode, class_id: classId }).then(r => r.data);
export const exportStudentsCsv = (classId) => window.open(`/api/students/export${classId ? `?class_id=${classId}` : ''}`, '_blank');
