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

    // Step 2: Assigned (Only if officer assigned OR status implies it happened)
    // If Rejected but NO officer, this step is skipped.
    if (hasOfficer || status === 'In Progress' || status === 'Resolved' || status === 'Escalated') {
      steps.push({ id: 'assigned', label: 'Assigned', icon: MapPin, color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' });
    }

    // Step 3: Final Outcome (If reached)
    if (status === 'Resolved') {
      steps.push({ id: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' });
    } else if (status === 'Rejected') {
      steps.push({ id: 'rejected', label: 'Rejected', icon: XCircle, color: 'bg-red-500', text: 'text-red-500 font-bold' });
    } else if (status === 'Escalated') {
      steps.push({ id: 'escalated', label: 'Escalated', icon: AlertTriangle, color: 'bg-orange-500', text: 'text-orange-500 font-bold' });
    }

    return steps;
  };

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        const response = await csrfManager.secureFetch(`http://localhost:5000/api/issues/${id}`);
        if (response.ok) {
          const data = await response.json();
          setIssue(data);
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
          <h2 className="text-2xl font-bold mb-8 text-center text-gray-800 dark:text-gray-100">Complaint Tracking</h2>

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

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" /> AI Insights
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Category</span>
                  <span className="font-medium text-gray-900 dark:text-white">{issue.category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Confidence</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(issue.fakeConfidence * 100).toFixed(1)}%</span>
                </div>
                {issue.isFake && (
                  <div className="p-2 bg-red-100 text-red-700 text-xs font-bold rounded text-center">
                    Marked as Potentially Fake
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueDetail;