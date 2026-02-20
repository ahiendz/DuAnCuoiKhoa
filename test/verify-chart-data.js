// verify-chart-data.js — Node.js native fetch (v18+)
// Usage: node test/verify-chart-data.js

const BASE = 'http://127.0.0.1:5000';

function transformGradeData(rows) {
    if (!rows || rows.length === 0) return [];
    const targetSubjects = ['Toán', 'Ngữ văn', 'Tiếng Việt', 'Văn', 'Tiếng Anh', 'Anh', 'Khoa học tự nhiên', 'KHTN'];
    const bySubject = {};
    rows.forEach((row) => {
        const key = row.subject_name || 'Không rõ';
        if (!targetSubjects.includes(key)) return;
        let normalizedKey = key;
        if (key === 'Ngữ văn' || key === 'Tiếng Việt') normalizedKey = 'Văn';
        if (key === 'Tiếng Anh') normalizedKey = 'Anh';
        if (key === 'Khoa học tự nhiên') normalizedKey = 'KHTN';
        if (!bySubject[normalizedKey]) bySubject[normalizedKey] = { hk1: null, hk2: null };
        const avg = row.weighted_average !== null ? parseFloat(row.weighted_average) : null;
        const sem = String(row.semester).replace(/\D/g, '');
        if (sem === '1') bySubject[normalizedKey].hk1 = avg;
        else if (sem === '2') bySubject[normalizedKey].hk2 = avg;
    });
    const orderedKeys = ['Toán', 'Văn', 'Anh', 'KHTN'];
    return orderedKeys.map((subject) => {
        if (bySubject[subject]) {
            const { hk1, hk2 } = bySubject[subject];
            const trend_delta = (hk1 !== null && hk2 !== null) ? parseFloat((hk2 - hk1).toFixed(2)) : null;
            return { subject, hk1, hk2, trend_delta, trend_overlay: 1 };
        }
        return { subject, hk1: null, hk2: null, trend_delta: null, trend_overlay: 1 };
    });
}

async function main() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        console.log('1. Logging in...');
        const loginRes = await fetch(`${BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'ph.ly.anh.hien@school.local', password: 'huhu18072011', role: 'parent' }),
            signal: controller.signal,
        });
        const login = await loginRes.json();
        if (!login.token) { console.error('❌ Login failed:', login); return; }
        const token = login.token;
        console.log(`✅ Login OK — ${login.name}`);

        console.log('2. Fetching students...');
        const studRes = await fetch(`${BASE}/api/parent/students`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
        });
        const stud = await studRes.json();
        // Handle both { ok, data } and direct array formats
        const students = stud.data || stud;
        if (!Array.isArray(students) || students.length === 0) { console.error('❌ No students:', stud); return; }
        const sid = students[0].id;
        console.log(`✅ Student: ${students[0].full_name} (id=${sid})`);

        console.log('3. Fetching grades...');
        const grRes = await fetch(`${BASE}/api/parent/grades/${sid}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
        });
        const gr = await grRes.json();
        // Handle both { ok, data } and direct object formats
        const grData = gr.data || gr;
        if (!grData.by_term_and_subject) { console.error('❌ Grades missing by_term_and_subject:', gr); return; }
        console.log(`✅ by_term_and_subject rows: ${grData.by_term_and_subject?.length || 0}`);

        const chartData = transformGradeData(grData.by_term_and_subject);
        console.log('\n=== chartData (should have 4 subjects) ===');
        console.table(chartData);

        const nonNull = chartData.filter(d => d.hk1 !== null || d.hk2 !== null);
        if (nonNull.length > 0) {
            console.log(`\n✅ PASS — ${nonNull.length}/4 subjects have data`);
        } else {
            console.log('\n⚠️  WARNING — All subjects are null. The API returned no matching data for the 4 core subjects.');
        }
    } catch (err) {
        if (err.name === 'AbortError') console.error('❌ Request timed out (8s)');
        else console.error('❌ Error:', err.message);
    } finally {
        clearTimeout(timeout);
    }
}

main();
