import React, { useEffect, useState } from 'react';
import { X, Heart, MessageCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import csrfManager from '../../utils/csrfManager';

const NotificationPanel = ({ isOpen, onClose }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const fetchNotifications = async () => {
        try {
            const response = await csrfManager.secureFetch('/api/notifications');
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    setNotifications(data);
                } else {
                    console.warn("Notification API returned non-array:", data);
                    setNotifications([]);
                }
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 pointer-events-none">
            {/* Backdrop (optional, for closing) */}
            <div className="absolute inset-0 pointer-events-auto" onClick={onClose}></div>

            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 pointer-events-auto overflow-hidden animate-in slide-in-from-right-10 fade-in duration-200 mt-16 max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm">
                    <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">No new notifications</div>
                    ) : (
                        notifications.map((notif) => (
                            <div key={notif._id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors flex gap-3 cursor-pointer group">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'like' ? 'bg-pink-100 text-pink-500' :
                                    notif.type === 'comment' ? 'bg-blue-100 text-blue-500' :
                                        notif.type === 'warning' ? 'bg-amber-100 text-amber-500' :
                                            'bg-emerald-100 text-emerald-500'
                                    }`}>
                                    {notif.type === 'like' && <Heart className="w-5 h-5 fill-current" />}
                                    {notif.type === 'comment' && <MessageCircle className="w-5 h-5 fill-current" />}
                                    {notif.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                                    {notif.type === 'success' && <CheckCircle className="w-5 h-5" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">
                                        {notif.message}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>

                                {!notif.read && (
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationPanel;
