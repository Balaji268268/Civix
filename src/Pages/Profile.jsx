import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  MapPin,
  AlertTriangle,
  Clock,
  Edit3,
  Save,
  Lock
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { toast } from 'react-hot-toast';
import useProfileStatus from '../hooks/useProfileStatus';
import csrfManager from '../utils/csrfManager';

const Profile = () => {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { profileData, isLoading: isProfileLoading, refetch } = useProfileStatus();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    location: '',
  });

  const [stats, setStats] = useState({
    complaints: 0,
    lastActivity: 'N/A'
  });

  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync Clerk data with form and Backend stats
  useEffect(() => {
    if (isClerkLoaded && clerkUser) {
      setFormData(prev => ({
        ...prev,
        username: clerkUser.fullName || '',
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        // If backend has a different location, prefer that, else empty
      }));
    }
  }, [isClerkLoaded, clerkUser]);

  // Sync specific backend data (Location, Stats) when available
  useEffect(() => {
    if (profileData) {
      setFormData(prev => ({
        ...prev,
        location: profileData.location || prev.location // Prefer backend location
      }));

      setStats({
        complaints: profileData.complaints || 0, // Assuming backend sends this? If not, simple default
        // If backend doesn't send 'complaints' count directly in 'profileData' (it might be in a separate fetch), 
        // we might mock it or check where it usually comes from. 
        // Looking at previous code, it was mocked: "complaints: 7".
        // Use 0 if not available, OR if useProfileStatus returns it.
        // The previous mock had it hardcoded. I will keep it safe.
        lastActivity: new Date().toLocaleDateString() // Simple fallback
      });
    }
  }, [profileData]);

  const validate = () => {
    const tempErrors = {};
    if (!formData.username.trim()) tempErrors.username = 'Name is required';
    if (!formData.location.trim()) tempErrors.location = 'Location is required';

    // Email is managed by Clerk mostly, but we allow editing here if we want to trigger email change flow? 
    // Usually changing email in Clerk requires verification. 
    // For simplicity, we might make Email READ-ONLY here and tell them to use UserButton for that.

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSave = async () => {
    if (!clerkUser) return;
    if (!validate()) {
      toast.error('Please fix validation errors');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update Clerk User (Name)
      // Note: Changing email via update() is complex (requires verification). We'll skip email update here.
      if (formData.username !== clerkUser.fullName) {
        await clerkUser.update({
          firstName: formData.username.split(' ')[0],
          lastName: formData.username.split(' ').slice(1).join(' ') || '',
        });
      }

      // 2. Update Backend
      const backendBody = {
        clerkUserId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress, // Ensure consistency
        name: formData.username,
        location: formData.location
      };

      const response = await csrfManager.secureFetch('http://localhost:5000/api/profile/create-or-update', {
        method: 'POST',
        body: JSON.stringify(backendBody)
      });

      if (!response.ok) throw new Error('Backend update failed');

      toast.success('Profile updated successfully!');
      setIsEditing(false);
      refetch(); // Refresh backend data
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // Loading State
  if (!isClerkLoaded || isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!clerkUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-green-50/40 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(16,185,129,0.08)_0%,transparent_50%)] pointer-events-none"></div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          {/* Card */}
          <div className="bg-white/60 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 overflow-hidden relative">

            {/* Header */}
            <div className="relative bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 px-8 py-10">
              <div className="relative z-10 flex items-center gap-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-white/40 shadow-2xl">
                    <img
                      src={clerkUser.imageUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="text-white">
                  <h1 className="text-3xl font-bold mb-1 drop-shadow-sm">
                    {clerkUser.fullName}
                  </h1>
                  <p className="text-emerald-50/90 text-lg font-medium drop-shadow-sm">
                    {clerkUser.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 p-8">
              <div className="space-y-8">

                {/* Form */}
                <div className="grid gap-6">
                  {/* Name */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 text-sm font-bold text-slate-700 uppercase tracking-wide">
                      <div className="p-2 rounded-xl bg-emerald-100/60"><User className="w-4 h-4 text-emerald-600" /></div>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      disabled={!isEditing}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className={`w-full px-6 py-4 rounded-2xl border-2 outline-none transition-all duration-300 text-lg font-medium ${isEditing ? 'border-emerald-200 bg-white focus:border-emerald-400' : 'border-slate-200/50 bg-slate-50/50 text-slate-600'
                        }`}
                    />
                  </div>

                  {/* Email (Read Only) */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 text-sm font-bold text-slate-700 uppercase tracking-wide">
                      <div className="p-2 rounded-xl bg-blue-100/60"><Mail className="w-4 h-4 text-blue-600" /></div>
                      Email Address (Managed via Account)
                    </label>
                    <input
                      type="text"
                      value={formData.email}
                      disabled={true}
                      className="w-full px-6 py-4 rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 text-slate-500 cursor-not-allowed outline-none text-lg font-medium"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 text-sm font-bold text-slate-700 uppercase tracking-wide">
                      <div className="p-2 rounded-xl bg-purple-100/60"><MapPin className="w-4 h-4 text-purple-600" /></div>
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      disabled={!isEditing}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className={`w-full px-6 py-4 rounded-2xl border-2 outline-none transition-all duration-300 text-lg font-medium ${isEditing ? 'border-emerald-200 bg-white focus:border-emerald-400' : 'border-slate-200/50 bg-slate-50/50 text-slate-600'
                        }`}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                  <div className="relative bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-100 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-red-100 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                      <span className="text-sm font-bold text-red-700 uppercase tracking-wide">Total Complaints</span>
                    </div>
                    <div className="text-3xl font-bold text-red-700">{stats.complaints}</div>
                  </div>

                  <div className="relative bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-100 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-emerald-100 rounded-xl"><Clock className="w-5 h-5 text-emerald-600" /></div>
                      <span className="text-sm font-bold text-emerald-700 uppercase tracking-wide">Last Active</span>
                    </div>
                    <div className="text-sm font-semibold text-emerald-700">{stats.lastActivity}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-200/50">
                  {isEditing ? (
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                    >
                      <Save className="w-5 h-5" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                    >
                      <Edit3 className="w-5 h-5" />
                      Edit Profile
                    </button>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;