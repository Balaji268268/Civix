import React from 'react';
import { Search, TrendingUp, Hash } from 'lucide-react';
import API_BASE_URL from '../../config';

const ExplorePage = () => {
    const categories = [
        { name: "Infrastructure", image: "https://images.unsplash.com/photo-1596525907376-7c385750269f?auto=format&fit=crop&q=80&w=400" },
        { name: "Sanitation", image: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=400" },
        { name: "Electricity", image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80&w=400" },
        { name: "Transport", image: "https://images.unsplash.com/photo-1494515856426-bfb98e19619c?auto=format&fit=crop&q=80&w=400" },
        { name: "Water", image: "https://images.unsplash.com/photo-1560965023-e18a09ebcf11?auto=format&fit=crop&q=80&w=400" },
        { name: "Environment", image: "https://images.unsplash.com/photo-1542601906990-b4d3fb77c35e?auto=format&fit=crop&q=80&w=400" }
    ];

    const [recentPosts, setRecentPosts] = React.useState([]);

    React.useEffect(() => {
        const fetchTrends = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/posts`);
                if (res.ok) {
                    const data = await res.json();
                    setRecentPosts(data.slice(0, 5));
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchTrends();
    }, []);

    return (
        <div className="pb-20 space-y-6">
            {/* Search Header */}
            <div className="p-4 sticky top-[60px] bg-white dark:bg-gray-900 z-10 border-b border-gray-100 dark:border-gray-800">
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search for people, topics, or issues"
                        className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-full py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            </div>

            {/* Trending Tags */}
            <div className="px-4">
                <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" /> Trending Now</h3>
                <div className="grid grid-cols-1 gap-4">
                    {recentPosts.map((post, i) => (
                        <div key={post._id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer group border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                            <div className="min-w-0">
                                <div className="text-xs text-gray-500 mb-0.5">@{post.author?.name || 'User'}</div>
                                <div className="font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 truncate max-w-xs">{post.content}</div>
                                <div className="text-xs text-gray-500">{post.likes?.length || 0} likes • {post.comments?.length || 0} comments</div>
                            </div>
                            <div className="p-2 text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 rounded-full transition-colors shrink-0">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Categories Grid */}
            <div className="px-4">
                <h3 className="font-bold text-xl mb-4">Explore Topics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {categories.map((cat, i) => (
                        <div key={i} className="relative h-28 rounded-2xl overflow-hidden cursor-pointer group">
                            <img src={cat.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                                <span className="text-white font-bold text-lg shadow-sm">{cat.name}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ExplorePage;
