import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import csrfManager from "../utils/csrfManager";
import AdminLayout from "../components/layout/AdminLayout";
import { format } from 'date-fns';

const AdminAllIssues = () => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        const fetchIssues = async () => {
            try {
                const response = await csrfManager.secureFetch(`/api/issues?t=${Date.now()}`);
                if (response.ok) {
                    const data = await response.json();
                    // Filter out rejected issues from main view, similar to Dashboard
                    // or keep them if this is truly "ALL" issues? 
                    // Usually "All Issues" implies active workflow. Let's show everything distinct from Archives.
                    // But maybe user wants see everything. 
                    // Let's filter out Rejected by default to match Dashboard logic, allowing Archives to handle those.
                    // Actually, "View All" usually means the operational list.
                    const activeIssues = data.filter(i => i.status !== 'Rejected');
                    setIssues(activeIssues);
                }
            } catch (error) {
                console.error("Failed to fetch issues:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchIssues();
    }, []);

    const filteredIssues = filter === 'All'
        ? issues
        : issues.filter(issue => issue.status === filter);

    if (loading) {
        return (
            <AdminLayout title="Issue Registry" subtitle="Manage all civic issues">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Issue Registry" subtitle="Manage all civic issues">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    {['All', 'Pending', 'In Progress', 'Resolved'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === status
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                <Link to="/admin" className="text-gray-500 hover:text-gray-700 font-medium text-sm flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    Back to Dashboard
                </Link>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700 text-sm text-gray-500">
                                <th className="pb-3 pl-2">ID</th>
                                <th className="pb-3">Title</th>
                                <th className="pb-3">Category</th>
                                <th className="pb-3">Priority (AI)</th>
                                <th className="pb-3">Submitted</th>
                                <th className="pb-3">Status</th>
                                <th className="pb-3 text-right pr-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredIssues.map((issue) => (
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
                                    <td className="py-4 text-gray-500 text-xs">
                                        {issue.createdAt ? format(new Date(issue.createdAt), 'MMM dd, yyyy') : 'N/A'}
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
                                        <Link to={`/admin/issues/${issue._id}`} className="text-emerald-600 hover:text-emerald-800 font-medium transition text-sm">
                                            Manage Issue
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {filteredIssues.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-gray-400">
                                        No issues found matching "{filter}" status.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 text-center text-sm text-gray-400">
                Civix Admin Panel v1.0 • Authorized Access Only
            </div>
        </AdminLayout>
    );
};

export default AdminAllIssues;
