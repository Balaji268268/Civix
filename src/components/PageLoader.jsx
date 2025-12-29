import React from 'react';

const PageLoader = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/90 backdrop-blur-md transition-all duration-500">
            <div className="relative flex flex-col items-center">
                {/* Animated Background Blob */}
                <div className="absolute w-32 h-32 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div className="absolute w-32 h-32 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000 ml-10"></div>
                <div className="absolute w-32 h-32 bg-green-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000 mt-10"></div>

                {/* Logo / Spinner Container */}
                <div className="relative z-10 flex flex-col items-center gap-6 bg-white/40 dark:bg-gray-800/40 p-10 rounded-3xl shadow-2xl backdrop-blur-xl border border-white/20 dark:border-gray-700/30">

                    {/* Logo Icon */}
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-400 text-xl tracking-tighter">
                            CVX
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                            Civix
                        </h3>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
                            Loading Experience...
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PageLoader;
