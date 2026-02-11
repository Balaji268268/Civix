import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, AlertTriangle, CheckCircle, Bell, UserPlus, Repeat } from 'lucide-react';
import csrfManager from '../../utils/csrfManager';
import { motion } from 'framer-motion';

const NotificationFeed = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await csrfManager.secureFetch('/api/notifications');
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    setNotifications(data);
                    // Mark all as read? Or let user click? 
                    // Usually opening the feed marks them as read.
                    markAllAsRead();
                } else {
                    setNotifications([]);
                }
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    const markAllAsRead = async () => {
        try {
            await csrfManager.secureFetch('/api/notifications/mark-read', { method: 'PUT' });
        } catch (e) { console.error("Failed to mark notifications read", e); }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm animate-pulse h-20"></div>
                ))}
            </div>
        );
    }

    if (notifications.length === 0) {
        return (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="bg-gray-100 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">No Notifications</h3>
                <p className="text-gray-500 text-sm mt-1">When you get likes, comments, or mentions, they'll show up here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Notifications</h2>

            {notifications.map((notif, index) => (
                <motion.div
                    key={notif._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4 ${!notif.read ? 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800' : ''}`}
                >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'like' ? 'bg-pink-100 text-pink-500' :
                            notif.type === 'comment' ? 'bg-blue-100 text-blue-500' :
                                notif.type === 'repost' ? 'bg-green-100 text-green-500' :
                                    notif.type === 'follow' ? 'bg-purple-100 text-purple-500' :
                                        notif.type === 'warning' ? 'bg-amber-100 text-amber-500' :
                                            'bg-emerald-100 text-emerald-500'
                        }`}>
                        {notif.type === 'like' && <Heart className="w-6 h-6 fill-current" />}
                        {notif.type === 'comment' && <MessageCircle className="w-6 h-6 fill-current" />}
                        {notif.type === 'repost' && <Repeat className="w-6 h-6" />}
                        {notif.type === 'follow' && <UserPlus className="w-6 h-6" />}
                        {notif.type === 'warning' && <AlertTriangle className="w-6 h-6" />}
                        {(notif.type === 'info' || notif.type === 'success') && <CheckCircle className="w-6 h-6" />}
                    </div>

                    <div className="flex-1">
                        <p className="text-base text-gray-900 dark:text-gray-100">
                            <span className="font-medium">
                                {notif.message.split(' ').slice(0, 2).join(' ')} {/* Attempt to bold name if possible, or just standard text */}
                            </span>
                            {notif.message.split(' ').slice(2).join(' ')}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>

                    {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                    )}
                </motion.div>
            ))}
        </div>
    );
};

export default NotificationFeed;
