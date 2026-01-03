import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from "@clerk/clerk-react";
import csrfManager from '../utils/csrfManager';
import { Camera, Mail, MapPin, User, Shield, Info, Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import LocationAutocomplete from '../components/common/LocationAutocomplete';

const Profile = () => {
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        location: '',
        bio: '',
        phone: ''
    });
    const [coords, setCoords] = useState(null);

    useEffect(() => {
        if (user && isLoaded) {
            fetchProfileData();
        }
    }, [user, isLoaded]);

    const fetchProfileData = async () => {
        try {
            const token = await getToken();
            const response = await csrfManager.secureFetch(`/api/profile/${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setProfileData(data);
                setFormData({
                    name: data.name || user.fullName || '',
                    email: data.email || user.primaryEmailAddress?.emailAddress || '',
                    location: data.location || '',
                    bio: data.bio || '',
                    phone: data.phone || ''
                });
                if (data.coordinates) setCoords(data.coordinates);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast.error('Failed to load profile data');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const token = await getToken();

            const backendBody = {
                clerkUserId: user.id,
                name: formData.name,
                email: formData.email,
                location: formData.location,
                coordinates: coords,
                // Add other fields if supported by backend
            };

            const response = await csrfManager.secureFetch('/api/profile/create-or-update', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(backendBody)
            });

            if (!response.ok) throw new Error('Failed to update profile');

            const data = await response.json();
            setProfileData(data);
            setIsEditing(false);
            toast.success('Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (!isLoaded || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header / Profile Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                    <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
                    <div className="px-8 pb-8">
                        <div className="relative flex items-end -mt-12 mb-6">
                            <div className="relative">
                                <img
                                    src={user.imageUrl}
                                    alt={user.fullName}
                                    className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 object-cover shadow-lg"
                                />
                                <button className="absolute bottom-0 right-0 p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors shadow-lg">
                                    <Camera className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="ml-6 mb-2 flex-1">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{formData.name}</h1>
                                        <p className="text-emerald-600 dark:text-emerald-400 font-medium">{formData.email}</p>
                                    </div>
                                    {!isEditing ? (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" /> Edit Profile
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={loading}
                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                            >
                                                {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column: Basic Info */}
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <User className="w-5 h-5 text-emerald-500" /> Personal Information
                                    </h3>
                                    <div className="space-y-4 bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl">
                                        <div className="group">
                                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Full Name</label>
                                            {isEditing ? (
                                                <input
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                                />
                                            ) : (
                                                <p className="text-gray-900 dark:text-white font-medium">{formData.name}</p>
                                            )}
                                        </div>

                                        <div className="group">
                                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                                            <p className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-gray-400" /> {formData.email}
                                            </p>
                                        </div>

                                        <div className="group">
                                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Location</label>
                                            {isEditing ? (
                                                <LocationAutocomplete
                                                    value={formData.location}
                                                    onChange={handleInputChange}
                                                    onCoordinatesChange={setCoords}
                                                    placeholder="Set your location"
                                                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                                />
                                            ) : (
                                                <p className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-gray-400" /> {formData.location || 'Not set'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Stats & Role */}
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-emerald-500" /> Role & Reputation
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-1">Current Role</p>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">{profileData?.role || 'User'}</p>
                                        </div>
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase mb-1">Trust Score</p>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">{profileData?.trustScore || 100}</p>
                                        </div>
                                    </div>

                                    {/* Gamification Teaser */}
                                    {profileData?.gamification && (
                                        <div className="mt-4 bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl border border-purple-100 dark:border-purple-800">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-bold text-purple-700 dark:text-purple-300">Level {profileData.gamification.level}</span>
                                                <span className="text-xs text-purple-600 dark:text-purple-400">{profileData.gamification.points} XP</span>
                                            </div>
                                            <div className="w-full bg-purple-200 dark:bg-purple-800 h-2 rounded-full overflow-hidden">
                                                <div className="bg-purple-500 h-full rounded-full" style={{ width: '45%' }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

<<<<<<< HEAD
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
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-green-50/40 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(16,185,129,0.08)_0%,transparent_50%)] pointer-events-none"></div>

        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            {/* Card */}
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700 overflow-hidden relative">

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
                      <label className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide">
                        <div className="p-2 rounded-xl bg-emerald-100/60 dark:bg-emerald-900/40"><User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
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
                      <label className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide">
                        <div className="p-2 rounded-xl bg-blue-100/60 dark:bg-blue-900/40"><Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
                        Email Address (Managed via Account)
                      </label>
                      <input
                        type="text"
                        value={formData.email}
                        disabled={true}
                        className="w-full px-6 py-4 rounded-2xl border-2 border-slate-200/50 key={dark:border-gray-700} bg-slate-50/50 dark:bg-gray-800/50 text-slate-500 dark:text-gray-500 cursor-not-allowed outline-none text-lg font-medium"
                      />
                    </div>

                    {/* Location */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide">
                        <div className="p-2 rounded-xl bg-purple-100/60 dark:bg-purple-900/40"><MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" /></div>
                        Location
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        disabled={!isEditing}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className={`w-full px-6 py-4 rounded-2xl border-2 outline-none transition-all duration-300 text-lg font-medium dark:text-white ${isEditing ? 'border-emerald-200 bg-white dark:bg-gray-700 dark:border-gray-600 focus:border-emerald-400' : 'border-slate-200/50 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50 text-slate-600 dark:text-gray-400'
                          }`}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4">
                    {/* Complaints */}
                    <div className="relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wide">Complaints</span>
                      </div>
                      <div className="text-2xl font-black text-gray-800 dark:text-white">{stats.complaints}</div>
                    </div>

                    {/* Trust Score (New) */}
                    <div className="relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
                        <Lock className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wide">Trust Score</span>
                      </div>
                      <div className="text-2xl font-black text-gray-800 dark:text-white">{profileData?.trustScore || 100}</div>
                    </div>

                    {/* Points */}
                    <div className="relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-2 mb-2 text-yellow-600 dark:text-yellow-400">
                        <span className="text-lg">⭐</span>
                        <span className="text-xs font-bold uppercase tracking-wide">Points</span>
                      </div>
                      <div className="text-2xl font-black text-gray-800 dark:text-white">{profileData?.gamification?.points || 0}</div>
                    </div>

                    {/* Level */}
                    <div className="relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                        <span className="text-lg">👑</span>
                        <span className="text-xs font-bold uppercase tracking-wide">Level</span>
                      </div>
                      <div className="text-2xl font-black text-gray-800 dark:text-white">{profileData?.gamification?.level || 1}</div>
                    </div>

                    {/* Badge Count */}
                    <div className="relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400">
                        <span className="text-lg">🏅</span>
                        <span className="text-xs font-bold uppercase tracking-wide">Badges</span>
                      </div>
                      <div className="text-2xl font-black text-gray-800 dark:text-white">{profileData?.gamification?.badges?.length || 0}</div>
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
=======
>>>>>>> 6dfaa0f0271f642bfb702ab31aa972d1c7f0668a
            </div>
        </div>
    );
};

export default Profile;
