import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from '@/components/PublicNavbar';

export default function PublicLayout() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
            <PublicNavbar />
            <main className="pt-20">
                <Outlet />
            </main>
        </div>
    );
}
