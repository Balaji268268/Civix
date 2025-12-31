import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser, useAuth, SignOutButton } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import useProfileStatus from '../hooks/useProfileStatus';
import csrfManager from '../utils/csrfManager';
import LocationAutocomplete from '../components/common/LocationAutocomplete';

const ProfileSetup = ({ onComplete }) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { refetch } = useProfileStatus();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    location: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState('');
  const [profileSubmitted, setProfileSubmitted] = useState(false);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.fullName || '',
        email: user.primaryEmailAddress?.emailAddress || ''
      }));
    }
  }, [user]);

  // Prevent redirect back if profile was just submitted
  useEffect(() => {
    if (profileSubmitted) {
      sessionStorage.setItem('profileJustSubmitted', 'true');
      setTimeout(() => {
        sessionStorage.removeItem('profileJustSubmitted');
      }, 5000);
    }
  }, [profileSubmitted]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.location.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      let uploadedProfileUrl = null;

      // If user selected an image, upload it first
      if (profileImageFile) {
        try {
          const fd = new FormData();
          fd.append('image', profileImageFile);
          const uploadRes = await csrfManager.secureFetch(`/api/profile/${user.id}/profile-picture`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: fd
          });

          if (!uploadRes.ok) throw new Error('Failed to upload profile picture');
          const uploadData = await uploadRes.json();
          uploadedProfileUrl = uploadData.profilePictureUrl || null;
        } catch (uploadError) {
          console.error('Profile picture upload failed:', uploadError);
          toast('Profile picture upload failed, but profile will still be saved', { icon: '⚠️' });
        }
      }

      // Get Clerk Token
      const token = await getToken();

      // Saving data...
      localStorage.setItem("profileComplete", "true");
      if (onComplete) onComplete();

      const profileResponse = await csrfManager.secureFetch('/api/profile/create-or-update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clerkUserId: user.id,
          email: formData.email,
          name: formData.name,
          location: formData.location,
          coordinates: coords,
          ...(uploadedProfileUrl ? { profilePictureUrl: uploadedProfileUrl } : {})
        })
      });

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        throw new Error(`Failed to save profile: ${profileResponse.status}`);
      }


      const profileData = await profileResponse.json();
      setProfileSubmitted(true);

      // Update the profile status hook immediately
      refetch();

      toast.success('Profile setup completed! Redirecting...');

      // FORCE RELOAD to ensure all states (App, Home, Auth) are identical
      // Check if we have a specific destination to return to
      const intendedDestination = location.state?.from?.pathname || '/';

      setTimeout(() => {
        window.location.href = intendedDestination;
      }, 1500);

    } catch (error) {
      console.error('Profile setup error:', error);
      // Show EXACT error to user for debugging
      toast.error(`Save failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setProfileImageFile(null);
      setProfileImagePreview('');
      return;
    }
    setProfileImageFile(file);
    setProfileImagePreview(URL.createObjectURL(file));
  };

  const handleUseMyLocation = async () => {
    setGeolocating(true);
    toast('Detecting your location...', { icon: '📍' });

    // Helper: Robust fetch with timeout
    const fetchWithTimeout = async (url, timeout = 3000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return await res.json();
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    };

    // Strategy 1: Browser GPS (High Precision Coords)
    const tryGPS = () => new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject('GPS Not Supported');

      const timeoutId = setTimeout(() => reject('GPS Timeout'), 6000);

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          clearTimeout(timeoutId);
          const { latitude, longitude } = pos.coords;
          const coords = { lat: latitude, lng: longitude };

          try {
            // Reverse Geocode
            // 1. Google Maps (Best)
            if (window.google && window.google.maps) {
              const geocoder = new window.google.maps.Geocoder();
              const response = await geocoder.geocode({ location: coords });
              if (response.results?.[0]) {
                const r = response.results[0];
                return resolve({ address: r.formatted_address, coords });
              }
            }

            // 2. OpenStreetMap (Free)
            const osmData = await fetchWithTimeout(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
              3000
            );

            if (osmData.address) {
              const city = osmData.address.city || osmData.address.town || osmData.address.state_district || osmData.address.county;
              const state = osmData.address.state || osmData.address.country;
              // Ensure we have a valid string, else fail reverse geo
              if (city && state) return resolve({ address: `${city}, ${state}`, coords });
              if (osmData.display_name) {
                // Fallback to first 2 parts of display name
                return resolve({ address: osmData.display_name.split(',').slice(0, 2).join(','), coords });
              }
            }

            // If Reverse Geo fails (no address found), return NULL address but KEEP coords
            return resolve({ address: null, coords });

          } catch (e) {
            // Network/API Error during Reverse Geo -> Return NULL address but KEEP coords
            return resolve({ address: null, coords });
          }
        },
        (err) => {
          clearTimeout(timeoutId);
          reject(`GPS Error: ${err.message}`);
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
      );
    });

    // Strategy 2: IP-API (Reliable City Name)
    const tryIP = async () => {
      // Try ip-api.com first
      try {
        const data = await fetchWithTimeout('http://ip-api.com/json/', 3000);
        if (data.status === 'success') {
          return {
            address: `${data.city}, ${data.regionName}, ${data.country}`,
            coords: { lat: data.lat, lng: data.lon }
          };
        }
      } catch (e) { }

      // Try ipapi.co as backup
      try {
        const data2 = await fetchWithTimeout('https://ipapi.co/json/', 3000);
        return {
          address: `${data2.city}, ${data2.region}, ${data2.country_name}`,
          coords: { lat: data2.latitude, lng: data2.longitude }
        };
      } catch (e) {
        throw new Error("IP Location failed");
      }
    };

    try {
      let finalAddress = null;
      let finalCoords = null;

      // 1. Attempt GPS
      try {
        const gpsResult = await tryGPS();
        if (gpsResult) {
          finalCoords = gpsResult.coords; // Good coords
          if (gpsResult.address) finalAddress = gpsResult.address; // Good address?
        }
      } catch (gpsErr) {
        console.warn("GPS lookup failed:", gpsErr);
      }

      // 2. If we STILL don't have a readable address (either GPS failed, or Reverse-Geo failed), use IP
      if (!finalAddress) {
        try {
          console.log("GPS Address missing. Fetching address from IP...");
          const ipResult = await tryIP();
          finalAddress = ipResult.address;
          // Only fallback Coords if GPS failed completely (i.e. we have no finalCoords yet)
          // If we have GPS coords but no address, we keep GPS coords (higher precision) + IP Address (readable)
          if (!finalCoords) finalCoords = ipResult.coords;
        } catch (ipErr) {
          console.warn("IP lookup failed:", ipErr);
        }
      }

      // 3. Final Result Check
      if (finalAddress) {
        setFormData(prev => ({ ...prev, location: finalAddress }));
        setCoords(finalCoords || null);
        toast.success(`Location set: ${finalAddress}`);
      } else {
        throw new Error("Could not determine a readable location.");
      }

    } catch (finalError) {
      console.error("Auto-locate failed:", finalError);
      if (finalError.message.includes("GPS Permission")) {
        toast.error("Please allow location access or type manually.");
      } else {
        toast.error("Could not find location name. Please type it.");
      }
    } finally {
      setGeolocating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Authentication Required</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950/20 py-6 px-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10"></div>
      <div className="relative max-w-2xl mx-auto">
        <div className="text-center mb-12 relative">
          <div className="absolute top-0 right-0">
            <SignOutButton>
              <button className="text-sm font-medium text-red-500 hover:text-red-700 underline underline-offset-4 decoration-red-200 hover:decoration-red-500 transition-all">
                Sign Out
              </button>
            </SignOutButton>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-emerald-800 dark:from-white dark:via-gray-200 dark:to-emerald-300 bg-clip-text text-transparent mb-4">
            Complete Your Profile
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">Let's get you set up</p>
        </div>

        <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-800/30 p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="group">
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">Full Name *</label>
              <input
                name="name"
                type="text"
                required
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl bg-white/80 dark:bg-gray-900/80 dark:border-gray-700 dark:text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>

            <div className="group">
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">Email Address *</label>
              <input
                name="email"
                type="email"
                required
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl bg-white/80 dark:bg-gray-900/80 dark:border-gray-700 dark:text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div className="group">
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">Location *</label>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <LocationAutocomplete
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Enter your city"
                    required={true}
                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl bg-white/80 dark:bg-gray-900/80 dark:border-gray-700 dark:text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={geolocating}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all text-sm whitespace-nowrap"
                >
                  {geolocating ? "Detecting..." : "Auto-Locate"}
                </button>
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">Profile Picture <span className="text-gray-400 font-normal ml-2">(Optional)</span></label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6"
              />
              {profileImagePreview && (
                <div className="mt-4 flex items-center gap-4">
                  <img src={profileImagePreview} alt="Preview" className="h-16 w-16 rounded-xl object-cover shadow-md" />
                  <span className="text-emerald-600 font-medium">Image selected</span>
                </div>
              )}
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-70"
              >
                {isLoading ? "Saving Profile..." : "Complete Profile Setup"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;