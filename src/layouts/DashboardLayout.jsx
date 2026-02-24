import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout({ sidebarItems, roleTitle }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const { user } = useAuth();

    const closeMobile = () => setSidebarOpen(false);

    return (
        <div className="h-screen w-full overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-300 grid grid-cols-1 lg:grid-cols-[auto_1fr] grid-rows-[auto_1fr]">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm pointer-events-auto"
                    onClick={closeMobile}
                />
            )}

            {/* Sidebar (Grid Column 1) */}
            <div className="lg:row-span-2 lg:col-start-1 relative z-50">
                <Sidebar
                    navItems={sidebarItems}
                    roleTitle={roleTitle}
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    mobileOpen={sidebarOpen}
                    closeMobile={closeMobile}
                />
            </div>

            {/* Navbar (Grid Column 2, Row 1) */}
            <div className="col-start-1 lg:col-start-2 row-start-1 relative z-30 shrink-0 min-w-0">
                <Navbar user={user} toggleSidebar={() => setSidebarOpen((prev) => !prev)} />
            </div>

            {/* Main Area (Grid Column 2, Row 2) */}
            <main className="col-start-1 lg:col-start-2 row-start-2 overflow-y-auto relative w-full h-full p-4 lg:p-6 min-w-0">
                <Outlet />
            </main>
        </div>
    );
}
