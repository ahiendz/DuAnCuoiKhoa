const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testNotes() {
    try {
        console.log('--- 1. Login ---');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'anh@school.local',
            password: 'Teacher@123',
            role: 'teacher'
        });
        const token = loginRes.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        console.log('\n--- 2. Get Class ID ---');
        const assignRes = await axios.get(`${BASE_URL}/teacher/class-subjects`, config);
        const firstClass = assignRes.data.assignments[0];
        const cstId = firstClass.class_subject_teacher_id;
        console.log(`Using Class Subject Teacher ID: ${cstId}`);

        console.log('\n--- 3. Create Note ---');
        const noteRes = await axios.post(`${BASE_URL}/notes`, {
            class_subject_teacher_id: cstId,
            content: "Test Note via Script " + Date.now()
        }, config);
        const noteId = noteRes.data.note.id;
        console.log(`Note Created: ID=${noteId}, Content=${noteRes.data.note.text}`);

        console.log('\n--- 4. List Notes ---');
        const listRes = await axios.get(`${BASE_URL}/notes`, config);
        const notes = listRes.data.notes;
        console.log(`Total Notes: ${notes.length}`);
        const found = notes.find(n => n.id === noteId);
        if (found) console.log('VERIFICATION: Note found in list.');
        else console.error('VERIFICATION FAILED: Note not found.');

        console.log('\n--- 5. Delete Note ---');
        await axios.delete(`${BASE_URL}/notes/${noteId}`, config);
        console.log('Note Deleted.');

        console.log('\n--- 6. Verify Deletion ---');
        const listRes2 = await axios.get(`${BASE_URL}/notes`, config);
        const found2 = listRes2.data.notes.find(n => n.id === noteId);
        if (!found2) console.log('VERIFICATION SUCCESS: Note is gone.');
        else console.error('VERIFICATION FAILED: Note still exists.');

    } catch (e) {
        console.error('Test Failed:', e.response ? JSON.stringify(e.response.data) : e.message);
    }
}
testNotes();
