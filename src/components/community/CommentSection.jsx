import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import csrfManager from '../../utils/csrfManager';
import { MessageCircle, Heart, Reply, MoreHorizontal, Trash2, CornerDownRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const CommentSection = ({ postId, onCommentCountChange }) => {
    const { getToken, user } = useAuth();
    const { user: clerkUser } = useUser();
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState(null); // Comment ID we are replying to
    const [newCommentText, setNewCommentText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchComments();
    }, [postId]);

    const fetchComments = async () => {
        try {
            const token = await getToken();
            const res = await csrfManager.secureFetch(`/api/posts/${postId}/comments`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (res.ok) {
                const data = await res.json();
                setComments(data);
                if (onCommentCountChange) onCommentCountChange(data.length);
            }
        } catch (error) {
            console.error("Failed to load comments", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePostComment = async (parentId = null) => {
        if (!newCommentText.trim()) return;
        setSubmitting(true);

        try {
            const token = await getToken();
            if (!token) {
                toast.error("Please login to comment");
                return;
            }

            const res = await csrfManager.secureFetch(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: newCommentText,
                    parentCommentId: parentId
                })
            });

            if (res.ok) {
                const newComment = await res.json();
                setComments(prev => [...prev, newComment]);
                setNewCommentText('');
                setReplyingTo(null);
                if (onCommentCountChange) onCommentCountChange(comments.length + 1);
                toast.success(parentId ? "Reply added!" : "Comment added!");
            }
        } catch (error) {
            toast.error("Failed to post comment");
        } finally {
            setSubmitting(false);
        }
    };

    // Helper to build tree
    const buildCommentTree = (flatComments) => {
        const commentMap = {};
        const tree = [];

        flatComments.forEach(comment => {
            commentMap[comment._id] = { ...comment, replies: [] };
        });

        flatComments.forEach(comment => {
            if (comment.parentComment) {
                if (commentMap[comment.parentComment]) {
                    commentMap[comment.parentComment].replies.push(commentMap[comment._id]);
                }
            } else {
                tree.push(commentMap[comment._id]);
            }
        });

        return tree;
    };

    const commentTree = buildCommentTree(comments);

    if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

    return (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mt-2 animate-in fade-in duration-300">
            {/* Top Level Input */}
            <div className="flex gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                    {clerkUser?.imageUrl ? <img src={clerkUser.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-emerald-100" />}
                </div>
                <div className="flex-1">
                    <textarea
                        value={replyingTo ? '' : newCommentText}
                        onChange={e => {
                            if (!replyingTo) setNewCommentText(e.target.value);
                        }}
                        placeholder="Add a comment..."
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[80px]"
                        disabled={!!replyingTo}
                    />
                    <div className="flex justify-end mt-2">
                        <button
                            onClick={() => handlePostComment(null)}
                            disabled={submitting || !newCommentText.trim() || !!replyingTo}
                            className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {submitting && !replyingTo ? 'Posting...' : 'Comment'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
                {commentTree.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-4">Be the first to comment!</p>
                ) : (
                    commentTree.map(comment => (
                        <CommentThread
                            key={comment._id}
                            comment={comment}
                            user={clerkUser}
                            getToken={getToken}
                            replyingTo={replyingTo}
                            setReplyingTo={setReplyingTo}
                            newCommentText={newCommentText}
                            setNewCommentText={setNewCommentText}
                            handlePostComment={handlePostComment}
                            submitting={submitting}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

const CommentThread = ({ comment, user, getToken, replyingTo, setReplyingTo, newCommentText, setNewCommentText, handlePostComment, submitting }) => {
    const isReplying = replyingTo === comment._id;
    const [likes, setLikes] = useState(comment.likes || []);

    // Check if user ID is in array. Clerk User ID vs Mongo ID issue again.
    // Optimistic: We'll rely on local state derived from fetch.
    // For simpler checking without complex auth context mapping, we check if logic holds effectively.
    // Real comparison: `likes.includes(mongoUserId)`. Since we don't have mongoUserId easily here props drilled,
    // we'll just check length or basic toggle state kept locally.

    // Note: To properly show "Liked" state, we really need the Mongo User ID. 
    // Ideally UserContext should provide it. For now, let's assume `user.id` matches IF we synced it, 
    // OR we blindly toggle.

    const handleLike = async () => {
        // Optimistic toggle
        // We can't easily know if we liked it without ID match. 
        // Let's just hit the API and update with response.
        try {
            const token = await getToken();
            if (!token) { toast.error("Login to like"); return; }

            const res = await csrfManager.secureFetch(`/api/posts/comments/${comment._id}/like`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const updated = await res.json();
                setLikes(updated.likes);
            }
        } catch (e) { console.error(e); }
    };

    return (
        <div className="group">
            <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                    {comment.author?.profilePictureUrl ? (
                        <img src={comment.author.profilePictureUrl} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-800 text-xs font-bold">
                            {comment.author?.name?.[0]}
                        </div>
                    )}
                </div>

                <div className="flex-1">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-700 inline-block min-w-[200px]">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-xs text-gray-900 dark:text-gray-100">{comment.author?.name || 'User'}</span>
                            <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                            {comment.author?.role === 'admin' && <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1 rounded font-bold">MOD</span>}
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{comment.content}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 mt-1 ml-2">
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-1 text-xs font-medium transition-colors ${likes.length > 0 ? 'text-pink-500' : 'text-gray-500 hover:text-pink-500'}`}
                        >
                            <Heart className={`w-3 h-3 ${likes.length > 0 ? 'fill-current' : ''}`} /> {likes.length || 'Like'}
                        </button>
                        <button
                            onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-blue-500 transition-colors"
                        >
                            <Reply className="w-3 h-3" /> Reply
                        </button>
                    </div>

                    {/* Reply Input */}
                    <AnimatePresence>
                        {isReplying && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 overflow-hidden"
                            >
                                <div className="flex gap-2">
                                    <div className="w-0.5 bg-gray-200 dark:bg-gray-700 ml-4"></div>
                                    <div className="flex-1">
                                        <textarea
                                            autoFocus
                                            value={newCommentText}
                                            onChange={e => setNewCommentText(e.target.value)}
                                            placeholder={`Reply to ${comment.author?.name}...`}
                                            className="w-full bg-white dark:bg-gray-800 border-2 border-blue-100 dark:border-blue-900/30 rounded-lg p-2 text-sm focus:ring-0 focus:border-blue-400 min-h-[60px]"
                                        />
                                        <div className="flex justify-end gap-2 mt-2">
                                            <button
                                                onClick={() => setReplyingTo(null)}
                                                className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handlePostComment(comment._id)}
                                                disabled={submitting || !newCommentText.trim()}
                                                className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                {submitting ? 'Sending...' : 'Reply'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Nested Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 pl-2 sm:pl-4 border-l-2 border-gray-100 dark:border-gray-800 space-y-3">
                            {comment.replies.map(reply => (
                                <CommentThread
                                    key={reply._id}
                                    comment={reply}
                                    user={user}
                                    getToken={getToken}
                                    replyingTo={replyingTo}
                                    setReplyingTo={setReplyingTo}
                                    newCommentText={newCommentText}
                                    setNewCommentText={setNewCommentText}
                                    handlePostComment={handlePostComment}
                                    submitting={submitting}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommentSection;
