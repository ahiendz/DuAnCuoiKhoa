import api from './api';

export const getAllNotes = () => api.get('/notes').then(r => r.data.notes);

export const createNote = (data) => api.post('/notes', data).then(r => r.data.note);

export const deleteNote = (id) => api.delete(`/notes/${id}`).then(r => r.data);
