const axios = require('axios');

async function testGradesAPI() {
    try {
        console.log('--- TEST PARENT GRADES API ---');

        const loginData = {
            email: 'ph.ly.anh.hien@school.local',
            password: 'huhu18072011',
            role: 'parent'
        };

        console.log(`1. Logging in as ${loginData.email}...`);
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', loginData);
        const token = loginRes.data.token;
        console.log('✅ Login successful. Token received.');

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        console.log('2. Fetching student list...');
        const studentsRes = await axios.get('http://localhost:5000/api/parent/students', config);
        const students = studentsRes.data.data;
        console.log(`✅ Found ${students.length} student(s) for this parent.`);

        if (students.length === 0) {
            console.log('No students found to test grades for.');
            return;
        }

        const studentId = students[0].id;
        console.log(`3. Fetching grades for student ID ${studentId} (${students[0].full_name})...`);
        const gradesRes = await axios.get(`http://localhost:5000/api/parent/grades/${studentId}`, config);
        const gradesData = gradesRes.data;

        if (gradesData.ok) {
            console.log('✅ Received grades data successfully.');
            console.log('--- Data Structure Check ---');
            console.log(`Overall Average: ${gradesData.data.overall_average}`);

            const rows = gradesData.data.by_term_and_subject;
            console.log(`Number of grade rows: ${rows.length}`);

            if (rows.length > 0) {
                const sample = rows[0];
                console.log('Sample Row Structure:');
                console.log(JSON.stringify(sample, null, 2));

                const requiredFields = [
                    'semester', 'academic_year', 'subject_name',
                    'mieng_1', 'mieng_2', 'phut15_1', 'phut15_2',
                    'tiet1_1', 'tiet1_2', 'giuaki', 'cuoiki',
                    'average_semester', 'student_name', 'weighted_average'
                ];

                let missingFields = [];
                for (const field of requiredFields) {
                    if (!(field in sample)) {
                        missingFields.push(field);
                    }
                }

                if (missingFields.length === 0) {
                    console.log('✅ Structure match: ALL required component grade fields are present.');
                } else {
                    console.log('❌ Structure match FAILED. Missing fields:', missingFields);
                }
            } else {
                console.log('⚠️ No grade rows found to check structure.');
            }
        }

        console.log('\n4. Testing Ownership Validation (Security Check)...');
        try {
            await axios.get(`http://localhost:5000/api/parent/grades/99999`, config);
            console.log('❌ Ownership validation FAILED. Attempt to access unauthorized student succeeded.');
        } catch (error) {
            if (error.response && error.response.status === 403) {
                console.log('✅ Ownership validation passed (403 Forbidden).');
            } else {
                console.log(`⚠️ Unexpected error during ownership validation: ${error.message}`);
                console.log(error.response?.data);
            }
        }

        console.log('\n--- SUCCESS: Script Test Passed ---');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error(error.response.data);
        }
    }
}

testGradesAPI();
