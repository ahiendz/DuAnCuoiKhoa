const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function debugData() {
    try {
        console.log('--- 1. Login ---');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'anh@school.local',
            password: 'Teacher@123',
            role: 'teacher'
        });
        const token = loginRes.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const userId = loginRes.data.id;

        console.log('\n--- 2. Get Assignments ---');
        const assignRes = await axios.get(`${BASE_URL}/teacher/class-subjects`, config);
        const assignments = assignRes.data.assignments;
        console.log('Assignments count:', assignments.length);
        if (assignments.length === 0) { console.log('No assignments found.'); return; }

        const firstClass = assignments[0];
        const cstId = firstClass.class_subject_teacher_id;
        console.log('Selected Assignment:', JSON.stringify(firstClass, null, 2));
        console.log('Using CST ID:', cstId, 'Type:', typeof cstId);

        console.log('\n--- 3. Get Dashboard Data ---');
        try {
            const dashboardRes = await axios.get(`${BASE_URL}/teacher/dashboard`, {
                ...config,
                params: { class_subject_teacher_id: cstId }
            });
            console.log('DASHBOARD JSON:', JSON.stringify(dashboardRes.data, null, 2));
        } catch (e) { console.error('Dashboard Error:', e.response?.data || e.message); }

        console.log('\n--- 4. Get Grades Data ---');
        try {
            const gradesRes = await axios.get(`${BASE_URL}/teacher/grades`, {
                ...config,
                params: {
                    class_subject_teacher_id: cstId,
                    semester: 'HK1',
                    academic_year: '2024-2025'
                }
            });
            console.log('GRADES JSON (First 2 items):', JSON.stringify((gradesRes.data.grades || []).slice(0, 2), null, 2));
        } catch (e) { console.error('Grades Error:', e.response?.data || e.message); }

    } catch (e) {
        console.error('Test Failed:', e.response ? JSON.stringify(e.response.data) : e.message);
    }
}
debugData();
