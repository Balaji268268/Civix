import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import csrfManager from '../../utils/csrfManager';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'react-hot-toast';
import { User, Shield, Briefcase, Search, Plus, Edit2, Check, X, Filter } from 'lucide-react';

const UserManagement = () => {
    const { getToken } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // Modals
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Forms
    const [editForm, setEditForm] = useState({ role: '', department: '' });
    const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'user', department: '' });

    useEffect(() => {
        fetchUsers();
    }, [roleFilter]); // Refetch on filter change

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            let url = '/api/admin/users?';
            if (roleFilter !== 'all') url += `role=${roleFilter}&`;
            if (searchTerm) url += `search=${searchTerm}`;

            const res = await csrfManager.secureFetch(url, { headers });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers ---

    const handleEditClick = (user) => {
        setSelectedUser(user);
        setEditForm({ role: user.role, department: user.department || '' });
        setIsEditOpen(true);
    };

    const handleUpdateRole = async (e) => {
        e.preventDefault();
        try {
            const token = await getToken();
            const res = await csrfManager.secureFetch(`/api/admin/users/${selectedUser._id}/role`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editForm)
            });

            if (res.ok) {
                toast.success("User updated successfully");
                setIsEditOpen(false);
                fetchUsers(); // Refresh list
            } else {
                toast.error("Update failed");
            }
        } catch (err) {
            toast.error("Error updating user");
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const token = await getToken();
            const res = await csrfManager.secureFetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(createForm)
            });

            if (res.ok) {
                toast.success("User created successfully!");
                setIsCreateOpen(false);
                setCreateForm({ name: '', email: '', password: '', role: 'user', department: '' });
                fetchUsers();
            } else {
                const data = await res.json();
                toast.error(data.error || "Creation failed");
            }
        } catch (err) {
            toast.error("Error creating user");
        }
    };

    // --- Render Helpers ---

    const getRoleBadge = (role) => {
        switch (role) {
            case 'admin': return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold border border-purple-200">Admin</span>;
            case 'moderator': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold border border-blue-200">Moderator</span>;
            case 'officer': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold border border-amber-200">Officer</span>;
            default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200">User</span>;
        }
    };

    return (
        <AdminLayout title="User Management" subtitle="Manage roles, permissions, and accounts">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">

                {/* Controls */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                            />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="all">All Roles</option>
                            <option value="user">User</option>
                            <option value="officer">Officer</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-md hover:shadow-lg"
                    >
                        <Plus size={18} /> Add User
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700 text-sm text-gray-500">
                                <th className="pb-3 pl-2">User</th>
                                <th className="pb-3">Role</th>
                                <th className="pb-3">Department</th>
                                <th className="pb-3">Location</th>
                                <th className="pb-3 text-right pr-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-8 text-gray-400">Loading users...</td></tr>
                            ) : users.map(user => (
                                <tr key={user._id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                    <td className="py-3 pl-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs uppercase overflow-hidden">
                                                {user.profilePictureUrl ? <img src={user.profilePictureUrl} alt="" className="w-full h-full object-cover" /> : user.email[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{user.name || "Unnamed"}</p>
                                                <p className="text-xs text-gray-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3">{getRoleBadge(user.role)}</td>
                                    <td className="py-3 text-gray-600">
                                        {user.department ? (
                                            <span className="flex items-center gap-1"><Briefcase size={12} /> {user.department}</span>
                                        ) : '-'}
                                    </td>
                                    <td className="py-3 text-gray-500 truncate max-w-[150px]">{user.location || '-'}</td>
                                    <td className="py-3 text-right pr-4">
                                        <button
                                            onClick={() => handleEditClick(user)}
                                            className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition"
                                            title="Edit Role"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- Edit User Modal --- */}
            {isEditOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Shield className="text-emerald-600" size={20} /> Edit Role: {selectedUser.name}
                        </h3>
                        <form onSubmit={handleUpdateRole} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Role</label>
                                <select
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    value={editForm.role}
                                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                >
                                    <option value="user">User</option>
                                    <option value="moderator">Moderator</option>
                                    <option value="officer">Officer</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            {(editForm.role === 'officer' || editForm.role === 'moderator') && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Department</label>
                                    <select
                                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        value={editForm.department}
                                        onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                                    >
                                        <option value="">Select Department...</option>
                                        <option value="Roads">Roads & Transport</option>
                                        <option value="Sanitation">Sanitation & Waste</option>
                                        <option value="Electricity">Electricity & Power</option>
                                        <option value="Water">Water Supply</option>
                                        <option value="Health">Public Health</option>
                                        <option value="Police">Police/Law Enforcement</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Create User Modal --- */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Plus className="text-emerald-600" size={20} /> Add New User
                        </h3>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Full Name</label>
                                <input
                                    type="text" required
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700"
                                    value={createForm.name}
                                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email" required
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700"
                                    value={createForm.email}
                                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Password</label>
                                <input
                                    type="password" required minLength={6}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700"
                                    value={createForm.password}
                                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Role</label>
                                    <select
                                        className="w-full p-2 border rounded-lg dark:bg-gray-700"
                                        value={createForm.role}
                                        onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                                    >
                                        <option value="user">User</option>
                                        <option value="officer">Officer</option>
                                        <option value="moderator">Moderator</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Department</label>
                                    <select
                                        className="w-full p-2 border rounded-lg dark:bg-gray-700"
                                        value={createForm.department}
                                        disabled={createForm.role === 'user' || createForm.role === 'admin'}
                                        onChange={e => setCreateForm({ ...createForm, department: e.target.value })}
                                    >
                                        <option value="">None</option>
                                        <option value="Roads">Roads</option>
                                        <option value="Sanitation">Sanitation</option>
                                        <option value="Electricity">Electricity</option>
                                        <option value="Water">Water</option>
                                        <option value="Police">Police</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </AdminLayout>
    );
};

export default UserManagement;
