import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import csrfManager from "../utils/csrfManager";
import AdminLayout from "../components/layout/AdminLayout";
import { format } from 'date-fns';

const DuplicateIssues = () => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIssues = async () => {
            try {
                const response = await csrfManager.secureFetch(`http://localhost:5000/api/issues?t=${Date.now()}`);
                if (response.ok) {
                    const data = await response.json();
                    // Filter only rejected issues
                    const rejected = data.filter(issue => issue.status === 'Rejected');
                    setIssues(rejected);
                }
            } catch (error) {
                console.error("Failed to fetch issues:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchIssues();
    }, []);

    if (loading) {
        return (
            <AdminLayout title="Duplicate Archives" subtitle="Rejected & Duplicate Issues">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Duplicate Archives" subtitle="Rejected & Duplicate Issues">
            <div className="flex justify-between items-center mb-6">
                <Link to="/admin" className="flex items-center text-gray-500 hover:text-gray-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="m15 18-6-6 6-6" /></svg>
                    Back to Dashboard
                </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                        Rejected Issues ({issues.length})
                    </h2>
                </div>

                {issues.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-300 mb-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
                        <p className="text-gray-500 font-medium">No rejected issues found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700 text-sm text-gray-500">
                                    <th className="pb-3 pl-2">ID</th>
                                    <th className="pb-3">Title</th>
                                    <th className="pb-3">Category</th>
                                    <th className="pb-3">Submitted On</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3 text-right pr-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {issues.map((issue) => (
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
                                        <td className="py-4 text-gray-500">
                                            {issue.createdAt ? format(new Date(issue.createdAt), 'MMM dd, yyyy') : 'N/A'}
                                        </td>
                                        <td className="py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-red-50 text-red-700 border-red-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                Rejected
                                            </span>
                                        </td>
                                        <td className="py-4 text-right pr-2">
                                            <Link to={`/admin/issues/${issue._id}`} className="text-emerald-600 hover:text-emerald-800 font-medium transition">
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default DuplicateIssues;
