import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import csrfManager from "../utils/csrfManager";
import { toast } from "react-hot-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AdminLayout from "../components/layout/AdminLayout";
import { useAuth } from "@clerk/clerk-react";
import TrendingFeed from "./TrendingFeed";

const AdminDashboard = () => {
  const { getToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentIssues, setRecentIssues] = useState([]);
  /* Duplicate Modal State */
  const [duplicateResult, setDuplicateResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, issuesRes] = await Promise.all([
          csrfManager.secureFetch(`http://localhost:5000/api/admin/stats?t=${Date.now()}`),
          csrfManager.secureFetch(`http://localhost:5000/api/issues?t=${Date.now()}`)
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }

        if (issuesRes.ok) {
          const data = await issuesRes.json();
          // Filter out rejected issues from main view
          const activeIssues = data.filter(i => i.status !== 'Rejected');
          setRecentIssues(activeIssues.slice(0, 5));
        }
        setLoading(false);
      } catch (error) {
        console.error("Admin fetch error:", error);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-center py-20 text-emerald-600 font-medium text-lg">Loading Admin Dashboard...</div>;

  const chartData = stats?.issuesByCategory?.map(item => ({
    name: item._id,
    count: item.count
  })) || [];

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  /* Duplicate Modal State */

  const handleCheckSimilar = async (issueId) => {
    const toastId = toast.loading("Checking for duplicates...");
    try {
      const response = await csrfManager.secureFetch(`http://localhost:5000/api/admin/check-duplicates/${issueId}`);
      const data = await response.json();

      if (response.ok) {
        if (data.count > 0) {
          toast.success(`Found ${data.count} similar issue(s)!`, { id: toastId });
          setDuplicateResult(data);
          setSelectedIssueId(issueId);
          setIsModalOpen(true);
        } else {
          toast.success("No similar issues found.", { id: toastId });
        }
      } else {
        throw new Error(data.error || "Check failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to check duplicates", { id: toastId });
    }
  };

  const handleRejectDuplicate = async () => {
    if (!selectedIssueId) return;
    const toastId = toast.loading("Rejecting duplicate...");
    try {
      // 1. Get the auth token securely using Clerk's useAuth hook
      // 1. Get the auth token securely using Clerk's useAuth hook
      const token = await getToken();

      if (!token) {
        toast.error("Authentication failed. Please reload.");
        return;
      }

      const response = await csrfManager.secureFetch(`http://localhost:5000/api/issues/${selectedIssueId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newStatus: 'Rejected' })
      });

      if (response.ok) {
        toast.success("Issue Rejected!", { id: toastId });
        closeModal();
        // Refresh local data
        setRecentIssues(prev => prev.map(i => i._id === selectedIssueId ? { ...i, status: 'Rejected' } : i));
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update status");
      }
    } catch (error) {
      console.error(error);
      toast.error(`Error: ${error.message}`, { id: toastId });
    }
  };

  /* Helper to close modal */
  const closeModal = () => {
    setIsModalOpen(false);
    setDuplicateResult(null);
    setSelectedIssueId(null);
  };

  return (
    <AdminLayout title="Admin Dashboard" subtitle="Overview & Statistics">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard title="Total Issues" value={stats?.totalIssues} color="bg-blue-100 text-blue-800" />
        <StatCard title="Pending" value={stats?.statusCounts?.Pending} color="bg-yellow-100 text-yellow-800" />
        <StatCard title="Resolved" value={stats?.statusCounts?.Resolved} color="bg-green-100 text-green-800" />
        <StatCard title="High Priority" value={stats?.highPriority} color="bg-red-100 text-red-800" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-6">Issues Overview by Category</h2>
          <div className="h-64 cursor-default">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights & Escalation */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4">Escalation Watch</h2>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/50 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <h3 className="font-bold text-red-700 dark:text-red-400">High Priority Pending</h3>
              </div>
              <p className="text-3xl font-extrabold text-red-800 dark:text-red-200">{stats?.highPriority}</p>
              <p className="text-xs text-red-600/80 mt-1">Require immediate attention</p>
            </div>
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
              <h3 className="font-bold text-indigo-700 dark:text-indigo-400 mb-2">Trusted Users</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-indigo-800 dark:text-indigo-200">{stats?.trustedUsers}</p>
                <span className="text-xs text-indigo-600/80">score &gt; 150</span>
              </div>
            </div>
            {/* Live Trending Feed */}
            <div className="mt-6">
              <TrendingFeed />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Issues Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Recent Incoming Issues</h2>
          <div className="flex gap-4">
            <Link to="/admin/duplicates" className="text-gray-500 hover:text-gray-700 font-medium text-sm flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
              View Rejected Archives
            </Link>
            <Link to="/admin/issues" className="text-emerald-600 font-medium hover:text-emerald-700 text-sm">View All Issues &rarr;</Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-sm text-gray-500">
                <th className="pb-3 pl-2">ID</th>
                <th className="pb-3">Title</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Priority (AI)</th>
                <th className="pb-3">Fake Risk</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {recentIssues.map((issue) => (
                <tr key={issue._id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                  <td className="py-4 pl-2 font-mono text-xs text-gray-400">
                    {issue.complaintId || issue._id.slice(-6).toUpperCase()}
                  </td>
                  <td className="py-4 font-medium max-w-xs truncate pr-4">
                    {issue.title}
                    <div className="text-xs text-gray-400 font-normal truncate">{issue.description.substring(0, 30)}...</div>
                  </td>
                  <td className="py-4">
                    <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">
                      {issue.category}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${issue.priority === 'High' ? 'bg-red-100 text-red-700' :
                      issue.priority === 'Medium' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                      {issue.priority}
                    </span>
                  </td>
                  <td className="py-4">
                    {issue.isFake ? (
                      <div className="flex items-center gap-1 text-red-600">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="font-bold text-xs">{(issue.fakeConfidence * 100).toFixed(0)}% Fake</span>
                      </div>
                    ) : (
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">Verified</span>
                    )}
                  </td>
                  <td className="py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${issue.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      issue.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${issue.status === 'Resolved' ? 'bg-emerald-500' :
                        issue.status === 'Pending' ? 'bg-amber-500' :
                          'bg-blue-500'
                        }`} />
                      {issue.status}
                    </span>
                  </td>
                  <td className="py-4 text-right pr-2">
                    <button
                      onClick={() => handleCheckSimilar(issue._id)}
                      className="text-blue-500 hover:text-blue-700 mr-3 text-xs font-medium"
                      title="Check for duplicate issues"
                    >
                      Check Similar
                    </button>
                    <Link to={`/admin/issues/${issue._id}`} className="text-emerald-600 hover:text-emerald-800 font-medium transition mr-3">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-gray-400">
        Civix Admin Panel v1.0 • Authorized Access Only
      </div>

      {/* Duplicate Detection Modal */}
      {isModalOpen && duplicateResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2h-6v7.46l3.2 2.13a1 1 0 0 0 1.6 0L20 9.47V2.5a.5.5 0 0 0-.5-.5Z" /></svg>
                  </span>
                  Potential Duplicates Found
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Found {duplicateResult.count} similar issue(s) in the database.
                </p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 18 18" /></svg>
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {duplicateResult.matches.map((match, idx) => (
                <div key={idx} className="group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-900/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-emerald-700 transition-colors">
                      {match.title}
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${match.score > 0.85 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                      {(match.score * 100).toFixed(0)}% Match
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mb-3">Ref: {match.issue_id}</p>
                  <Link
                    to={`/admin/issues/${match.issue_id}`}
                    target="_blank"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline gap-1"
                  >
                    View Original Issue &rarr;
                  </Link>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-between gap-3">
              <button
                onClick={handleRejectDuplicate}
                className="px-5 py-2.5 rounded-xl font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 18 18" /></svg>
                Reject as Duplicate
              </button>
              <button
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

const StatCard = ({ title, value, color }) => (
  <div className={`p-6 rounded-2xl shadow-sm ${color.split(" ")[0]} dark:bg-opacity-20`}>
    <p className={`text-sm font-medium opacity-80 ${color.split(" ")[1]} dark:text-gray-300`}>{title}</p>
    <p className={`text-4xl font-extrabold mt-2 ${color.split(" ")[1]} dark:text-white`}>{value ?? 0}</p>
  </div>
);

export default AdminDashboard;
