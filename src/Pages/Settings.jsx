
import React, { useState } from 'react';
import { Home, BarChart3, Users, FileText, Bell, Settings, ChevronLeft, ChevronRight, Save, Shield, Database, Mail } from 'lucide-react';
import { useNavigate } from "react-router-dom";

const AdminSettings = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState('/admin/settings');

  const sidebarMenu = [
    { key: 'dashboard', label: 'Dashboard', icon: Home, route: '/admin/dashboard' },
    { key: 'analytics', label: 'Analytics', icon: BarChart3, route: '/admin/analytics' },
    { key: 'users', label: 'Users', icon: Users, route: '/admin/users' },
    { key: 'documents', label: 'Documents', icon: FileText, route: '/admin/documents' },
    { key: 'notifications', label: 'Notifications', icon: Bell, route: '/admin/notifications' },
    { key: 'settings', label: 'Settings', icon: Settings, route: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans ml-0 lg:ml-10">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Mobile Sidebar Toggle */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg hover:bg-gray-50 text-emerald-600 lg:hidden"
        style={{ display: isSidebarOpen ? 'none' : 'block' }}
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Sidebar - Consistent */}
      <aside className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-in-out backdrop-blur-xl border-r border-gray-200/50 flex flex-col shadow-xl bg-white/90 dark:bg-gray-800/90 ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-16 -translate-x-full lg:translate-x-0'}`}>
        <div className="relative flex items-center justify-between p-4 border-b border-gray-200/50">
          <div className={`flex items-center transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            {isSidebarOpen && <span className="ml-3 text-xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">Civix</span>}
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-lg hover:bg-gray-100 ${!isSidebarOpen ? 'mx-auto' : ''}`}>
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5 text-gray-600" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {sidebarMenu.map((item) => {
            const isActive = item.route === activeRoute;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.route)}
                className={`w-full flex items-center py-3 px-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${isSidebarOpen ? '' : 'justify-center'} ${isActive ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Icon className={`w-5 h-5 transition-all duration-200 ${isSidebarOpen ? 'mr-3' : ''} ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-emerald-600'}`} />
                {isSidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="p-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent mb-8">Platform Settings</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* General Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600" />
              System Configuration
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Maintenance Mode</span>
                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                  <input type="checkbox" name="toggle" id="toggle" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300" />
                  <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Allow New Registrations</span>
                {/* Simple toggle placeholder */}
                <span className="text-sm font-bold text-emerald-600">Enabled</span>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              Security & Access
            </h2>
            <div className="space-y-4">
              <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition flex justify-between">
                <span>Manage Admin Roles</span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
              <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition flex justify-between">
                <span>API Key Management</span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl shadow-lg transition">
            <Save className="h-5 w-5" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
