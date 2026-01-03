import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import csrfManager from '../../utils/csrfManager';
import { Image, Send, Trash2, Heart, MessageCircle, User, Repeat, Share2, MoreHorizontal, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const PostFeed = ({ limit = 20, compact = false, activeTab = 'feed' }) => {
    const { getToken, user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [commentModalPost, setCommentModalPost] = useState(null);

    useEffect(() => {
        fetchPosts();
    }, [activeTab]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const endpoint = activeTab === 'discussions' ? 'http://localhost:5000/api/posts?filter=discussions' : 'http://localhost:5000/api/posts';

            const res = await csrfManager.secureFetch(endpoint, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (res.ok) {
                const data = await res.json();
                setPosts(data.slice(0, limit));
            }
        } catch (error) {
            console.error(error);
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

            const res = await csrfManager.secureFetch('http://localhost:5000/api/posts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: newPostContent })
            });

            if (res.ok) {
                const post = await res.json();
                setPosts([post, ...posts]);
                setNewPostContent('');
                toast.success("Posted!");
            } else {
                toast.error("Failed to share post");
            }
        } catch (error) {
            toast.error("Error creating post");
        } finally {
            setSubmitting(false);
        }
    };

    const handleLike = async (postId) => {
        // Optimistic UI Update
        const previousPosts = [...posts];
        const userId = user?.id; // Clerk User ID? We need our MongoDB ID logic usually, but let's assume mapping
        // Actually, the backend checks ClerkUserId. Frontend doesn't know MongoDB ID easily unless we store it.
        // Let's blindly trust the toggle: if we think we liked it, unlinke, else like.
        // Better: let the backend return the new state and update.

        try {
            const token = await getToken();
            if (!token) { toast.error("Please login to like"); return; }

            // Optimistic
            setPosts(current => current.map(p => {
                if (p._id === postId) {
                    // We don't have the exact user DB ID here easily without a profile fetch context,
                    // so we rely on the API response to correct us, but for instant UI we can guess.
                    // The backend adds/removes based on token.
                    // IMPORTANT: Current limitation - we can't perfectly optimistically update without knowing our own DB ID.
                    // So we will trigger the request and wait for response to reuse backend logic.
                    return p;
                }
                return p;
            }));

            const res = await csrfManager.secureFetch(`http://localhost:5000/api/posts/${postId}/like`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const updatedPost = await res.json();
                setPosts(current => current.map(p => p._id === postId ? updatedPost : p));
            }
        } catch (error) {
            console.error("Like failed", error);
            setPosts(previousPosts); // Revert
        }
    };

    return (
        <div className="space-y-0 pb-20">
            {/* Create Post Widget */}
            {!compact && activeTab !== 'following' && (
                <div className="bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 p-4">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                            {user?.imageUrl ? <img src={user.imageUrl} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-gray-500 m-2" />}
                        </div>
                        <div className="flex-1">
                            <textarea
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                placeholder="What is happening?!"
                                className="w-full bg-transparent border-none text-xl placeholder-gray-500 text-gray-900 dark:text-white focus:ring-0 resize-none h-16"
                            />
                            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex gap-2">
                                    <IconButton icon={Image} color="emerald" />
                                    {/* Additional media buttons could go here */}
                                </div>
                                <button
                                    onClick={handleCreatePost}
                                    disabled={submitting || !newPostContent.trim()}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-full font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Post
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Feed */}
            {loading ? (
                <div className="p-8 flex justify-center">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                posts.map(post => (
                    <Post
                        key={post._id}
                        post={post}
                        user={user}
                        handleLike={handleLike}
                        onCommentClick={() => setCommentModalPost(post)}
                    />
                ))
            )}

            {/* Comment Modal */}
            <AnimatePresence>
                {commentModalPost && (
                    <CommentModal
                        post={commentModalPost}
                        onClose={() => setCommentModalPost(null)}
                        getToken={getToken}
                        user={user}
                        onCommentAdded={(updatedPost) => {
                            setPosts(current => current.map(p => p._id === updatedPost._id ? updatedPost : p));
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

/* --- Sub Components --- */
const LikeButton = ({ liked, count, onClick }) => {
    return (
        <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`group flex items-center gap-1.5 text-sm transition-colors relative ${liked ? 'text-emerald-500' : 'text-gray-500 hover:text-pink-500'}`}
        >
            <div className="relative">
                <div className={`p-2 rounded-full transition-colors ${liked ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'group-hover:bg-pink-50 dark:group-hover:bg-pink-900/20'}`}>
                    <Heart className={`w-4.5 h-4.5 ${liked ? 'fill-emerald-500 stroke-emerald-500' : ''}`} />
                </div>
                {/* Confetti Explosion */}
                <AnimatePresence>
                    {liked && (
                        <>
                            {[...Array(6)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                                    animate={{
                                        scale: [0, 1, 0],
                                        x: (Math.random() - 0.5) * 40,
                                        y: (Math.random() - 1) * 30,
                                        opacity: [1, 1, 0],
                                        rotate: Math.random() * 360
                                    }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className="absolute top-2 left-2 w-2 h-2 bg-emerald-400 rounded-sm pointer-events-none"
                                    style={{ borderRadius: Math.random() > 0.5 ? '2px' : '50%' }}
                                />
                            ))}
                        </>
                    )}
                </AnimatePresence>
            </div>
            {count > 0 && <span className="text-xs">{count}</span>}
        </motion.button>
    );
};

const Post = ({ post, user, handleLike, onCommentClick }) => {
    // Check if liked. We need to check if user._id is in post.likes. 
    // BUT user.id is ClerkID. post.likes contains MongoIDs.
    // We need the backend to flag `isLiked` or we act blind.
    // Hack: For now, we rely on the backend response. Visually it might not be perfect on load unless we fetch profile.
    // Limitation alert: Likes won't show blue on refresh unless we map ClerkID -> MongoID globally.
    // Let's assume the user object passed from app has `_id`? Or we fetch it.
    // For now, let's just show the count.

    return (
        <div className="bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors cursor-pointer block">
            <div className="flex gap-3">
                <div className="shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                        {post.author?.profilePictureUrl ? (
                            <img src={post.author.profilePictureUrl} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-500 text-white font-bold text-sm">
                                {post.author?.name?.[0]}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-sm">
                            <span className="font-bold text-gray-900 dark:text-gray-100 truncate hover:underline cursor-pointer">{post.author?.name || 'Citizen'}</span>
                            <span className="text-gray-500">@{post.author?.email?.split('@')[0] || 'anony'}</span>
                            <span className="text-gray-500">·</span>
                            <span className="text-gray-500 hover:underline">{new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <button className="text-gray-400 hover:text-emerald-500 p-1 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-gray-900 dark:text-gray-200 whitespace-pre-wrap leading-normal text-[15px] mb-3">
                        {SimpleHashParser(post.content)}
                    </p>

                    {post.image && (
                        <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 mb-3 max-h-[500px]">
                            <img src={post.image} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                    )}

                    <div className="flex items-center justify-between text-gray-500 max-w-md mt-3">
                        <ActionButton icon={MessageCircle} count={post.comments?.length || 0} color="blue" onClick={onCommentClick} />
                        <ActionButton icon={Repeat} count={0} color="green" />

                        <LikeButton
                            liked={post.likes?.includes(user?.id)}
                            count={post.likes?.length || 0}
                            onClick={() => handleLike(post._id)}
                        />

                        <ActionButton icon={Share2} color="emerald" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const CommentModal = ({ post, onClose, getToken, user, onCommentAdded }) => {
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!text.trim()) return;
        setSubmitting(true);
        try {
            const token = await getToken();
            const res = await csrfManager.secureFetch(`http://localhost:5000/api/posts/${post._id}/comment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            if (res.ok) {
                const updatedPost = await res.json();
                onCommentAdded(updatedPost);
                toast.success("Reply sent");
                onClose();
            }
        } catch (e) {
            toast.error("Failed to reply");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-900 dark:text-gray-100" />
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!text.trim() || submitting}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-full font-bold text-sm disabled:opacity-50"
                    >
                        Reply
                    </button>
                </div>
                <div className="p-4">
                    <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                {post.author?.profilePictureUrl ? <img src={post.author.profilePictureUrl} className="w-full h-full object-cover" /> : <div className="bg-gray-400 w-full h-full" />}
                            </div>
                            <div className="w-0.5 grow bg-gray-200 dark:bg-gray-800 my-2"></div>
                        </div>
                        <div className="pb-6">
                            <div className="flex items-center gap-1.5 text-sm mb-1">
                                <span className="font-bold text-gray-900 dark:text-gray-100">{post.author?.name}</span>
                                <span className="text-gray-500">@{post.author?.email?.split('@')[0]}</span>
                                <span className="text-gray-500">· {new Date(post.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-gray-900 dark:text-gray-200">{post.content}</p>
                            <div className="text-gray-500 text-sm mt-2">Replying to <span className="text-emerald-500">@{post.author?.email?.split('@')[0]}</span></div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                            {user?.imageUrl ? <img src={user.imageUrl} className="w-full h-full object-cover" /> : <div className="bg-emerald-100 w-full h-full" />}
                        </div>
                        <div className="flex-1">
                            <textarea
                                autoFocus
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder="Post your reply"
                                className="w-full bg-transparent border-none text-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-0 resize-none h-24 p-0"
                            />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

const ActionButton = ({ icon: Icon, count, color, active, onClick }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
        className={`group flex items-center gap-1.5 text-sm transition-colors hover:text-${color}-500 ${active ? `text-${color}-500` : ''}`}
    >
        <div className={`p-2 rounded-full group-hover:bg-${color}-50 dark:group-hover:bg-${color}-900/20 transition-colors`}>
            <Icon className={`w-4.5 h-4.5 ${active ? 'fill-current' : ''}`} />
        </div>
        {count !== undefined && count > 0 && <span className="text-xs group-hover:text-${color}-500">{count}</span>}
    </button>
);

const IconButton = ({ icon: Icon, color }) => (
    <button className={`p-2 text-${color}-500 rounded-full hover:bg-${color}-50 dark:hover:bg-${color}-900/20 transition-colors`}>
        <Icon className="w-5 h-5" />
    </button>
);

const SimpleHashParser = (text) => {
    if (!text) return null;
    return text.split(/(\s+)/).map((word, i) => {
        // Basic hashtag regex
        if (/^#[a-zA-Z0-9_]+$/.test(word)) {
            return <span key={i} className="text-emerald-500 hover:underline cursor-pointer">{word}</span>;
        }
        return word;
    });
};

export default PostFeed;
