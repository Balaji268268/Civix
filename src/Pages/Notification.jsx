import React, { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import AdminSidebar from '../components/AdminSidebar';
import csrfManager from "../utils/csrfManager";
import { useAuth } from "@clerk/clerk-react";

const Notifications = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [notifications, setNotifications] = useState([]);
  const { getToken } = useAuth();

  // Polling for notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const response = await csrfManager.secureFetch('http://localhost:5000/api/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(intervalId);
  }, [getToken]);

  const handleMarkAsRead = async (id) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));

      const token = await getToken();
      if (!token) return;

      await csrfManager.secureFetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Failed to mark read:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans flex">
      <AdminSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <div className="p-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent mb-6">System Notifications</h1>

          <div className="space-y-4 max-w-4xl">
            {notifications.length === 0 ? (
              <div className="text-gray-500 text-center py-10">No notifications to display.</div>
            ) : (
              notifications.map((notif) => (
                <div key={notif._id} className={`p-5 rounded-xl border flex gap-4 ${notif.read ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700' : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800'}`}>
                  <div className={`p-3 rounded-full h-fit flex-shrink-0 ${notif.type === 'warning' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`font-semibold ${notif.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>{notif.title}</h3>
                      <span className="text-xs text-gray-400">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{notif.message}</p>
                    <div className="flex gap-2">
                      {!notif.read && <button onClick={() => handleMarkAsRead(notif._id)} className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1"><Check className="w-3 h-3" /> Mark as Read</button>}
                      <button className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
                    </div>
                  </div>
                </div>
              )))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
