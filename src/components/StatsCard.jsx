import React from 'react';

export default function StatsCard({ title, value, icon: Icon, color }) {
    const gradientMap = {
        indigo: "from-indigo-500 to-indigo-600",
        blue: "from-blue-500 to-blue-600",
        green: "from-emerald-500 to-emerald-600",
        orange: "from-orange-500 to-orange-600",
        red: "from-red-500 to-red-600",
        purple: "from-purple-500 to-purple-600",
    };

    const bgGradient = gradientMap[color] || gradientMap.indigo;

    return (
        <div className="card-panel p-5 hover:shadow-lg transition-shadow border-l-4 border-l-transparent hover:border-l-indigo-500">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                        {title}
                    </p>
                    <h3 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                        {value}
                    </h3>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bgGradient} flex items-center justify-center text-white shadow-md`}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );
}
