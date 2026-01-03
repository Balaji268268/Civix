import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import csrfManager from '../utils/csrfManager'; // Import csrfManager
import {
  Database, Shield, Moon, Sun, Download, Bell,
  Lock, AlertTriangle, Save, RefreshCw, Mail, Smartphone
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const Settings = () => {
  // --- State Management ---
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    newRegistrations: true,
    emailAlerts: true,
    pushNotifications: false
  });
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  // --- Effects ---
  useEffect(() => {
    // Apply theme on mount/change
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await csrfManager.secureFetch('http://localhost:5000/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error("Failed to load settings", err);
        toast.error("Failed to load current settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // --- Handlers ---
  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await csrfManager.secureFetch('http://localhost:5000/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        toast.success("Settings saved successfully!");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (err) {
      console.error("Save error", err);
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    toast.loading("Preparing system export...", { id: 'export' });
    try {
      const token = localStorage.getItem('token'); // Raw fetch for file download usually easier than wrapper if blob needed
      const response = await fetch('http://localhost:5000/api/admin/export', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `civix_system_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Export downloaded!", { id: 'export' });
    } catch (err) {
      console.error("Export error", err);
      toast.error("Failed to export data", { id: 'export' });
    }
  };

  return (
    <AdminLayout title="Platform Settings" subtitle="Configure system preferences and operations">
      <div className="space-y-8 pb-10">

        {/* 1. Appearance Section */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            {theme === 'light' ? <Sun className="w-5 h-5 text-orange-500" /> : <Moon className="w-5 h-5 text-purple-500" />}
            Appearance
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Interface Theme</p>
              <p className="text-sm text-gray-500">Toggle between light and dark modes.</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${theme === 'dark' ? 'bg-emerald-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-sm ${theme === 'dark' ? 'translate-x-9' : 'translate-x-1'}`} />
            </button>
          </div>
        </section>

        {/* 2. System Configuration */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-500" />
            System Configuration
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
              <div className="flex gap-4">
                <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg h-fit"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
                <div>
                  <p className="font-medium">Maintenance Mode</p>
                  <p className="text-sm text-gray-500">Disable user access for maintenance.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.maintenanceMode} onChange={() => handleToggle('maintenanceMode')} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg h-fit"><Users className="w-5 h-5 text-blue-500" /></div>
                <div>
                  <p className="font-medium">New User Registrations</p>
                  <p className="text-sm text-gray-500">Allow new users to sign up.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.newRegistrations} onChange={() => handleToggle('newRegistrations')} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>
        </section>

        {/* 3. Notifications */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-500" />
            Notifications
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => handleToggle('emailAlerts')}
              className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${settings.emailAlerts ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-gray-200 dark:border-gray-700'}`}
            >
              <Mail className={`w-5 h-5 ${settings.emailAlerts ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div className="text-left">
                <p className="font-bold text-sm">Email Alerts</p>
                <p className="text-xs text-gray-500">Receive critical updates via email</p>
              </div>
            </button>

            <button
              onClick={() => handleToggle('pushNotifications')}
              className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${settings.pushNotifications ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-gray-200 dark:border-gray-700'}`}
            >
              <Smartphone className={`w-5 h-5 ${settings.pushNotifications ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div className="text-left">
                <p className="font-bold text-sm">Push Notifications</p>
                <p className="text-xs text-gray-500">Mobile app push alerts</p>
              </div>
            </button>
          </div>
        </section>

        {/* 4. Data Management */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-500" />
            Data Management
          </h3>
          <div className="flex items-center justify-between">
            <div className="max-w-md">
              <p className="font-medium">Export System Data</p>
              <p className="text-sm text-gray-500 mt-1">Download a CSV report of all issues, users, and resolution stats.</p>
            </div>
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-lg font-medium transition"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </section>

        {/* Save Action */}
        <div className="sticky bottom-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl shadow-lg shadow-emerald-500/30 font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {saving ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>

      </div>
    </AdminLayout>
  );
};

export default Settings;
// Helper component for icon
const Users = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
