import React, { useState, useEffect } from "react";
import AdminLayout from "../components/layout/AdminLayout";
import csrfManager from "../utils/csrfManager";
import { useAuth } from "@clerk/clerk-react";
import { Search, Mail, Phone, Calendar, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";

const AdminMessages = () => {
    const { getToken } = useAuth();
    const [messages, setMessages] = useState([]);
    const [filteredMessages, setFilteredMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            const token = await getToken();
            if (!token) return;
            const res = await csrfManager.secureFetch('/api/contact', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(data);
                setFilteredMessages(data);
            } else {
                toast.error("Failed to load messages");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("Connection failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = messages.filter(msg =>
            msg.name.toLowerCase().includes(lowerTerm) ||
            msg.email.toLowerCase().includes(lowerTerm) ||
            msg.message.toLowerCase().includes(lowerTerm)
        );
        setFilteredMessages(filtered);
    }, [searchTerm, messages]);

    return (
        <AdminLayout title="Messages" subtitle="User Inquiries & Contact Requests">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 min-h-[600px]">
                {/* Visual Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search messages..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </div>
                    <span className="text-sm font-medium text-gray-500">{filteredMessages.length} Messages</span>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    </div>
                ) : filteredMessages.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        No messages found.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {filteredMessages.map((msg) => (
                            <div key={msg._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-emerald-700 transition-colors">{msg.name}</h3>
                                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Mail className="w-3 h-3" /> {msg.email}
                                            </span>
                                            {/* Phone currently not in backend model but good to have prepared */}
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> {new Date(msg.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${msg.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {msg.status || 'Pending'}
                                    </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
                                    {msg.message}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default AdminMessages;
