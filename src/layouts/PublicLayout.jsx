import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from '@/components/PublicNavbar';

export default function PublicLayout() {
    return (
        <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors">
            <PublicNavbar />
            <Outlet />
        </div>
    );
}
