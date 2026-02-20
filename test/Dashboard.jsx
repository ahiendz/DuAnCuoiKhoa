import React from 'react';
import GradeTrendByTermChart from './GradeTrendByTermChart.jsx';
import { useTheme } from '../src/context/ThemeContext';

const Dashboard = () => {
    const { theme } = useTheme();

    // Dữ liệu mô phỏng từ Backend (Format thực tế từ API)
    const grades = {
        by_term_and_subject: [
            { subject_name: 'Toán', semester: 1, weighted_average: 8.5 },
            { subject_name: 'Toán', semester: 2, weighted_average: 9.2 },
            { subject_name: 'Ngữ văn', semester: 1, weighted_average: 7.0 },
            { subject_name: 'Ngữ văn', semester: 2, weighted_average: 7.5 },
            { subject_name: 'Tiếng Anh', semester: 1, weighted_average: 9.0 },
            { subject_name: 'Tiếng Anh', semester: 2, weighted_average: 8.8 },
            { subject_name: 'Khoa học tự nhiên', semester: 1, weighted_average: 6.5 },
            { subject_name: 'Khoa học tự nhiên', semester: 2, weighted_average: 8.0 },
        ]
    };

    return (
        <div className="p-6 space-y-6 bg-[var(--bg-page)] min-h-screen">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                    Sandbox: Biểu đồ xu hướng điểm
                </h1>

                <div className="grid grid-cols-1 gap-6">
                    {/* Truyền đối tượng grades vào component */}
                    <GradeTrendByTermChart grades={grades} theme={theme} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
