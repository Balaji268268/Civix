import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import csrfManager from '../../utils/csrfManager';
import { Image, Send, Trash2, Heart, MessageCircle, User, Repeat, Share2, MoreHorizontal, X, ArrowDown, ArrowUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import CommentSection from './CommentSection'; // Import new component

const PostFeed = ({ limit = 20, compact = false, activeTab = 'feed' }) => {
    const { getToken, user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [repostModalPost, setRepostModalPost] = useState(null);

    useEffect(() => {
        fetchPosts();
    }, [activeTab]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const endpoint = activeTab === 'discussions' ? '/api/posts?filter=discussions' : '/api/posts';

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

            const res = await csrfManager.secureFetch('/api/posts', {
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

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Delete this post?")) return;
        try {
            const token = await getToken();
            const res = await csrfManager.secureFetch(`/api/posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setPosts(posts.filter(p => p._id !== postId));
                toast.success("Post deleted");
            } else {
                toast.error("Delete failed");
            }
        } catch (e) {
            toast.error("Error deleting post");
        }
    };

    const handleQuotePost = (post) => {
        setRepostModalPost(post);
    };

    const handleUpvote = async (postId) => {
        const previousPosts = [...posts];
        try {
            const token = await getToken();
            if (!token) { toast.error("Please login to vote"); return; }

            const res = await csrfManager.secureFetch(`/api/posts/${postId}/upvote`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const updatedPost = await res.json();
                setPosts(current => current.map(p => p._id === postId ? updatedPost : p));
            }
        } catch (error) {
            console.error("Upvote failed", error);
            setPosts(previousPosts);
        }
    };

    const handleDownvote = async (postId) => {
        const previousPosts = [...posts];
        try {
            const token = await getToken();
            if (!token) { toast.error("Please login to vote"); return; }

            const res = await csrfManager.secureFetch(`/api/posts/${postId}/downvote`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const updatedPost = await res.json();
                setPosts(current => current.map(p => p._id === postId ? updatedPost : p));
            }
        } catch (error) {
            console.error("Downvote failed", error);
            setPosts(previousPosts);
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
                        handleUpvote={handleUpvote}
                        handleDownvote={handleDownvote}
                        onDelete={handleDeletePost}
                        onRepost={handleQuotePost}
                    />
                ))
            )}

            {/* Repost Modal only - Comments are now inline */}
            <AnimatePresence>
                {repostModalPost && (
                    <RepostModal
                        post={repostModalPost}
                        onClose={() => setRepostModalPost(null)}
                        getToken={getToken}
                        user={user}
                        onRepostAdded={(newPost) => {
                            setPosts([newPost, ...posts]);
                            toast.success("Reposted!");
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

/* --- Sub Components --- */
const RepostModal = ({ post, onClose, getToken, user, onRepostAdded }) => {
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const token = await getToken();
            const contentv = `${text}\n\n[Reposting @${post.author?.name}]\n> ${post.content}`;
            const res = await csrfManager.secureFetch('/api/posts', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: contentv, image: post.image })
            });

            if (res.ok) {
                const newPost = await res.json();
                onRepostAdded(newPost);
                onClose();
            }
        } catch (e) { toast.error("Failed to repost"); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-6">
                <div className="flex justify-between mb-4">
                    <h3 className="font-bold text-lg">Quote Post</h3>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                <textarea autoFocus value={text} onChange={e => setText(e.target.value)} placeholder="Add a comment..." className="w-full bg-transparent border-none text-lg h-24 p-0 focus:ring-0 mb-4" />
                <div className="border p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <p className="font-bold text-sm">{post.author?.name}</p>
                    <p className="text-sm line-clamp-2">{post.content}</p>
                </div>
                <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-emerald-500 text-white px-4 py-2 rounded-full font-bold text-sm w-full block">Repost</button>
            </div>
        </div>
    );
};

const Post = ({ post, user, handleUpvote, handleDownvote, onDelete, onRepost }) => {
    const isAuthor = user?.id === post.author?.clerkUserId || user?.id === post.author?._id || user?.publicMetadata?.role === 'admin';
    const [showMenu, setShowMenu] = useState(false);
    const [expanded, setExpanded] = useState(false); // FOR INLINE COMMENTS

    const isIssuePost = post.linkedIssue || post.content.includes("🚨 **New Issue Reported**");

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `Post by ${post.author?.name}`,
                    text: post.content,
                    url: window.location.href,
                });
            } else {
                await navigator.clipboard.writeText(`${post.content}`);
                toast.success("Link copied! (+5 XP)");
            }
        } catch (e) { console.error(e); }
    };

    return (
        <div className={`bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors block relative ${isIssuePost ? 'border-l-4 border-l-red-500' : ''}`}>
            <div onClick={() => setExpanded(!expanded)} className="cursor-pointer"> {/* Click post to expand */}
                <div className="flex gap-3">
                    <div className="shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                            {post.author?.profilePictureUrl ? <img src={post.author.profilePictureUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-500 flex items-center justify-center text-white">{post.author?.name?.[0]}</div>}
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 relative">
                            <div className="flex items-center gap-1.5 text-sm">
                                <span className="font-bold text-gray-900 dark:text-gray-100 truncate hover:underline">{post.author?.name || 'Citizen'}</span>
                                <span className="text-gray-500">@{post.author?.email?.split('@')[0] || 'anony'}</span>
                                <span className="text-gray-500">· {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="text-gray-400 hover:text-emerald-500 p-1 rounded-full"><MoreHorizontal className="w-4 h-4" /></button>
                                {showMenu && (
                                    <div className="absolute right-0 top-6 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-xl border z-50 py-1">
                                        <button onClick={(e) => { e.stopPropagation(); handleShare(); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 flex items-center gap-2"><Share2 className="w-4 h-4" /> Share</button>
                                        {isAuthor && <button onClick={(e) => { e.stopPropagation(); onDelete(post._id); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>}
                                    </div>
                                )}
                            </div>
                        </div>

                        <p className="text-gray-900 dark:text-gray-200 whitespace-pre-wrap leading-normal text-[15px] mb-3">{SimpleHashParser(post.content)}</p>
                        {post.image && <div className="rounded-2xl overflow-hidden mb-3 max-h-[500px]"><img src={post.image} className="w-full h-full object-cover" loading="lazy" /></div>}

                        <div className="flex items-center justify-between text-gray-500 max-w-md mt-3">
                            <VoteButton
                                icon={ArrowUp}
                                upvoted={post.upvotes?.some(id => id === user?.id)}
                                onClick={(e) => { e.stopPropagation(); handleUpvote(post._id); }}
                            />
                            <VoteButton
                                icon={ArrowDown}
                                downvoted={post.downvotes?.some(id => id === user?.id)}
                                isDownvote
                                onClick={(e) => { e.stopPropagation(); handleDownvote(post._id); }}
                            />
                            <span className="text-sm font-semibold">{(post.upvotes?.length || 0) - (post.downvotes?.length || 0)}</span>
                            <ActionButton
                                icon={MessageCircle}
                                count={post.comments?.length || post.commentsCount || 0}
                                color="blue"
                                active={expanded}
                                onClick={() => setExpanded(!expanded)}
                            />
                            <ActionButton icon={Share2} color="emerald" onClick={handleShare} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Inline Comment Section */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pl-14 pr-2 pb-4">
                            <div className="w-0.5 h-4 bg-gray-200 dark:bg-gray-800 ml-5 -mt-2 mb-2"></div> {/* Connector Line */}
                            <CommentSection postId={post._id} onCommentCountChange={(count) => {
                                // Optional: Update local post state if needed, but PostFeed might not easily expose setPosts here without props.
                                // For now, just let the inner component handle itself.
                            }} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ActionButton = ({ icon: Icon, count, color, active, onClick }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
        className={`group flex items-center gap-1.5 text-sm transition-colors hover:text-${color}-500 ${active ? `text-${color}-500` : ''}`}
    >
        <div className={`p-2 rounded-full group-hover:bg-${color}-50 dark:group-hover:bg-${color}-900/20 transition-colors ${active ? `bg-${color}-50 dark:bg-${color}-900/20` : ''}`}>
            <Icon className={`w-4.5 h-4.5 ${active ? 'fill-current' : ''}`} />
        </div>
        {count !== undefined && count > 0 && <span className="text-xs group-hover:text-${color}-500">{count}</span>}
    </button>
);

const LikeButton = ({ liked, count, onClick }) => {
    return (
        <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`group flex items-center gap-1.5 text-sm transition-colors relative ${liked ? 'text-emerald-500' : 'text-gray-500 hover:text-emerald-500'}`}
        >
            <div className="relative">
                <div className={`p-2 rounded-full transition-colors ${liked ? 'bg-emerald-50 text-emerald-500 shadow-emerald-200 dark:shadow-emerald-900/30' : 'group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20'}`}>
                    <Heart className={`w-4.5 h-4.5 ${liked ? 'fill-emerald-500 stroke-emerald-500' : ''}`} />
                </div>
            </div>
            {count > 0 && <span className="text-xs">{count}</span>}
        </motion.button>
    );
};

const VoteButton = ({ icon: Icon, upvoted, downvoted, isDownvote, onClick }) => {
    const isActive = upvoted || downvoted;
    const colorClass = isDownvote
        ? (downvoted ? 'text-red-500' : 'text-gray-500 hover:text-red-500')
        : (upvoted ? 'text-green-500' : 'text-gray-500 hover:text-green-500');
    const bgClass = isDownvote
        ? (downvoted ? 'bg-red-50 dark:bg-red-900/20' : 'group-hover:bg-red-50 dark:group-hover:bg-red-900/20')
        : (upvoted ? 'bg-green-50 dark:bg-green-900/20' : 'group-hover:bg-green-50 dark:group-hover:bg-green-900/20');

    return (
        <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClick}
            className={`group flex items-center gap-1 transition-colors ${colorClass}`}
        >
            <div className={`p-1.5 rounded-full transition-colors ${bgClass}`}>
                <Icon className="w-4 h-4" />
            </div>
        </motion.button>
    );
};

const IconButton = ({ icon: Icon, color }) => (
    <button className={`p-2 text-${color}-500 rounded-full hover:bg-${color}-50 dark:hover:bg-${color}-900/20 transition-colors`}>
        <Icon className="w-5 h-5" />
    </button>
);

const SimpleHashParser = (text) => {
    if (!text) return null;
    return text.split(/(\s+)/).map((word, i) => {
        if (/^#[a-zA-Z0-9_]+$/.test(word)) {
            return <span key={i} className="text-emerald-500 hover:underline cursor-pointer">{word}</span>;
        }
        return word;
    });
};

export default PostFeed;
