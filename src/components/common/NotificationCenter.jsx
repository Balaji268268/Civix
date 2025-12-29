import React, { useState, useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import { useUser } from "@clerk/clerk-react";

const NotificationCenter = () => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const { user, isLoaded } = useUser();
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!isLoaded || !user) return;

        const fetchNotifications = async () => {
            try {
                // Fetch users issues to check for updates
                // For Officers/Moderators, we might want a different logic eventually (e.g. Assigned Tasks)
                // But for now, let's reuse this endpoint or create a new one. 
                // Logic: Use same endpoint but filter by role in backend? 
                // OR: Just fetch "My Issues" for everyone for now.
                const response = await fetch(`http://localhost:5000/api/issues/my-issues?email=${user.emailAddresses[0].emailAddress}`);
                if (response.ok) {
                    const issues = await response.json();
                    // Map to notifications
                    const recentUpdates = issues
                        .slice(0, 5) // Last 5
                        .map(issue => ({
                            id: issue._id,
                            title: `Update: ${issue.title.substring(0, 20)}...`,
                            message: `Status: ${issue.status} • Priority: ${issue.priority}`,
                            time: new Date(issue.updatedAt || issue.createdAt).toLocaleDateString(),
                            unread: true
                        }));
                    setNotifications(recentUpdates);
                }
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [user, isLoaded]);

    const unreadCount = notifications.length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
                <Bell className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Notifications</h3>
                        <button onClick={() => setShowNotifications(false)}>
                            <X size={16} className="text-gray-400 hover:text-gray-600" />
                        </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-xs">No new notifications</div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} className="p-3 border-b border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-xs text-gray-800 dark:text-gray-200">{n.title}</span>
                                        <span className="text-[10px] text-gray-400">{n.time}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{n.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
