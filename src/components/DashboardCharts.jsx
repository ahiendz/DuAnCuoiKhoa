import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

export const StudentDistributionChart = ({ data }) => {
    return (
        <div className="card-panel h-80 p-4">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Phân bố học sinh theo Khối</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid stroke="var(--border-default)" strokeDasharray="3 3" opacity={0.5} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="var(--text-placeholder)" />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="var(--text-placeholder)" />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-surface)', borderRadius: '8px', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-dropdown)' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Bar dataKey="students" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const TeacherSubjectChart = ({ data }) => {
    const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];

    return (
        <div className="card-panel h-80 p-4">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Giáo viên theo Bộ môn</h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-dropdown)' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
