import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import csrfManager from '../utils/csrfManager';
import { Image, Send, Trash2, Heart, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const UserPosts = () => {
    const { getToken, user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const token = await getToken();
            if (!token) return;
            const res = await csrfManager.secureFetch('http://localhost:5000/api/posts/user', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPosts(data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load posts");
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!newPostContent.trim()) return;

        setSubmitting(true);
        try {
            const token = await getToken();
            if (!token) { toast.error("Please login to post"); setSubmitting(false); return; }

            // Basic text-only post for now, image upload can be added later if needed
            const res = await csrfManager.secureFetch('http://localhost:5000/api/posts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: newPostContent }) // Add image field here if implemented
            });

            if (res.ok) {
                const post = await res.json();
                setPosts([post, ...posts]);
                setNewPostContent('');
                toast.success("Post created!");
            } else {
                toast.error("Failed to create post");
            }
        } catch (error) {
            toast.error("Error creating post");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;
        try {
            const token = await getToken();
            if (!token) return;
            const res = await csrfManager.secureFetch(`http://localhost:5000/api/posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setPosts(posts.filter(p => p._id !== postId));
                toast.success("Post deleted");
            }
        } catch (error) {
            toast.error("Failed to delete post");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent mb-8">
                    Community Posts
                </h1>

                {/* Create Post Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-100 dark:border-gray-700">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex-shrink-0 overflow-hidden">
                            <img src={user?.imageUrl} alt={user?.fullName} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                            <textarea
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                placeholder="Share something with your community..."
                                className="w-full bg-gray-50 dark:bg-gray-700 border-none rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 resize-none h-24 dark:text-white"
                            />
                            <div className="flex justify-between items-center mt-3">
                                <button className="text-gray-400 hover:text-emerald-500 transition-colors">
                                    <Image className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={handleCreatePost}
                                    disabled={submitting || !newPostContent.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-full font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Send className="h-4 w-4" />
                                    Post
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Posts Feed */}
                <div className="space-y-6">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Loading posts...</div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            No posts yet. Be the first to share!
                        </div>
                    ) : (
                        posts.map(post => (
                            <div key={post._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-all hover:shadow-md">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-3 items-center">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                                            {post.author?.profilePictureUrl && <img src={post.author.profilePictureUrl} alt="Author" className="w-full h-full object-cover" />}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">{post.author?.name || 'Unknown User'}</h3>
                                            <span className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeletePost(post._id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors p-2"
                                        title="Delete Post"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">{post.content}</p>

                                {post.image && (
                                    <div className="mb-4 rounded-lg overflow-hidden">
                                        <img src={post.image} alt="Post content" className="w-full h-auto" />
                                    </div>
                                )}

                                <div className="flex items-center gap-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors">
                                        <Heart className={`h-5 w-5 ${post.likes?.includes(user?.id) ? 'fill-red-500 text-red-500' : ''}`} />
                                        <span>{post.likes?.length || 0}</span>
                                    </button>
                                    <button className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors">
                                        <MessageCircle className="h-5 w-5" />
                                        <span>{post.comments?.length || 0}</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserPosts;
