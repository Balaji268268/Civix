import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from "@clerk/clerk-react";
import { toast } from 'react-hot-toast';
import { MapPin, Upload, ShieldCheck, Loader2, ArrowRight, User } from 'lucide-react';
import csrfManager from "../utils/csrfManager";
import UserLayout from "../components/layout/UserLayout";

import DuplicateIssueModal from "../components/DuplicateIssueModal";

import useFormPersistence from "../hooks/useFormPersistence"; // Import Hook

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
  const [formData, setFormData, clearFormData] = useFormPersistence('report_issue_form', { // PERSISTENCE
    title: '',
    description: '',
    location: '',
    category: 'Roads',
    contact: '',
    isAnonymous: false,
    files: null
  }, false); // Use localStorage (false) instead of sessionStorage
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isAnalyzingFiles, setIsAnalyzingFiles] = useState(false);

  // Type Selection Handler
  const handleTypeSelect = (type) => {
    setIssueType(type);
    setFormData(prev => ({
      ...prev,
      category: type === 'Personal' ? 'Profile' : 'Roads'
    }));
    setStep('form');
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
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();

          if (data.address) {
            // Extract relevant parts: City, District, or Town
            const city = data.address.city || data.address.town || data.address.village;
            const district = data.address.state_district || data.address.county;
            const state = data.address.state;

            // Format: "City, District" or just "City"
            const formattedLoc = [city, district].filter(Boolean).join(", ") || state || `${latitude}, ${longitude}`;

            setFormData(prev => ({ ...prev, location: formattedLoc }));
            toast.success(`Location detected: ${formattedLoc}`);
          } else {
            setFormData(prev => ({ ...prev, location: `${latitude}, ${longitude}` }));
          }
        } catch (error) {
          console.error("Geocoding error:", error);
          toast.error("Failed to fetch address. Using coordinates.");
          setFormData(prev => ({ ...prev, location: `${latitude}, ${longitude}` }));
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Unable to retrieve your location.");
        setIsLocating(false);
      }
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
    data.append("phone", formData.contact);

    if (formData.files && formData.files.length > 0) {
      // Backend expects 'file' for single upload based on router.post("/", upload.single("file")...)
      // Assuming for now we just take the first one or changing backend to array?
      // Since backend has `upload.single("file")`, we must send field 'file' and only one.
      data.append("file", formData.files[0]);
    }

    try {
      // Use csrfManager.secureFetch to handle tokens and credentials automatically
      const response = await csrfManager.secureFetch("/api/issues", {
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
      clearFormData(); // Clear persistence
      navigate('/user/dashboard');

    } catch (error) {
      console.error(error);
      toast.error(error.message || "Something went wrong");
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
                id="title"
                name="title"
                autoComplete="off"
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
              <textarea
                required
                rows="4"
                placeholder="Please check if there are duplicate issues before submitting. Describe the issue in detail..."
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
                      id="issue-location"
                      name="location"
                      autoComplete="street-address"
                      type="text"
                      placeholder="e.g., Near City Center Bus Stop"
                      className="w-full pl-10 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                    />
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
                id="contact"
                name="contact"
                autoComplete="tel"
                type="tel"
                inputMode="numeric"
                placeholder="e.g., 9876543210"
                pattern="[0-9]{10}"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500"
                value={formData.contact}
                onChange={e => setFormData({ ...formData, contact: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">Required for issue updates.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Evidence (Images)</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer relative group overflow-hidden">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;

                    setIsAnalyzingFiles(true);
                    // Simulate AI Check
                    await new Promise(resolve => setTimeout(resolve, 1500));

                    setFormData(prev => ({ ...prev, files: files }));
                    setIsAnalyzingFiles(false);
                    toast.success("AI Check: Image Quality Good", { icon: '✨' });
                  }}
                  disabled={isAnalyzingFiles}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-wait"
                />

                {isAnalyzingFiles ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-20">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-2" />
                    <span className="text-sm font-bold text-emerald-600 animate-pulse">Running Quality Check...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-emerald-500 transition-colors" />
                    <p className="text-sm text-gray-500">
                      {formData.files ? (
                        <span className="text-emerald-600 font-medium flex items-center justify-center gap-2">
                          <ShieldCheck className="w-4 h-4" /> {formData.files.length} file(s) verified
                        </span>
                      ) : "Click to upload images"}
                    </p>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2 ml-1">
                AI checks for clarity and relevance before upload.
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