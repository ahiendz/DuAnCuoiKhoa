import api from './api';

export const getTeachers = () => api.get('/teachers').then(r => r.data);
export const createTeacher = (data) => api.post('/teachers', data).then(r => r.data);
export const updateTeacher = (id, data) => api.put(`/teachers/${id}`, data).then(r => r.data);
export const deleteTeacher = (id) => api.delete(`/teachers/${id}`).then(r => r.data);
export const exportTeachersCsv = () => window.open('/api/teachers/export', '_blank');
