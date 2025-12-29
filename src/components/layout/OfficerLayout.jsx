import React from 'react';
import { useAuth, useUser } from "@clerk/clerk-react";
import { Shield, LogOut, CheckCircle, List } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import NotificationCenter from "../common/NotificationCenter";

const OfficerLayout = ({ children }) => {
    const { signOut } = useAuth();
    const { user } = useUser();
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col fixed h-full z-10">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Shield className="w-6 h-6" />
                    </div>
                    <h1 className="font-bold text-xl text-gray-800 dark:text-gray-100">Officer Portal</h1>
                </div>
                <nav className="p-4 space-y-2 flex-1 flex flex-col">
                    <button
                        onClick={() => navigate("/officer/dashboard")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${location.pathname.includes("dashboard") ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-semibold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                    >
                        <List className="w-5 h-5" /> My Tasks
                    </button>
                    {/* Add more officer tabs here if needed */}

                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition">
                            <LogOut className="w-5 h-5" /> Logout
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 md:ml-64">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Field Officer Dashboard
                        </h2>
                        <p className="text-gray-500">Welcome back, {user?.firstName}</p>
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-4">
                        <NotificationCenter />
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                            {user?.firstName?.charAt(0) || "O"}
                        </div>
                    </div>
                </header>
                {children}
            </main>
        </div>
    );
};

export default OfficerLayout;
