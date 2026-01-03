import React from 'react';
import { useAuth, useUser } from "@clerk/clerk-react";
import { Shield, LogOut, CheckCircle, BarChart2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import NotificationCenter from "../common/NotificationCenter";

import PageTransition from "../PageTransition";
import logo from "../../assets/logo.png";

const ModeratorLayout = ({ children }) => {
    const { signOut } = useAuth();
    const { user } = useUser();
    const navigate = useNavigate();
    const location = useLocation();

    const activeTab = location.pathname.includes("insights") ? "insights" : "issues";

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col fixed h-full z-10">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <img src={logo} alt="Civix" className="w-8 h-8 object-contain" />
                    <h1 className="font-bold text-xl text-gray-800 dark:text-gray-100">Moderator</h1>
                </div>
                <nav className="p-4 space-y-2 flex-1 flex flex-col">
                    <button
                        onClick={() => navigate("/moderator")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === "issues" ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-semibold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                    >
                        <CheckCircle className="w-5 h-5" /> Pending Issues
                    </button>
                    <button
                        onClick={() => navigate("/moderator/insights")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === "insights" ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-semibold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                    >
                        <BarChart2 className="w-5 h-5" /> Community Insights
                    </button>

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
                            {activeTab === "issues" ? "Issue Verification Queue" : "Community Intelligence"}
                        </h2>
                        <p className="text-gray-500">Welcome back, {user?.firstName}</p>
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-4">
                        <NotificationCenter />
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                            {user?.firstName?.charAt(0) || "M"}
                        </div>
                    </div>
                </header>
                <PageTransition>
                    {children}
                </PageTransition>
            </main>
        </div>
    );
};

export default ModeratorLayout;
