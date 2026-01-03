import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from "@clerk/clerk-react";
import { toast } from 'react-hot-toast';
import { MapPin, Upload, ShieldCheck, Loader2, ArrowRight, User } from 'lucide-react';
import csrfManager from "../utils/csrfManager";
import UserLayout from "../components/layout/UserLayout";

import DuplicateIssueModal from "../components/DuplicateIssueModal";
import VoiceInput from '../components/VoiceInput';

const ReportIssue = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  // State for Flow
  const [step, setStep] = useState('select-type'); // select-type, form
  const [issueType, setIssueType] = useState('Public'); // Public, Personal

  // Modal State
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    category: 'Roads',
    contact: '',
    isAnonymous: false,
    files: null,
    coords: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isAnalyzingFiles, setIsAnalyzingFiles] = useState(false);
  const [aiCaption, setAiCaption] = useState(null);

  // Type Selection Handler
  const handleTypeSelect = (type) => {
    setIssueType(type);
    setFormData(prev => ({
      ...prev,
      category: type === 'Personal' ? 'Profile' : 'Roads'
    }));
    setStep('form');
  };

  const handleVoiceTranscription = (text) => {
    setFormData(prev => ({
      ...prev,
      description: prev.description ? `${prev.description}\n\n[Voice Transcript]: ${text}` : text
    }));
  };

  const categories = issueType === 'Public'
    ? ["Roads", "Electricity", "Water", "Sanitation", "Traffic", "Public Transport", "Garbage", "Other"]
    : ["Profile", "Billing", "Account Access", "Technical Support", "Feedback", "Other"];

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let location = '';
        let success = false;

        try {
          // 1. Try BigDataCloud (Free, Fast, Open Data) - Often better at locality names
          try {
            const bdcResponse = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const bdcData = await bdcResponse.json();

            if (bdcData && (bdcData.city || bdcData.locality)) {
              const locality = bdcData.locality || "";
              const city = bdcData.city || "";
              const principalSubdivision = bdcData.principalSubdivision || ""; // State

              const parts = [locality, city, principalSubdivision].filter(Boolean);
              // Remove duplicates (sometimes locality == city)
              const uniqueParts = [...new Set(parts)];

              if (uniqueParts.length > 0) {
                location = uniqueParts.join(", ");
                success = true;
              }
            }
          } catch (bdcError) {
            console.warn("BigDataCloud API failed, trying OSM...");
          }

          // 2. Fallback to OpenStreetMap (Nominatim)
          if (!success) {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();

            if (data.address) {
              const road = data.address.road || data.address.pedestrian || "";
              const area = data.address.suburb || data.address.neighbourhood || data.address.residential || "";
              const city = data.address.city || data.address.town || data.address.village || "";
              const district = data.address.state_district || data.address.county || "";
              const state = data.address.state || "";

              const parts = [area, city, district].filter(Boolean);

              if (parts.length > 0) {
                location = parts.join(", ");
              } else if (state) {
                location = state;
              }
              success = true;
            }
          }

          if (success && location) {
            setFormData(prev => ({ ...prev, location: location, coords: { lat: latitude, lng: longitude } }));
            toast.success(`Location detected: ${location}`);
          } else {
            console.log("No address found for coords:", latitude, longitude);
            setFormData(prev => ({ ...prev, location: `${latitude}, ${longitude}`, coords: { lat: latitude, lng: longitude } }));
          }
        } catch (error) {
          console.error("Geocoding error:", error);
          // If network fails (common on some networks blocking OSM), just ask user to fill it.
          // Do NOT fill with raw coords if geocoding failed, it looks ugly.
          toast.error("Could not fetch address details (Network Error). Please enter location manually.");
          setFormData(prev => ({ ...prev, coords: { lat: latitude, lng: longitude } }));
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Unable to retrieve your location.");
        setIsLocating(false);
      },
      options
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    if (formData.location) data.append("location", formData.location);
    data.append("category", formData.category);
    data.append("email", user?.primaryEmailAddress?.emailAddress || "");
    data.append("issueType", issueType);
    data.append("issueType", issueType);
    data.append("phone", formData.contact);
    if (formData.coords) {
      data.append("lat", formData.coords.lat);
      data.append("lng", formData.coords.lng);
    }

    if (formData.files && formData.files.length > 0) {
      // Backend expects 'file' for single upload based on router.post("/", upload.single("file")...)
      // Assuming for now we just take the first one or changing backend to array?
      // Since backend has `upload.single("file")`, we must send field 'file' and only one.
      data.append("file", formData.files[0]);
    }

    try {
      // Use csrfManager.secureFetch to handle tokens and credentials automatically
      const response = await csrfManager.secureFetch("http://localhost:5000/api/issues", {
        method: "POST",
        body: data
      });

      const result = await response.json();

      if (response.status === 409) {
        // Handle Duplicate
        setDuplicateData(result);
        setShowDuplicateModal(true);
        setIsSubmitting(false); // Stop loading state
        return;
      }

      if (!response.ok) throw new Error(result.error || "Failed to submit issue");

      toast.success("Issue Submitted Successfully!");
      navigate('/user/dashboard');

    } catch (error) {
      console.error(error);
      if (error.message === "Failed to fetch") {
        toast.error("Upload failed. Please refresh the page and re-select your file.", { duration: 5000 });
      } else {
        toast.error(error.message || "Something went wrong");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <UserLayout title="Report an Issue" subtitle="Help us improve our community">
      <DuplicateIssueModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        duplicateData={duplicateData}
      />

      {step === 'select-type' ? (
        <div className="max-w-4xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in zoom-in duration-300">
          {/* Public Issue Card */}
          <div
            onClick={() => handleTypeSelect('Public')}
            className="group bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg border-2 border-transparent hover:border-emerald-500 cursor-pointer transition-all duration-300 hover:shadow-emerald-500/20 hover:-translate-y-2"
          >
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MapPin className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">Public Issue</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Report problems that affect the community, such as potholes, street lights, sanitation, or traffic.
            </p>
            <div className="flex items-center text-emerald-600 font-medium group-hover:gap-2 transition-all">
              Select Public Issue <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          {/* Personal Issue Card */}
          <div
            onClick={() => handleTypeSelect('Personal')}
            className="group bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg border-2 border-transparent hover:border-blue-500 cursor-pointer transition-all duration-300 hover:shadow-blue-500/20 hover:-translate-y-2"
          >
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">Personal Issue</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Report issues related to your account, billing, specific services, or sensitive personal matters.
            </p>
            <div className="flex items-center text-blue-600 font-medium group-hover:gap-2 transition-all">
              Select Personal Issue <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </div>
      ) : (
        /* Form Step */
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 animate-in slide-in-from-right-4 duration-300">
          <button onClick={() => setStep('select-type')} className="text-sm text-gray-500 hover:text-gray-800 mb-6 flex items-center hover:-translate-x-1 transition-transform">
            <ArrowRight className="w-4 h-4 mr-1 rotate-180" /> Change Issue Type
          </button>

          <div className="mb-8 flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${issueType === 'Public' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              {issueType} Issue
            </span>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Issue Details</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Issue Title</label>
              <input
                required
                type="text"
                placeholder={issueType === 'Public' ? "e.g., Deep Pothole on Main St" : "e.g., Incorrect Bill Amount"}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Detailed Description</label>

              {/* Voice Input Module */}
              <VoiceInput onTranscribe={handleVoiceTranscription} />

              <textarea
                required
                rows="4"
                placeholder="Describe the issue... (Type or use Voice Recording above)"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> AI will check description validity and intent
              </p>
            </div>

            {issueType === 'Public' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g., Near City Center Bus Stop"
                      className="w-full pl-10 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                    />
                    <p className="text-xs text-gray-400 mt-1 pl-1">
                      Auto-location is approximate. Please edit if incorrect.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={isLocating}
                    className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    {isLocating ? "Detecting..." : "Detect"}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Contact</label>
              <input
                required
                type="tel"
                placeholder="e.g., 9876543210"
                pattern="[0-9]{10}"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500"
                value={formData.contact}
                onChange={e => setFormData({ ...formData, contact: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">Required for issue updates.</p>
            </div>

            <div>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer relative group overflow-hidden">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    setIsAnalyzingFiles(true);

                    // 1. Create FormData for Analysis
                    const formDataObj = new FormData();
                    formDataObj.append('file', file);

                    try {
                      const [analyzeRes, captionRes] = await Promise.allSettled([
                        csrfManager.secureFetch('http://localhost:5000/api/issues/analyze-image', { method: 'POST', body: formDataObj }),
                        csrfManager.secureFetch('http://localhost:5000/api/issues/generate-caption', { method: 'POST', body: formDataObj })
                      ]);

                      // Handle Classification
                      if (analyzeRes.status === 'fulfilled') {
                        const data = await analyzeRes.value.json();
                        if (data.tags && data.tags.length > 0) {
                          const mainTag = data.tags[0]; // e.g. "pothole"
                          let suggestedCat = 'Other';
                          if (['pothole', 'street', 'road', 'traffic_light'].some(t => mainTag.includes(t))) suggestedCat = 'Roads';
                          if (['garbage', 'waste', 'trash', 'ashcan'].some(t => mainTag.includes(t))) suggestedCat = 'Garbage';
                          if (['water', 'pipe', 'fountain'].some(t => mainTag.includes(t))) suggestedCat = 'Water';

                          if (suggestedCat !== 'Other') {
                            setFormData(prev => ({ ...prev, category: suggestedCat }));
                            toast.success(`AI Detected: ${mainTag} -> set to ${suggestedCat}`, { icon: '🤖' });
                          } else {
                            toast.success(`AI Detected: ${mainTag}`, { icon: '👁️' });
                          }
                        }
                      }

                      // Handle Captioning
                      if (captionRes.status === 'fulfilled') {
                        try {
                          const captionData = await captionRes.value.json();
                          if (captionData.description) {
                            setAiCaption(captionData.description);
                          }
                        } catch (e) { console.warn("Caption Parse Error", e); }
                      }

                    } catch (err) {
                      console.error("AI Analysis Failed", err);
                    }

                    // Store file
                    setFormData(prev => ({ ...prev, files: [file] }));
                    setIsAnalyzingFiles(false);
                  }}
                  disabled={isAnalyzingFiles}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-wait"
                />

                {isAnalyzingFiles ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-20">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-2" />
                    <span className="text-sm font-bold text-emerald-600 animate-pulse">AI Analyzing Image & Generating Caption...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-emerald-500 transition-colors" />
                    <p className="text-sm text-gray-500">
                      {formData.files ? (
                        <span className="text-emerald-600 font-medium flex items-center justify-center gap-2">
                          <ShieldCheck className="w-4 h-4" /> Analyzed & Ready
                        </span>
                      ) : "Click to upload & Analyze with AI"}
                    </p>
                  </>
                )}
              </div>

              {aiCaption && (
                <div className="mt-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-3 flex gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-emerald-100 dark:bg-emerald-800 p-2 rounded-lg h-fit">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">
                      AI Visual Description
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      "{aiCaption}"
                    </p>
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, description: p.description ? p.description + "\n\n" + aiCaption : aiCaption }))}
                      className="text-xs text-emerald-600 font-semibold underline mt-1 hover:text-emerald-700"
                    >
                      Add to Description
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-2 ml-1">
                Our Computer Vision model will attempt to auto-categorize and caption the issue.
              </p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Verifying & Submitting...
                  </>
                ) : (
                  "Submit Report"
                )}
              </button>
              <p className="text-center text-xs text-gray-400 mt-4">
                By submitting, you agree that your report is truthful.
              </p>
            </div>
          </form>
        </div>
      )}
    </UserLayout>
  );
};

export default ReportIssue;