import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import csrfManager from '../utils/csrfManager';
import AdminSidebar from '../components/AdminSidebar';
import {
    User, Mail, MapPin, Calendar, Shield, Phone,
    MessageSquare, FileText, Vote, BarChart,
    ArrowLeft, CheckCircle, XCircle, AlertTriangle,
    ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminUserDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [activity, setActivity] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const token = await getToken();
                if (!token) return;
                const res = await csrfManager.secureFetch(`/api/admin/users/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                    setActivity(data.activityLog);
                } else {
                    toast.error("Failed to fetch user details");
                    navigate('/admin/users');
                }
            } catch (error) {
                console.error(error);
                toast.error("Error loading profile");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [id, getToken, navigate]);

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50">Loading profile...</div>;
    if (!user) return <div className="flex h-screen items-center justify-center bg-gray-50">User not found</div>;

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin': return 'bg-red-100 text-red-800 border-red-200';
            case 'moderator': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-green-100 text-green-800 border-green-200'; // Citizen default
        }
    };

    const getTrustScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans flex text-gray-800">
            <AdminSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

            <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
                {/* Header / Nav */}
                <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4 sticky top-0 z-30">
                    <button onClick={() => navigate('/admin/users')} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Citizen Profile</h1>
                        <p className="text-sm text-gray-500">View full activity history and status</p>
                    </div>
                </div>

                <div className="p-8 max-w-7xl mx-auto space-y-8">
                    {/* User Profile Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="h-32 bg-gradient-to-r from-emerald-600 to-teal-600 relative"></div>
                        <div className="px-8 pb-8 pt-0 relative">
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                <div className="-mt-12">
                                    <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
                                        <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                            {user.profilePictureUrl ? (
                                                <img src={user.profilePictureUrl} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="h-10 w-10 text-gray-400" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-4 text-center">
                                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)} capitalize`}>
                                            {user.role === 'user' ? 'Citizen' : user.role}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 mt-4">
                                    <h2 className="text-2xl font-bold text-gray-900">{user.name || 'Unnamed Citizen'}</h2>
                                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Mail className="h-4 w-4" /> {user.email}
                                        </div>
                                        {user.location && (
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-4 w-4" /> {user.location}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" /> Joined: {new Date(user.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Trust Score Card */}
                                <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-200 text-center min-w-[150px]">
                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Trust Score</span>
                                    <div className={`text-3xl font-bold mt-1 ${getTrustScoreColor(user.trustScore || 100)}`}>
                                        {user.trustScore || 100}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">out of 100</div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-8 border-t border-gray-200 flex gap-8">
                            {['overview', 'issues', 'polls', 'posts'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`py-4 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab
                                        ? 'border-emerald-500 text-emerald-700'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="space-y-6">
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                                            <AlertTriangle className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">{activity?.issues.length || 0}</div>
                                            <div className="text-sm text-gray-500">Reported Issues</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                            <BarChart className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">{activity?.pollsCreated.length || 0}</div>
                                            <div className="text-sm text-gray-500">Polls Created</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                                            <MessageSquare className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">{activity?.posts.length || 0}</div>
                                            <div className="text-sm text-gray-500">Community Posts</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'issues' && (
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="p-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">Reported Issues History</div>
                                {activity?.issues.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">No issues reported yet.</div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {activity?.issues.map(item => (
                                            <div key={item._id} className="p-4 hover:bg-gray-50 transition flex justify-between items-center">
                                                <div>
                                                    <div className="font-medium text-gray-900">{item.title}</div>
                                                    <div className="text-sm text-gray-500 flex gap-2 mt-1">
                                                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                                        <span>•</span>
                                                        <span className={`capitalize ${item.priority === 'High' ? 'text-red-600' : 'text-gray-600'}`}>{item.priority} Priority</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2 py-1 bg-gray-100 rounded text-xs border border-gray-200 ${item.issueType === 'Public' ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-gray-600'}`}>
                                                        {item.issueType}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${item.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'posts' && (
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="p-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">Community Posts</div>
                                {activity?.posts.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">No posts shared yet.</div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {activity?.posts.map(post => (
                                            <div key={post._id} className="p-4 hover:bg-gray-50 transition">
                                                <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
                                                {post.image && (
                                                    <img src={post.image} alt="content" className="mt-3 h-32 rounded-lg object-cover" />
                                                )}
                                                <div className="mt-3 flex gap-4 text-xs text-gray-500">
                                                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                                    <span>{post.likes.length} Likes</span>
                                                    <span>{post.comments.length} Comments</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'polls' && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="p-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">Created Polls</div>
                                    {activity?.pollsCreated.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500">No polls created.</div>
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {activity?.pollsCreated.map(poll => (
                                                <div key={poll._id} className="p-4">
                                                    <div className="font-medium text-gray-900">{poll.title}</div>
                                                    <div className="text-xs text-gray-500 mt-1">{poll.votes.reduce((a, b) => a + b, 0)} Total Votes</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminUserDetails;
