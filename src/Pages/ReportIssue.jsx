import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from "@clerk/clerk-react";
import { toast } from 'react-hot-toast';
import {
  MapPin,
  Upload,
  ShieldCheck,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Send,
  Building2,
  User,
  Sparkles,
  Info
} from 'lucide-react';
import csrfManager from "../utils/csrfManager";
import UserLayout from "../components/layout/UserLayout";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import Select from "../components/ui/Select";
import Card from "../components/ui/Card";
import DuplicateIssueModal from "../components/DuplicateIssueModal";
import VoiceInput from '../components/VoiceInput';
import useFormPersistence from "../hooks/useFormPersistence";
import { PUBLIC_CATEGORIES, PERSONAL_CATEGORIES } from '../constants/categories';

const ReportIssue = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();

  // 2-Step Flow: 'classify' -> 'details'
  const [step, setStep] = useState('classify');
  const [issueType, setIssueType] = useState('Public'); // 'Public' or 'Personal'

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);

  // Form State with Persistence
  const [formData, setFormData, clearFormData] = useFormPersistence('report_issue_form', {
    title: '',
    description: '',
    location: '',
    category: 'roads',
    contact: '',
    isAnonymous: false,
    files: null,
    coords: null
  }, false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleTypeSelect = (type) => {
    setIssueType(type);
    setFormData(prev => ({
      ...prev,
      category: type === 'Personal' ? 'billing' : 'roads'
    }));
  };

  const handleVoiceTranscription = (text) => {
    setFormData(prev => ({
      ...prev,
      description: prev.description ? `${prev.description}\n\n[Voice Transcript]: ${text}` : text
    }));
  };

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
          const bdcResponse = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const bdcData = await bdcResponse.json();

          const locality = bdcData.locality || bdcData.city || "Detected Location";
          const principalSubdivision = bdcData.principalSubdivision || "";
          const locString = [locality, principalSubdivision].filter(Boolean).join(", ");

          setFormData(prev => ({
            ...prev,
            location: locString,
            coords: { lat: latitude, lng: longitude }
          }));
          toast.success("Location detected!");
        } catch (err) {
          setFormData(prev => ({
            ...prev,
            location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            coords: { lat: latitude, lng: longitude }
          }));
          toast.success("Coordinates captured.");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        toast.error("Could not retrieve your location. Please enter manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error("Image file must be under 8 MB");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("Title and description are required.");
      return;
    }

    const email = user?.primaryEmailAddress?.emailAddress || formData.contact;
    const phone = user?.primaryPhoneNumber?.phoneNumber || formData.contact || "9876543210";

    if (!email) {
      toast.error("Please provide your contact email.");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = new FormData();
      data.append("title", formData.title.trim());
      data.append("description", formData.description.trim());
      data.append("email", email);
      data.append("phone", phone);
      data.append("category", formData.category);
      data.append("issueType", issueType);
      data.append("isPrivate", String(issueType === 'Personal'));
      data.append("location", formData.location || "");

      if (formData.coords) {
        data.append("lat", formData.coords.lat);
        data.append("lng", formData.coords.lng);
      }

      if (selectedFile) {
        data.append("file", selectedFile);
      }

      let headers = {};
      try {
        const token = await getToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      } catch (tokenErr) {
        // Token retrieval failure is non-blocking
      }

      const response = await csrfManager.secureFetch("/api/v1/issues", {
        method: "POST",
        headers,
        body: data
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit report");
      }

      toast.success("Report submitted! AI verification queued.");
      clearFormData();
      navigate("/user/dashboard");
    } catch (err) {
      toast.error(err.message || "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategories = issueType === 'Public' ? PUBLIC_CATEGORIES : PERSONAL_CATEGORIES;

  return (
    <UserLayout title="Report an Issue">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Report a Civic Issue
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Submit municipal concerns directly to departmental response crews.
          </p>
        </div>

        {/* 2-Step Progress Indicator */}
        <div className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => setStep('classify')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              step === 'classify'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
            <span>Category & Location</span>
          </button>

          <div className="h-px w-8 bg-slate-200 dark:bg-slate-700" />

          <button
            type="button"
            onClick={() => setStep('details')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              step === 'details'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
            <span>Details & Evidence</span>
          </button>
        </div>

        {/* Main Content Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {step === 'classify' ? (
            <Card padding="normal" className="space-y-6">
              
              {/* Type Switcher */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">
                  Complaint Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTypeSelect('Public')}
                    className={`p-3.5 rounded-lg border text-left flex items-start gap-3 transition-all ${
                      issueType === 'Public'
                        ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-sm font-bold block">Public Civic Issue</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Roads, lights, sanitation, water, drainage</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeSelect('Personal')}
                    className={`p-3.5 rounded-lg border text-left flex items-start gap-3 transition-all ${
                      issueType === 'Personal'
                        ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <User className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-sm font-bold block">Personal Request</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Billing, account access, technical help</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Department Category Select */}
              <Field label="Department Category" required>
                <Select
                  options={activeCategories.map(c => ({ value: c.id, label: c.label }))}
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                />
              </Field>

              {/* Location Picker */}
              <Field
                label="Incident Location"
                helperText="Specify the landmark, road, or use GPS detection."
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Near M.G. Road Bus Stand"
                    value={formData.location || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                  <Button
                    variant="secondary"
                    size="md"
                    loading={isLocating}
                    onClick={detectLocation}
                    iconLeft={<MapPin className="w-4 h-4 text-teal-600" />}
                  >
                    Locate Me
                  </Button>
                </div>
              </Field>

              {/* Step 1 CTA */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setStep('details')}
                  iconRight={<ArrowRight className="w-4 h-4" />}
                >
                  Continue to Details
                </Button>
              </div>
            </Card>
          ) : (
            <Card padding="normal" className="space-y-6">
              
              {/* Title */}
              <Field label="Issue Title" required helperText="A clear, concise summary of the problem.">
                <input
                  type="text"
                  placeholder="e.g. Deep pothole causing skidding near hospital gate"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </Field>

              {/* Description + Voice Input */}
              <Field label="Detailed Description" required helperText="Describe the severity, exact spot, and how long the issue has persisted.">
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    placeholder="Provide full context for municipal officers..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-y"
                  />
                  <div className="flex items-center justify-between">
                    <VoiceInput onTranscript={handleVoiceTranscription} />
                    <span className="text-xs text-slate-400">
                      {formData.description.length} characters
                    </span>
                  </div>
                </div>
              </Field>

              {/* Photo Evidence Upload */}
              <Field label="Photo Evidence (Optional, Recommended)" helperText="Clear photos of the problem speed up verification.">
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center hover:border-teal-500/60 transition-colors">
                  {previewUrl ? (
                    <div className="space-y-3">
                      <img
                        src={previewUrl}
                        alt="Evidence preview"
                        className="max-h-48 mx-auto rounded-md object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                      >
                        Remove Photo
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-2">
                      <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-full text-teal-600">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Click to upload photo evidence
                      </span>
                      <span className="text-xs text-slate-400">
                        PNG, JPG or WebP up to 8 MB
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </Field>

              {/* Honeypot Spam Field (Hidden from real users) */}
              <input
                type="text"
                name="website"
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
              />

              {/* Notice Banner */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>
                  <strong>AI Verification Policy:</strong> Automated category, quality, and duplicate screening runs asynchronously post-submission without delaying your ticket.
                </span>
              </div>

              {/* Step 2 Actions */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setStep('classify')}
                  iconLeft={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </Button>

                <Button
                  variant="primary"
                  size="lg"
                  type="submit"
                  loading={isSubmitting}
                  iconLeft={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                >
                  Submit Report
                </Button>
              </div>
            </Card>
          )}
        </form>

        {showDuplicateModal && duplicateData && (
          <DuplicateIssueModal
            isOpen={showDuplicateModal}
            onClose={() => setShowDuplicateModal(false)}
            data={duplicateData}
          />
        )}
      </div>
    </UserLayout>
  );
};

export default ReportIssue;