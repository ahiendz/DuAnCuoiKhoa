import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from '@/components/PublicNavbar';

export default function PublicLayout() {
    return (
        <div className="relative flex flex-col min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors">
            <PublicNavbar />
            <div className="flex-1 flex flex-col w-full h-full">
                <Outlet />
            </div>
        </div>
    );
}
