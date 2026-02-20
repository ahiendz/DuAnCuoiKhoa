const axios = require('axios');

async function testGradesAPI() {
    try {
        console.log("1. Logging in as ph.ly.anh.hien@school.local...");
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'ph.ly.anh.hien@school.local',
            password: 'huhu18072011',
            role: 'parent'
        });
        const token = loginRes.data.token;
        console.log("Login success! Token acquired.");

        console.log("2. Fetching student list...");
        const studentsRes = await axios.get('http://localhost:5000/api/parent/students', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const students = studentsRes.data.data;
        console.log("Students found:", students.length);

        if (students.length === 0) {
            console.log("No students to check.");
            return;
        }

        const studentId = students[0].id; // using first student
        console.log(`3. Fetching grades for student ID: ${studentId} (${students[0].full_name})...`);

        const gradesRes = await axios.get(`http://localhost:5000/api/parent/grades/${studentId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = gradesRes.data.data;
        console.log("Overall Average:", data.overall_average);

        console.log("4. Term & Subject Grade Records:");
        data.by_term_and_subject.forEach(g => {
            console.log(` - Môn: ${g.subject_name.padEnd(20)} | HK${g.semester} | AVG: ${g.average_semester} | Weighted: ${g.weighted_average}`);
        });

    } catch (err) {
        console.error("Test failed:", err?.response?.data || err.message);
    }
}

testGradesAPI();
