import React from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Home, BarChart3, Users, FileText, Bell, Settings, ChevronRight, ChevronLeft, Search, MessageSquare, LogOut } from 'lucide-react';

const AdminSidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const activeRoute = location.pathname;

    const sidebarMenu = [
        { key: 'dashboard', label: 'Dashboard', icon: Home, route: '/admin/dashboard' },
        { key: 'analytics', label: 'Analytics', icon: BarChart3, route: '/admin/analytics' },
        { key: 'users', label: 'Users', icon: Users, route: '/admin/users' },
        { key: 'documents', label: 'Documents', icon: FileText, route: '/admin/documents' },
        { key: 'messages', label: 'Messages', icon: MessageSquare, route: '/admin/messages' },
        { key: 'notifications', label: 'Notifications', icon: Bell, route: '/admin/notifications' },
        { key: 'settings', label: 'Settings', icon: Settings, route: '/admin/settings' },
    ];

    return (
        <aside className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-in-out backdrop-blur-xl bg-white/80 border-r border-gray-200/50 flex flex-col shadow-xl ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0 lg:w-20'}`}>
            <div className="relative flex items-center justify-between p-4 border-b border-gray-200/50">
                <div className={`flex items-center transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <span className="text-white font-bold text-sm">C</span>
                    </div>
                    {isSidebarOpen && (
                        <span className="ml-3 text-xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent whitespace-nowrap">
                            Civix
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={`p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${!isSidebarOpen ? 'mx-auto' : ''}`}
                >
                    {isSidebarOpen ? <ChevronLeft className="w-5 h-5 text-gray-600" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
                </button>
            </div>

            {isSidebarOpen && (
                <div className="p-4 border-b border-gray-200/50">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all" />
                    </div>
                </div>
            )}

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {sidebarMenu.map((item) => {
                    const isActive = activeRoute === item.route;
                    const Icon = item.icon;
                    return (
                        <div key={item.key} className="relative group">
                            <button
                                type="button"
                                className={`w-full flex items-center py-3 px-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden
                  ${isSidebarOpen ? '' : 'justify-center'}
                  ${isActive ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 transform scale-[1.02]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:shadow-md'}
                `}
                                onClick={() => navigate(item.route)}
                                aria-current={isActive ? "page" : undefined}
                                title={!isSidebarOpen ? item.label : undefined}
                            >
                                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 opacity-10 rounded-xl" />}
                                <div className="relative z-10 flex items-center">
                                    <Icon className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${isSidebarOpen ? 'mr-3' : ''} ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-emerald-600'}`} />
                                    {isSidebarOpen && <span className="relative z-10 transition-all duration-300 whitespace-nowrap">{item.label}</span>}
                                </div>
                            </button>
                        </div>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-200/50 bg-gray-50/50">
                <button
                    onClick={() => signOut()}
                    className={`w-full flex items-center py-3 px-3 rounded-xl text-sm font-medium transition-all duration-200 text-red-500 hover:bg-red-50 hover:text-red-700 group
                      ${isSidebarOpen ? '' : 'justify-center'}
                    `}
                    title={!isSidebarOpen ? "Logout" : undefined}
                >
                    <LogOut className={`w-5 h-5 flex-shrink-0 transition-all ${isSidebarOpen ? 'mr-3' : ''}`} />
                    {isSidebarOpen && <span className="font-bold">Logout</span>}
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
