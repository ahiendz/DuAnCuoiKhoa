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
        <div className="card hover:shadow-lg transition-shadow border-l-4 border-l-transparent hover:border-l-indigo-500 dark:hover:border-l-indigo-400">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wide">
                        {title}
                    </p>
                    <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">
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
