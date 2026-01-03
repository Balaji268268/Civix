import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Users, FileText, MessageCircle, TrendingUp, Calendar, MapPin, Award, AlertCircle, Home, BarChart3, Bell, Settings, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import csrfManager from "../utils/csrfManager";

import { useAuth } from "@clerk/clerk-react";
import AdminSidebar from "../components/AdminSidebar";

const Analytics = () => {
  const navigate = useNavigate();
  const { getToken } = useAuth(); // Hook for auth token
  const [timeRange, setTimeRange] = useState('7d');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState('/admin/analytics');

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiData, setAiData] = useState(null);

  // Fetch real analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = await getToken();

        if (!token) {
          console.warn("No authentication token available for analytics fetch");
          setLoading(false);
          return;
        }

        const [statsRes, aiRes] = await Promise.all([
          csrfManager.secureFetch('http://localhost:5000/api/admin/analytics', { headers: { 'Authorization': `Bearer ${token}` } }),
          csrfManager.secureFetch('http://localhost:5000/api/admin/community-insights', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }

        if (aiRes.ok) {
          const aiJson = await aiRes.json();
          setAiData(aiJson);
        }

      } catch (error) {
        console.error("Analytics fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
    // Optional: Real-time polling
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [getToken]);

  // Sidebar Menu moved to component

  const userGrowthData = [
    { month: 'Jan', users: 1200, active: 850 },
    { month: 'Feb', users: 1450, active: 980 },
    { month: 'Mar', users: 1800, active: 1200 },
    { month: 'Apr', users: 2100, active: 1450 },
    { month: 'May', users: 2650, active: 1800 },
    { month: 'Jun', users: 3200, active: 2200 },
  ];

  // Real-time Engagement Data from Backend
  const engagementData = stats?.engagement?.weeklyData || [];

  /* Use Real Category Data */
  const categoryData = stats?.issues?.byCategory?.map(c => ({
    name: c.name,
    value: c.value,
    color: `hsl(${Math.random() * 360}, 70%, 50%)`
  })) || [{ name: 'Loading...', value: 100, color: '#e5e7eb' }];

  // Real-time Activity Feed from Backend
  const recentActivity = stats?.recentActivity || [];

  const StatCard = ({ title, value, change, icon: Icon, trend }) => (
    <div className="rounded-lg shadow-sm border border-green-100 dark:border-gray-700 p-6 bg-white dark:bg-gray-800 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-1 truncate text-gray-900 dark:text-white">{value}</p>
          <div className="flex items-center mt-2">
            <TrendingUp className={`h-4 w-4 ${trend === 'up' ? 'text-green-500' : 'text-red-500'} mr-1`} />
            <span className={`text-sm ${trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {change}
            </span>
          </div>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-full">
          <Icon className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 ml-0 lg:ml-20 transition-all duration-300">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <button
        type="button"
        aria-label="Open sidebar"
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg hover:bg-gray-50 text-emerald-600 lg:hidden"
        style={{ display: isSidebarOpen ? 'none' : 'block' }}
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <AdminSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <div className="backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-b border-green-100/50 dark:border-gray-800 shadow-sm sticky top-0 z-30 transition-colors">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-emerald-700 dark:from-white dark:via-gray-200 dark:to-emerald-400 bg-clip-text text-transparent">Analytics Dashboard</h1>
              <p className="text-slate-600 dark:text-gray-400 mt-2">Monitor platform engagement and community growth</p>
            </div>
            <div className="flex items-center space-x-4">
              <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-emerald-200/60 dark:border-gray-700 rounded-xl px-4 py-2.5 text-slate-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 shadow-sm">
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 px-5 py-2.5 rounded-xl transition-all duration-200 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30">
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-8 sm:px-6 lg:px-8">

        {/* --- COMMUNITY SENTIMENT & TOPICS (AI Analysis) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Sentiment Analysis */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-emerald-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Community Sentiment</h3>
            </div>

            {aiData ? (
              <div className="space-y-6">
                {/* Sentiment Bar */}
                <div className="flex h-4 rounded-full overflow-hidden shadow-inner">
                  <div style={{ width: `${aiData.sentiment.positive}%` }} className="bg-emerald-500 hover:bg-emerald-400 transition-all cursor-help" title={`Positive: ${aiData.sentiment.positive}%`}></div>
                  <div style={{ width: `${aiData.sentiment.neutral}%` }} className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 transition-all cursor-help" title={`Neutral: ${aiData.sentiment.neutral}%`}></div>
                  <div style={{ width: `${aiData.sentiment.negative}%` }} className="bg-rose-500 hover:bg-rose-400 transition-all cursor-help" title={`Negative: ${aiData.sentiment.negative}%`}></div>
                </div>

                <div className="flex justify-between text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-gray-600 dark:text-gray-300">Positive ({aiData.sentiment.positive}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                    <span className="text-gray-600 dark:text-gray-300">Neutral ({aiData.sentiment.neutral}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <span className="text-gray-600 dark:text-gray-300">Negative ({aiData.sentiment.negative}%)</span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/20">
                  <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed font-medium">
                    💡 AI Summary: {aiData.engagement_summary || "Analyzing community interactions..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded-full w-full"></div>
                <div className="h-20 bg-gray-100 rounded-xl w-full"></div>
              </div>
            )}
          </div>

          {/* Topic Analysis */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-emerald-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <MessageCircle className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Trending Topics</h3>
            </div>

            {aiData ? (
              <div className="flex flex-wrap gap-3">
                {aiData.topics.map((topic, idx) => (
                  <div key={idx} className={`px-4 py-2 rounded-full border flex items-center gap-2 shadow-sm transition-transform hover:scale-105 cursor-default ${topic.sentiment === 'negative' ? 'bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-200' :
                    topic.sentiment === 'positive' ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200' :
                      'bg-gray-50 border-gray-100 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
                    }`}>
                    <span className="font-bold"># {topic.name}</span>
                    <span className="bg-white dark:bg-black/20 px-1.5 rounded text-xs font-mono opacity-70">{topic.count}</span>
                  </div>
                ))}
                {aiData.topics.length === 0 && <p className="text-gray-500">No trending topics yet.</p>}
              </div>
            ) : (
              <div className="flex gap-2 animate-pulse">
                <div className="h-8 w-20 bg-gray-200 rounded-full"></div>
                <div className="h-8 w-24 bg-gray-200 rounded-full"></div>
                <div className="h-8 w-16 bg-gray-200 rounded-full"></div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard title="Total Users" value={stats?.users?.total || 0} change={stats?.users?.active + " Active"} trend="up" icon={Users} />
          <StatCard title="Active Issues" value={stats?.issues?.pending || 0} change="Live" trend="up" icon={FileText} />
          <StatCard title="Resolutions" value={stats?.issues?.resolved || 0} change="Total" trend="up" icon={Award} />
          <StatCard title="Total Votes" value={stats?.engagement?.totalVotes || 0} change="Live" trend="up" icon={MessageCircle} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="lg:col-span-2 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-green-100/50 dark:border-gray-700 shadow-xl shadow-green-100/20 dark:shadow-none p-6 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Issue Trends (Last 7 Days)</h3>
              <div className="flex items-center space-x-6 text-sm mt-2 sm:mt-0">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2 shadow-sm"></div>
                  <span className="text-slate-600 dark:text-gray-400">Total Reported</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-2 shadow-sm"></div>
                  <span className="text-slate-600 dark:text-gray-400">Resolved</span>
                </div>
              </div>
            </div>
            {stats?.issues?.timeSeries?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.issues.timeSeries}>
                  <defs>
                    <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={(str) => str.slice(5)} />
                  <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #d1fae5', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} />
                  <Area type="monotone" dataKey="total" stroke="#059669" fill="url(#totalGradient)" strokeWidth={2} name="Total Issues" />
                  <Area type="monotone" dataKey="resolved" stroke="#34d399" fill="url(#activeGradient)" strokeWidth={2} name="Resolved" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                No data for the last 7 days.
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-green-100/50 dark:border-gray-700 shadow-xl shadow-green-100/20 dark:shadow-none p-6 transition-colors">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Discussion Categories</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={3} dataKey="value">
                  {categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {categoryData.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-emerald-50/50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-3 shadow-sm" style={{ backgroundColor: category.color }}></div>
                    <span className="text-sm text-slate-600 dark:text-gray-300 font-medium truncate max-w-[120px]" title={category.name}>{category.name}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-gray-200">{category.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-green-100/50 dark:border-gray-700 shadow-xl shadow-green-100/20 dark:shadow-none p-6 transition-colors">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Weekly Engagement</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #d1fae5', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="posts" fill="#059669" radius={[4, 4, 0, 0]} name="New Posts" />
                <Bar dataKey="comments" fill="#10b981" radius={[4, 4, 0, 0]} name="Comments" />
                <Bar dataKey="votes" fill="#34d399" radius={[4, 4, 0, 0]} name="Polls/Votes" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-green-100/50 dark:border-gray-700 shadow-xl shadow-green-100/20 dark:shadow-none p-6 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Recent Activity</h3>
              <button className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm font-medium transition-colors">View All</button>
            </div>
            <div className="space-y-3">
              {recentActivity.length === 0 ? <p className="text-center text-gray-500 dark:text-gray-400 py-4">No recent activity.</p> :
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 bg-gradient-to-r from-emerald-50/60 to-green-50/40 dark:from-gray-700/60 dark:to-gray-700/40 rounded-xl border border-emerald-100/30 dark:border-gray-600/30 hover:shadow-md transition-all duration-200">
                    <div className="flex-shrink-0 p-2 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-emerald-200/50 dark:border-gray-600/50">
                      {activity.type === 'new_post' && <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                      {activity.type === 'comment' && <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                      {activity.type === 'vote' && <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                      {activity.type === 'new_user' && <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 dark:text-gray-200"><span className="font-semibold">{activity.user}</span> {activity.action}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-green-100/50 dark:border-gray-700 shadow-xl shadow-green-100/20 dark:shadow-none p-6 hover:shadow-2xl hover:shadow-green-200/30 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-emerald-500/10 to-green-500/20 dark:from-emerald-500/20 dark:to-green-500/30 rounded-xl mr-4">
                <MapPin className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-gray-400">Contact Queries</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats?.contact?.pending || 0}</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Pending Reply</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-green-100/50 dark:border-gray-700 shadow-xl shadow-green-100/20 dark:shadow-none p-6 hover:shadow-2xl hover:shadow-green-200/30 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-emerald-500/10 to-green-500/20 dark:from-emerald-500/20 dark:to-green-500/30 rounded-xl mr-4">
                <Calendar className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-gray-400">Lost & Found</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats?.lostFound?.lost || 0}</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{stats?.lostFound?.found || 0} items found</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-green-100/50 dark:border-gray-700 shadow-xl shadow-green-100/20 dark:shadow-none p-6 hover:shadow-2xl hover:shadow-amber-200/30 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-amber-500/10 to-orange-500/20 dark:from-amber-500/20 dark:to-orange-500/30 rounded-xl mr-4">
                <AlertCircle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-gray-400">Moderation Queue</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">8</p>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Requires attention</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default Analytics;
