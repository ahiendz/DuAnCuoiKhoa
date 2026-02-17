import api from './api';

export const getAttendance = (params) => api.get('/attendance', { params }).then(r => r.data);
export const getFaceAttendance = (params) => api.get('/attendance/face', { params }).then(r => r.data);
export const saveManualAttendance = (data) => api.post('/attendance', data).then(r => r.data);
