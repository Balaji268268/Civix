import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import AdminSidebar from '../AdminSidebar';
import NotificationCenter from '../common/NotificationCenter';
import PageTransition from '../PageTransition';

const AdminLayout = ({ children, title, subtitle }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans transition-colors duration-300">
            {/* Mobile Sidebar Overlay */}
            <div className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`} onClick={() => setIsSidebarOpen(false)} />

            {/* Sidebar */}
            <AdminSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

            {/* Main Content */}
            <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                {/* Mobile Header for Toggle */}
                <div className="lg:hidden p-4 flex items-center gap-4 bg-white/50 backdrop-blur-md sticky top-0 z-30">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white rounded-lg shadow text-gray-600">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                    <span className="font-bold text-gray-800">Civix Admin</span>
                </div>

                <div className="p-6 lg:p-10 max-w-7xl mx-auto">
                    {(title || subtitle) && (
                        <div className="flex justify-between items-center mb-8 fade-in">
                            <div>
                                {title && <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">{title}</h1>}
                                {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
                            </div>

                            {/* Header Actions */}
                            <div className="flex items-center gap-4">
                                <NotificationCenter />
                                <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-sm font-medium text-emerald-600">System Active</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <PageTransition>
                        {children}
                    </PageTransition>
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
