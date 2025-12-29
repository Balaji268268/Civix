import React from 'react';

const UserLayout = ({ children, title, subtitle }) => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans transition-colors duration-300">
            {/* Main Content - Centralized Layout without Sidebar */}
            <main className="max-w-7xl mx-auto p-6 lg:p-10">
                {(title || subtitle) && (
                    <div className="flex justify-between items-end mb-8 fade-in">
                        <div>
                            {title && <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">{title}</h1>}
                            {subtitle && <p className="text-gray-500 mt-1 text-lg">{subtitle}</p>}
                        </div>
                    </div>
                )}

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default UserLayout;
