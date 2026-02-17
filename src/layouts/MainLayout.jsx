import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';

export default function MainLayout({ navItems, roleTitle }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const { user } = useAuth();

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <Sidebar
                navItems={navItems}
                roleTitle={roleTitle}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                mobileOpen={sidebarOpen}
                closeMobile={() => setSidebarOpen(false)}
            />

            {/* Main area */}
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar user={user} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
