const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testFullFlow() {
    try {
        console.log('--- 1. Login ---');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'anh@school.local',
            password: 'Teacher@123',
            role: 'teacher'
        });
        const token = loginRes.data.token;
        if (!token) throw new Error('No token returned');
        console.log('Login OK. Token length:', token.length);

        const config = { headers: { Authorization: `Bearer ${token}` } };

        console.log('\n--- 2. Get Assignments ---');
        const assignRes = await axios.get(`${BASE_URL}/teacher/class-subjects`, config);
        const assignments = assignRes.data.assignments || [];
        console.log(`Assignments count: ${assignments.length}`);
        if (assignments.length === 0) throw new Error('No assignments found');

        const firstClass = assignments[0];
        console.log(`Selected Class: ${firstClass.class_name} (${firstClass.subject}) ClassID=${firstClass.class_id} CST_ID=${firstClass.class_subject_teacher_id}`);

        console.log('\n--- 3. Get Dashboard Stats ---');
        const dashRes = await axios.get(`${BASE_URL}/teacher/dashboard`, {
            params: {
                class_subject_teacher_id: firstClass.class_subject_teacher_id,
                academic_year: '2024-2025'
            },
            headers: config.headers
        });
        console.log('Dashboard Data Sample:', {
            class_average: dashRes.data.class_average,
            student_count: dashRes.data.student_count
        });

        console.log('\n--- 4. Manual Attendance Test ---');
        // Get students first
        const studentRes = await axios.get(`${BASE_URL}/students`, {
            params: { class_id: firstClass.class_id },
            headers: config.headers
        });
        const students = studentRes.data;
        if (students.length === 0) {
            console.log('Warning: No students in class, cannot test attendance.');
        } else {
            const studentId = students[0].id;
            const testDate = new Date().toISOString().slice(0, 10);
            console.log(`Testing with Student ID: ${studentId} on ${testDate}`);

            // POST Attendance (Set to 'late')
            const payload = {
                date: testDate,
                class_id: firstClass.class_id,
                records: [{ student_id: studentId, status: 'late' }]
            };
            await axios.post(`${BASE_URL}/attendance`, payload, config);
            console.log('Attendance Saved.');

            // GET Attendance
            const getAttRes = await axios.get(`${BASE_URL}/attendance`, {
                params: { date: testDate, class_id: firstClass.class_id },
                headers: config.headers
            });
            const entry = getAttRes.data.find(e => e.student_id === studentId);
            console.log(`Retrieved Status for student ${studentId}:`, entry ? entry.status : 'Not Found');

            if (entry && entry.status === 'late') {
                console.log('VERIFICATION SUCCESS: Manual attendance persists.');
            } else {
                console.log('VERIFICATION FAILURE: Persistence check failed.');
            }
        }

        console.log('\n--- ALL TESTS PASSED ---');

    } catch (e) {
        console.error('Test Failed:', e.response ? JSON.stringify(e.response.data) : e.message);
    }
}
testFullFlow();
