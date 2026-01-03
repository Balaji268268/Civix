import React from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, ShieldCheck, MapPin, X } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import csrfManager from '../../utils/csrfManager';
import { toast } from 'react-hot-toast';

const CommunitiesPage = () => {
    // Mock Data
    const [communities, setCommunities] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchCommunities = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/communities');
                if (res.ok) {
                    const data = await res.json();
                    setCommunities(data);
                }
            } catch (err) {
                console.error("Failed to fetch communities", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCommunities();
    }, []);

    const [showModal, setShowModal] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const { getToken } = useAuth();

    // Form State
    const [newCommunity, setNewCommunity] = React.useState({
        name: '', description: '', image: '', category: 'General'
    });

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = await getToken();
            const res = await csrfManager.secureFetch('http://localhost:5000/api/communities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newCommunity)
            });

            if (res.ok) {
                const created = await res.json();
                setCommunities([created, ...communities]);
                setShowModal(false);
                toast.success("Community Created!");
                setNewCommunity({ name: '', description: '', image: '', category: 'General' });
            } else {
                toast.error("Failed to create community");
            }
        } catch (error) {
            toast.error("Error creating community");
        } finally {
            setSubmitting(false);
        }
    };

    const handleJoin = async (id) => {
        try {
            const token = await getToken();
            if (!token) { toast.error("Please login to join"); return; }

            const res = await csrfManager.secureFetch(`http://localhost:5000/api/communities/${id}/join`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                // Update local state
                setCommunities(communities.map(c =>
                    c._id === id ? { ...c, members: { length: data.memberCount } } : c // Simple update, ideally we reload
                ));
                toast.success(data.message);
            }
        } catch (error) {
            toast.error("Action failed");
        }
    };

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-[60px] z-10 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Communities</h2>
                    <p className="text-sm text-gray-500">Discover and join local groups</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-colors">
                    <Plus className="w-4 h-4" />
                    Create
                </button>
            </div>

            {/* List */}
            <div className="space-y-4 p-4">
                {communities.map((community) => (
                    <div key={community._id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-gray-200 overflow-hidden shrink-0">
                            <img src={community.image || "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=200"} className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate">{community.name}</h3>
                                {community.verified && <ShieldCheck className="w-4 h-4 text-blue-500 fill-blue-500/10" />}
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-1">{community.description}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 font-medium">
                                <Users className="w-3 h-3" />
                                {community.members?.length || 0} members
                            </div>
                        </div>

                        <button
                            onClick={() => handleJoin(community._id)}
                            className="shrink-0 px-5 py-2 rounded-full border border-gray-200 dark:border-gray-700 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-emerald-500 transition-colors">
                            Join/Leave
                        </button>
                    </div>
                ))}

                {/* Create Call to Action */}
                <div className="p-8 text-center bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/10 dark:to-blue-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-800/20 mt-8">
                    <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mb-2">Can't find what you're looking for?</h3>
                    <p className="text-emerald-600/80 dark:text-emerald-400/80 mb-6 max-w-md mx-auto">Start a new community to gather people around a cause you care about.</p>
                    <button onClick={() => setShowModal(true)} className="bg-emerald-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 hover:scale-105 transition-transform">
                        Create Community
                    </button>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Create Community</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input required type="text" className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                    value={newCommunity.name} onChange={e => setNewCommunity({ ...newCommunity, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea required className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                    value={newCommunity.description} onChange={e => setNewCommunity({ ...newCommunity, description: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Image URL</label>
                                <input type="text" className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                    value={newCommunity.image} onChange={e => setNewCommunity({ ...newCommunity, image: e.target.value })} />
                            </div>
                            <button disabled={submitting} type="submit" className="w-full bg-emerald-500 text-white py-2 rounded-lg font-bold hover:bg-emerald-600">
                                {submitting ? 'Creating...' : 'Create Community'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommunitiesPage;
