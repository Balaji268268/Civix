import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, AlertTriangle, ArrowLeft, MapPin, Calendar, Activity, XCircle } from 'lucide-react';
import csrfManager from "../utils/csrfManager";
import { format } from 'date-fns';

const IssueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dynamic History Logic - Shows only what actually happened
  const getDynamicSteps = (issue) => {
    if (!issue) return [];

    // Step 1: Always Reported
    const steps = [
      { id: 'reported', label: 'Reported', icon: Calendar, color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' }
    ];

    const hasOfficer = !!issue.assignedOfficer;
    const status = issue.status;

    // Step 2: Assigned
    if (hasOfficer || ['In Progress', 'Resolved', 'Escalated', 'Pending Review', 'Closed', 'Dispute'].includes(status)) {
      steps.push({ id: 'assigned', label: 'Assigned', icon: MapPin, color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' });
    }

    // Step 3: Officer Resolved (Pending Review)
    if (['Pending Review', 'Resolved', 'Closed', 'Dispute'].includes(status)) {
      steps.push({ id: 'officer_res', label: 'Officer Resolved', icon: CheckCircle, color: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' });
    }

    // Step 4: Final Outcome
    if (status === 'Resolved') {
      steps.push({ id: 'resolved', label: 'Verified', icon: CheckCircle, color: 'bg-emerald-500 text-white', text: 'text-emerald-600 dark:text-emerald-400 font-bold' });
    } else if (status === 'Closed') {
      steps.push({ id: 'closed', label: 'Confirmed', icon: CheckCircle, color: 'bg-green-600 text-white', text: 'text-green-700 font-bold' });
    } else if (status === 'Dispute') {
      steps.push({ id: 'dispute', label: 'Disputed', icon: AlertTriangle, color: 'bg-red-500 text-white', text: 'text-red-500 font-bold' });
    } else if (status === 'Rejected') {
      steps.push({ id: 'rejected', label: 'Rejected', icon: XCircle, color: 'bg-red-500', text: 'text-red-500 font-bold' });
    } else if (status === 'Escalated') {
      steps.push({ id: 'escalated', label: 'Escalated', icon: AlertTriangle, color: 'bg-orange-500', text: 'text-orange-500 font-bold' });
    }

    return steps;
  };



  const [estimatedDays, setEstimatedDays] = useState(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDisputeInput, setShowDisputeInput] = useState(false);

  const handleAcknowledgement = async (status) => {
    if (status === 'Disputed' && !disputeReason) {
      setShowDisputeInput(true);
      return;
    }

    setAcknowledging(true);
    try {
      const res = await csrfManager.secureFetch(`${API_BASE_URL}/api/issues/${id}/acknowledge-resolution`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status, // 'Confirmed' or 'Disputed'
          remarks: disputeReason
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setIssue(updated);
        // toast.success(status === 'Confirmed' ? "Thank you! Case closed." : "Dispute recorded. Moderator will review.");
      }
    } catch (e) {
      console.error("Acknowledgement error", e);
    } finally {
      setAcknowledging(false);
    }
  };

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        const response = await csrfManager.secureFetch(`/api/issues/${id}`);
        if (response.ok) {
          const data = await response.json();
          setIssue(data);

          // Fetch AI Prediction
          if (data.status !== 'Resolved' && data.status !== 'Rejected') {
            try {
              const predRes = await csrfManager.secureFetch(`${API_BASE_URL}/api/ml/predict-resolution-time/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  category: data.category,
                  severity: data.aiAnalysis?.priority === 'High' ? 8 : 4,
                  active_tasks: 5 // Default assumption if no officer data
                })
              });
              const predData = await predRes.json();
              setEstimatedDays(predData.estimated_days);
            } catch (e) { console.error("Prediction failed", e); }
          }

        } else {
          console.error("Failed to fetch issue details");
        }
      } catch (error) {
        console.error("Error fetching issue:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchIssue();
  }, [id]);

  if (loading) return <div className="min-h-screen flex text-emerald-600 justify-center items-center">Loading Issue Details...</div>;
  if (!issue) return <div className="min-h-screen flex justify-center items-center text-red-500">Issue not found.</div>;

  const dynamicSteps = issue ? getDynamicSteps(issue) : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 hover:text-emerald-600 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </button>

        {/* Tracking Stepper */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 mb-8 border border-gray-100 dark:border-gray-700">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Complaint Tracking</h2>
            {estimatedDays && issue.status !== 'Resolved' && (
              <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-200">
                <Clock size={12} />
                AI Estimate: Resolution in ~{estimatedDays} Days
              </div>
            )}
          </div>

          <div className="relative flex items-center justify-evenly w-full max-w-2xl mx-auto">
            {/* Background Line (connects all visible nodes) */}
            {dynamicSteps.length > 1 && (
              <div
                className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 transition-all duration-500 z-0 w-full transform scale-x-[0.8] ${issue.status === 'Rejected' ? 'bg-gradient-to-r from-emerald-500 to-red-500' :
                  issue.status === 'Escalated' ? 'bg-gradient-to-r from-emerald-500 to-orange-500' :
                    'bg-emerald-500'
                  }`}
              ></div>
            )}

            {dynamicSteps.map((step) => {
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-lg transition-all duration-300 ${step.color}`}>
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className={`mt-3 text-sm font-bold ${step.text}`}>{step.label}</span>
                </div>
              );
            })}
          </div>

          {/* Status Badge */}
          <div className="mt-8 flex justify-center">
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${issue.status === 'Rejected' ? 'bg-red-100 text-red-700' :
              issue.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                issue.status === 'Escalated' ? 'bg-orange-100 text-orange-700' :
                  issue.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
              }`}>
              Status: {issue.status}
            </span>
          </div>
        </div>

        {/* Resolution Confirmation Card (User Action Required) */}
        {issue.status === 'Resolved' && !issue.resolution?.userAcknowledgement?.status && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-3xl p-8 mb-8 shadow-lg border border-emerald-100 dark:border-emerald-800 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                  Issue Resolved?
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  The officer has marked this issue as resolved. Please review the proof below and confirm if you are satisfied.
                </p>

                {issue.resolution?.proofUrl && (
                  <img
                    src={issue.resolution.proofUrl}
                    alt="Resolution Proof"
                    className="w-full max-w-sm h-48 object-cover rounded-xl shadow-md mb-4 border-2 border-white dark:border-gray-800"
                  />
                )}
                {issue.resolution?.officerNotes && (
                  <p className="text-sm text-gray-500 italic mb-4">"Officer Note: {issue.resolution.officerNotes}"</p>
                )}
              </div>

              <div className="flex flex-col gap-3 w-full md:w-auto">
                {!showDisputeInput ? (
                  <>
                    <button
                      onClick={() => handleAcknowledgement('Confirmed')}
                      disabled={acknowledging}
                      className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition transform hover:scale-105"
                    >
                      {acknowledging ? "Processing..." : "Yes, Verified!"}
                    </button>
                    <button
                      onClick={() => setShowDisputeInput(true)}
                      disabled={acknowledging}
                      className="px-8 py-4 bg-white dark:bg-gray-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold border border-gray-200 dark:border-gray-700 transition"
                    >
                      No, Dispute
                    </button>
                  </>
                ) : (
                  <div className="w-full max-w-sm">
                    <textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Why is it not resolved?"
                      className="w-full p-3 mb-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                      rows="2"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcknowledgement('Disputed')}
                        disabled={acknowledging}
                        className="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold text-sm"
                      >
                        Submit Dispute
                      </button>
                      <button
                        onClick={() => setShowDisputeInput(false)}
                        className="px-3 py-2 text-gray-500 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Closed/Confirmed Case Banner */}
        {issue.status === 'Closed' && issue.resolution?.userAcknowledgement?.status === 'Confirmed' && (
          <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-3xl p-6 mb-8 text-center font-bold border border-green-200 dark:border-green-800">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <h2 className="text-xl">Case Successfully Closed</h2>
            <p className="text-sm font-normal opacity-80 mt-1">You confirmed this resolution on {new Date(issue.resolution.userAcknowledgement.acknowledgedAt).toLocaleDateString()}.</p>
          </div>
        )}

        {/* Details Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${issue.priority === 'High' ? 'bg-red-100 text-red-700' : issue.priority === 'Medium' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                {issue.priority} Priority
              </span>
              <span className="text-gray-400 text-sm font-mono">#{issue.complaintId || issue._id.slice(-6).toUpperCase()}</span>
            </div>

            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">{issue.title}</h1>

            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 mb-8 whitespace-pre-wrap">
              {issue.description}
            </div>

            {issue.location && (
              <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                <MapPin className="w-5 h-5 text-emerald-500 mt-1" />
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Location</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{issue.location || "Location not specified in structured data"}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-500" /> Timeline
              </h3>
              <div className="max-h-80 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                {issue.timeline && issue.timeline.slice().reverse().map((event, idx) => (
                  <div key={idx} className="relative pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${idx === 0 ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-900/30' : 'bg-gray-300 dark:bg-gray-600'}`}></div>

                    <div className="flex flex-col">
                      <span className="text-xs text-gray-400 font-medium mb-1">{format(new Date(event.timestamp), 'MMM d, yyyy • h:mm a')}</span>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug">{event.message}</p>

                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${event.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                          event.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                            event.status === 'Escalated' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-50 text-blue-600'
                          }`}>
                          {event.status}
                        </span>
                        <span className="text-[10px] text-gray-400">by {event.byUser || 'System'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Message / Polite Feedback */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
              {issue.status === 'Resolved' && (
                <div className="text-center">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">How did we do?</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Your feedback helps us improve.</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} className="text-2xl hover:scale-110 transition-transform">⭐</button>
                    ))}
                  </div>
                </div>
              )}

              {issue.status === 'Rejected' && (
                <div className="text-center">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Report Not Accepted</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    We appreciate your vigilance. Unfortunately, this report didn't meet our criteria or was a duplicate.
                    Please continue to report valid issues!
                  </p>
                </div>
              )}

              {!['Resolved', 'Rejected', 'Closed'].includes(issue.status) && (
                <div className="text-center">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Thank You for Your Patience</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Our system is processing your report. We prioritize issues based on severity and community voting.
                    We'll update you as soon as there is progress!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueDetail;