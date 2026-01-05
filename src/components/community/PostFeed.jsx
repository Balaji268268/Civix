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
    const [repostModalPost, setRepostModalPost] = useState(null);
    const [commentModalPost, setCommentModalPost] = useState(null);

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

            const res = await csrfManager.secureFetch(`/api/posts/${postId}/like`, {
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
                        onDelete={handleDeletePost}
                        onRepost={handleQuotePost}
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
            {/* Repost Modal */}
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
            // Create a new post with the quoted content
            // Since we don't have a 'quote' field, we append the quote to the text nicely
            const contentv = `${text}\n\n[Reposting @${post.author?.name}]\n> ${post.content}`;

            const res = await csrfManager.secureFetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: contentv,
                    image: post.image // Option: carry over image? Maybe. Let's keep it simple text for now or specific UI.
                })
            });

            if (res.ok) {
                const newPost = await res.json();
                onRepostAdded(newPost);
                onClose();
            }
        } catch (e) {
            toast.error("Failed to repost");
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
                    <h3 className="font-bold text-lg">Quote Post</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4">
                    <textarea
                        autoFocus
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full bg-transparent border-none text-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-0 resize-none h-24 p-0 mb-4"
                    />

                    {/* Quoted Post Preview */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-1.5 text-sm mb-1">
                            <span className="font-bold text-gray-900 dark:text-gray-100">{post.author?.name}</span>
                            <span className="text-gray-500">@{post.author?.email?.split('@')[0]}</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3">{post.content}</p>
                    </div>

                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-full font-bold text-sm disabled:opacity-50"
                        >
                            Repost
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

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

const Post = ({ post, user, handleLike, onCommentClick, onDelete, onRepost }) => {
    const isAuthor = user?.id === post.author?.clerkUserId || user?.id === post.author?._id || user?.publicMetadata?.role === 'admin';
    const [showMenu, setShowMenu] = useState(false);

    // Check if it's an automatically generated Issue Post
    const isIssuePost = post.linkedIssue || post.content.includes("🚨 **New Issue Reported**");

    const handleShare = async () => {
        // ... existing handleShare ...
        // (Keep existing handleShare implementation if possible, or simplified for this replace block)
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `Post by ${post.author?.name}`,
                    text: post.content,
                    url: window.location.href,
                });
            } else {
                await navigator.clipboard.writeText(`${post.content}`);
                toast.success("Link copied! (+5 XP)"); // Fake XP toast for sharing
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className={`bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors cursor-pointer block relative ${isIssuePost ? 'border-l-4 border-l-red-500' : ''}`}>
            {isIssuePost && (
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Community Alert
                </div>
            )}
            <div className="flex gap-3">
                {/* ... keep existing avatar & body ... */}
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
                    <div className="flex items-center justify-between mb-1 relative">
                        <div className="flex items-center gap-1.5 text-sm">
                            <span className="font-bold text-gray-900 dark:text-gray-100 truncate hover:underline cursor-pointer">{post.author?.name || 'Citizen'}</span>
                            <span className="text-gray-500">@{post.author?.email?.split('@')[0] || 'anony'}</span>
                            <span className="text-gray-500">·</span>
                            <span className="text-gray-500 hover:underline">{new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>

                        {/* 3-Dots Menu */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                className="text-gray-400 hover:text-emerald-500 p-1 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </button>

                            <AnimatePresence>
                                {showMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="absolute right-0 top-6 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden py-1"
                                    >
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleShare(); setShowMenu(false); }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                        >
                                            <Share2 className="w-4 h-4" /> Share
                                        </button>
                                        {isAuthor && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDelete(post._id); setShowMenu(false); }}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" /> Delete
                                            </button>
                                        )}
                                        {!isAuthor && (
                                            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                                Report
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            {/* Backdrop to close menu */}
                            {showMenu && (
                                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}></div>
                            )}
                        </div>
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

                        {/* Repost / Quote */}
                        <ActionButton
                            icon={Repeat}
                            count={0}
                            color="green"
                            onClick={() => onRepost(post)}
                        />

                        <LikeButton
                            liked={post.isLiked || post.likes?.includes(user?.id)}
                            count={post.likes?.length || 0}
                            onClick={() => {
                                handleLike(post._id);
                                if (!(post.isLiked || post.likes?.includes(user?.id))) {
                                    toast.success("Liked! (+2 XP)", { icon: '⭐' });
                                }
                            }}
                        />

                        <ActionButton icon={Share2} color="emerald" onClick={handleShare} />
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
            const res = await csrfManager.secureFetch(`/api/posts/${post._id}/comment`, {
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
                setText(''); // Clear input but keep modal open to see new comment? Or close? User usually expects close or see update.
                // Let's reload comments locally or just close. User asked to see replies.
                // If we close, we can't see replies. Let's NOT close automatically if we want to support conversation, 
                // BUT standard UI usually closes modal. 
                // However, user specifically asked: "when i click the comment section it should have the previous replies too and new reply also"
                // So I definitely need to RENDER them.
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
                className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Replies</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-900 dark:text-gray-100" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-4 space-y-6">
                    {/* Original Post (Context) */}
                    <div className="flex gap-4 relative">
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                {post.author?.profilePictureUrl ? <img src={post.author.profilePictureUrl} className="w-full h-full object-cover" /> : <div className="bg-gray-400 w-full h-full" />}
                            </div>
                            <div className="w-0.5 grow bg-gray-200 dark:bg-gray-700 my-2"></div>
                        </div>
                        <div className="pb-2">
                            <div className="flex items-center gap-1.5 text-sm mb-1">
                                <span className="font-bold text-gray-900 dark:text-gray-100">{post.author?.name}</span>
                                <span className="text-gray-500">@{post.author?.email?.split('@')[0]}</span>
                                <span className="text-gray-500">· {new Date(post.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-gray-900 dark:text-gray-200 text-[15px]">{post.content}</p>
                        </div>
                    </div>

                    {/* Existing Comments */}
                    {post.comments && post.comments.length > 0 && (
                        <div className="space-y-4">
                            {post.comments.map((comment, index) => (
                                <div key={index} className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                        {comment.user?.profilePictureUrl ? (
                                            <img src={comment.user.profilePictureUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-300 text-xs font-bold text-gray-600">
                                                {comment.user?.name?.[0]}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-sm mb-0.5">
                                            <span className="font-bold text-gray-900 dark:text-gray-100">{comment.user?.name || 'User'}</span>
                                            <span className="text-gray-500 text-xs">{new Date(comment.date || Date.now()).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-gray-800 dark:text-gray-300 text-sm">{comment.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
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
                                className="w-full bg-transparent border-none text-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-0 resize-none h-20 p-2 focus:bg-gray-50 dark:focus:bg-gray-800 rounded-lg transition-colors"
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={handleSubmit}
                                    disabled={!text.trim() || submitting}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-full font-bold text-sm disabled:opacity-50"
                                >
                                    Reply
                                </button>
                            </div>
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
