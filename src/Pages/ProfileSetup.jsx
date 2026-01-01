import React, { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate, useLocation } from 'react-router-dom';
import LocationAutocomplete from '../components/common/LocationAutocomplete';
import { MapPin, User, Mail, Camera, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useProfileStatus from '../hooks/useProfileStatus';
import csrfManager from '../utils/csrfManager';

const ProfileSetup = ({ onComplete }) => {
    const { user } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();
    const locationState = useLocation();

    // Hydrate from existing backend data if available (fixes "empty form" on re-visit)
    const { profileData, refetch } = useProfileStatus();

    const [formData, setFormData] = useState({
        name: user?.fullName || '',
        email: user?.primaryEmailAddress?.emailAddress || '',
        location: '',
        department: 'General Public', // Default for now
    });

    const [coords, setCoords] = useState(null); // { lat, lng }
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [profilePreview, setProfilePreview] = useState(user?.imageUrl || null);

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.fullName || prev.name,
                email: user.primaryEmailAddress?.emailAddress || prev.email,
            }));
            setProfilePreview(user.imageUrl);
        }
    }, [user]);

    useEffect(() => {
        if (profileData) {
            setFormData(prev => ({
                ...prev,
                location: profileData.location || prev.location,
            }));
            if (profileData.coordinates) {
                setCoords(profileData.coordinates);
            }
        }
    }, [profileData]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLocationSelect = (selectedLocation) => {
        setFormData(prev => ({ ...prev, location: selectedLocation.address }));
        if (selectedLocation.lat && selectedLocation.lng) {
            setCoords({ lat: selectedLocation.lat, lng: selectedLocation.lng });
        }
    };

    const handleCoordinatesChange = (newCoords) => {
        setCoords(newCoords);
    };

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }

        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setCoords({ lat: latitude, lng: longitude });

                try {
                    // OpenStreetMap Reverse Geocoding (Free)
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                    );
                    const data = await response.json();
                    if (data && data.display_name) {
                        setFormData(prev => ({ ...prev, location: data.display_name }));
                        toast.success('Location detected!');
                    }
                } catch (error) {
                    console.error('Error fetching address:', error);
                    toast.error('Could not fetch address details, but coordinates saved.');
                    setFormData(prev => ({ ...prev, location: `${latitude}, ${longitude}` }));
                } finally {
                    setLocationLoading(false);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                toast.error('Unable to retrieve your location');
                setLocationLoading(false);
            }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!coords && !formData.location) {
            toast.error('Please select a valid location from the suggestions.');
            return;
        }

        setLoading(true);
        try {
            const token = await window.Clerk?.session?.getToken();

            const res = await csrfManager.secureFetch(`${import.meta.env.VITE_API_URL}/api/profile/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    clerkUserId: user.id,
                    email: formData.email,
                    name: formData.name,
                    location: formData.location,
                    coordinates: coords,
                    department: formData.department
                })
            });

            if (!res.ok) throw new Error('Failed to update profile');

            // Success!
            toast.success('Profile setup complete!');

            // Force refresh status
            if (onComplete) onComplete();
            await refetch();

            // Navigate back to where they came from, or dashboard
            const from = locationState.state?.from?.pathname || '/user/dashboard';
            navigate(from, { replace: true });

        } catch (error) {
            console.error(error);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = () => {
        signOut(() => navigate('/'));
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-emerald-600 p-6 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Complete Your Profile</h2>
                    <p className="text-emerald-100">Help us serve your community better</p>
                </div>

                <div className="p-8">
                    <div className="flex justify-center -mt-16 mb-4 relative">
                        <div className="relative">
                            <img
                                src={profilePreview || "https://via.placeholder.com/150"}
                                alt="Profile"
                                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover bg-gray-200"
                            />
                            <div className="absolute bottom-0 right-0 bg-emerald-500 p-1.5 rounded-full text-white cursor-pointer hover:bg-emerald-600 transition-colors">
                                <Camera size={14} />
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    id="profile-name"
                                    type="text"
                                    name="name"
                                    autoComplete="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email (Read Only) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    id="profile-email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    value={formData.email}
                                    readOnly
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Location (City/Area)
                            </label>
                            <div className="relative z-50">
                                <LocationAutocomplete
                                    onSelect={handleLocationSelect}
                                    onCoordinatesChange={handleCoordinatesChange}
                                    value={formData.location}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleUseMyLocation}
                                disabled={locationLoading}
                                className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                            >
                                {locationLoading ? (
                                    <span className="animate-spin mr-1">⌛</span>
                                ) : (
                                    <MapPin size={14} />
                                )}
                                Use my current location
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                'Saving Profile...'
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save & Continue
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-500 mb-3">Wrong account?</p>
                        <button
                            onClick={handleSignOut}
                            className="text-sm text-red-500 hover:text-red-700 font-medium underline"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSetup;
