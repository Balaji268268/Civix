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


      </div>
    </div>
  );
};

export default Profile;
