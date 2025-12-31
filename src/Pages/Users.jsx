import React, { useState, useEffect } from 'react';
import { Search, Filter, User, Users as UsersIcon, Mail, Phone, MapPin, Calendar, CheckCircle, XCircle, AlertTriangle, Eye, Plus, X } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import AdminSidebar from '../components/AdminSidebar';
import csrfManager from '../utils/csrfManager';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

const Users = () => {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const usersPerPage = 10;

  // Fetch Users from Backend
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) { setLoading(false); return; }

        let query = `?`;
        if (roleFilter !== 'all') query += `role=${roleFilter}&`;
        if (searchTerm) query += `search=${encodeURIComponent(searchTerm)}&`;

        const res = await csrfManager.secureFetch(`/api/admin/users${query}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        } else {
          toast.error("Failed to fetch users");
        }
      } catch (error) {
        console.error("User fetch error:", error);
        toast.error("Error fetching users");
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, roleFilter, getToken]);


  // Helper to safely get status string
  const getSafeStatus = (user) => {
    if (!user.status) return 'active';
    if (typeof user.status === 'string') return user.status;
    if (typeof user.status === 'object') {
      return user.status.isSuspended ? 'suspended' : 'active';
    }
    return 'active';
  };

  const filteredUsers = users.filter(user => {
    const userStatus = getSafeStatus(user);
    return statusFilter === 'all' || userStatus === statusFilter;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === paginatedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(paginatedUsers.map(user => user._id));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'inactive': return <XCircle className="h-4 w-4 text-gray-400" />;
      case 'suspended': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'moderator': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'citizen': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const AddUserModal = () => {
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'citizen' });

    const handleSubmit = (e) => {
      e.preventDefault();
      toast.success(`User ${newUser.email} added/invited! (Simulation)`);
      setShowAddUserModal(false);
      // API Call would go here
    };

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Add New Citizen</h3>
            <button onClick={() => setShowAddUserModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                required
                value={newUser.name}
                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                required
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="e.g. john@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                value={newUser.role}
                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="citizen">Citizen</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="pt-4 flex gap-3">
              <button type="button" onClick={() => setShowAddUserModal(false)} className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition shadow-sm">Add User</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      <AdminSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-500 text-sm mt-1">Oversee users, roles, and permissions</p>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-200 font-medium flex items-center gap-2 transition-all"
            >
              <Plus className="h-5 w-5" />
              Add New User
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Filters Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-lg w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search citizens..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50/50 text-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl bg-gray-50/50 text-gray-700 focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl bg-gray-50/50 text-gray-700 focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="citizen">Citizens</option>
                <option value="moderator">Moderators</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 w-16">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Citizen</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan="7" className="p-12 text-center text-gray-400">Loading users...</td></tr>
                  ) : paginatedUsers.length === 0 ? (
                    <tr><td colSpan="7" className="p-12 text-center text-gray-400">No citizens found matching your search.</td></tr>
                  ) : (
                    paginatedUsers.map((user) => {
                      const safeStatus = getSafeStatus(user);
                      return (
                        <tr
                          key={user._id}
                          onClick={() => navigate(`/admin/users/${user._id}`)}
                          className="group hover:bg-emerald-50/30 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user._id)}
                              onChange={() => handleSelectUser(user._id)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 group-hover:border-emerald-200 transition-colors">
                                {user.profilePictureUrl ? (
                                  <img src={user.profilePictureUrl} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="h-5 w-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">{user.name || "N/A"}</div>
                                <div className="text-xs text-gray-500">{user.location || "N/A"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600 font-medium">{user.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getRoleColor(user.role)} capitalize`}>
                              {user.role === 'user' ? 'Citizen' : user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(safeStatus)}
                              <span className="text-sm font-medium text-gray-700 capitalize">{safeStatus}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => navigate(`/admin/users/${user._id}`)}
                              className="text-gray-400 hover:text-emerald-600 p-2 hover:bg-emerald-50 rounded-lg transition-all"
                              title="View Full Profile"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center p-6 border-t border-gray-100 bg-gray-50/30">
              <div className="text-sm text-gray-500 font-medium">
                Showing <span className="text-gray-900 font-bold">{filteredUsers.length > 0 ? startIndex + 1 : 0}</span> to <span className="text-gray-900 font-bold">{Math.min(startIndex + usersPerPage, filteredUsers.length)}</span> of <span className="text-gray-900 font-bold">{filteredUsers.length}</span> citizens
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddUserModal && <AddUserModal />}
    </div>
  );
};

export default Users;
