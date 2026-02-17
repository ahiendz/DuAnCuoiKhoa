import api from './api';

export const getClasses = () => api.get('/classes').then(r => r.data);
export const createClass = (data) => api.post('/classes', data).then(r => r.data);
export const updateClass = (id, data) => api.put(`/classes/${id}`, data).then(r => r.data);
export const deleteClass = (id) => api.delete(`/classes/${id}`).then(r => r.data);
export const exportClassesCsv = () => window.open('/api/classes/export', '_blank');
export const getSubjects = () => api.get('/subjects').then(r => r.data);
