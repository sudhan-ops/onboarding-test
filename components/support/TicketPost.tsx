import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import type { TicketPost, SupportTicket, TicketComment } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, MessageSquare } from 'lucide-react';
import { ProfilePlaceholder } from '../ui/ProfilePlaceholder';
import Button from '../ui/Button';

interface TicketPostProps {
  post: TicketPost;
  ticket: SupportTicket;
  setTicket: React.Dispatch<React.SetStateAction<SupportTicket | null>>;
}

const TicketPostComponent: React.FC<TicketPostProps> = ({ post, ticket, setTicket }) => {
    const { user } = useAuthStore();
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);
    
    const hasLiked = user ? post.likes.includes(user.id) : false;

    const handleLike = async () => {
        if (!user) return;
        
        // Optimistic update
        const originalLikes = [...post.likes];
        const newLikes = hasLiked ? post.likes.filter(id => id !== user.id) : [...post.likes, user.id];
        
        setTicket(prev => prev ? {
            ...prev,
            posts: prev.posts.map(p => p.id === post.id ? { ...p, likes: newLikes } : p)
        } : null);

        try {
            await api.togglePostLike(post.id, user.id);
        } catch (e) {
            // Revert on error
            setTicket(prev => prev ? {
                ...prev,
                posts: prev.posts.map(p => p.id === post.id ? { ...p, likes: originalLikes } : p)
            } : null);
        }
    };
    
     const handleAddComment = async () => {
        if (!newComment.trim() || !user) return;
        setIsCommenting(true);
        try {
            const addedComment = await api.addPostComment(post.id, {
                postId: post.id,
                authorId: user.id,
                authorName: user.name,
                content: newComment,
            });
             setTicket(prev => prev ? {
                ...prev,
                posts: prev.posts.map(p => p.id === post.id ? { ...p, comments: [...p.comments, addedComment] } : p)
            } : null);
            setNewComment('');
        } catch (e) {
            // handle error with toast in parent
        } finally {
            setIsCommenting(false);
        }
    };


    return (
        <div className="bg-card p-4 rounded-xl shadow-card">
            <div className="flex items-start gap-3">
                <ProfilePlaceholder seed={post.authorId} className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="w-full">
                    <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-primary-text">{post.authorName}</span>
                        <span className="text-xs text-muted">{post.authorRole.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-muted">· {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm text-muted mt-1 whitespace-pre-wrap">{post.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted">
                        <button onClick={handleLike} className={`flex items-center gap-1.5 hover:text-accent transition-colors ${hasLiked ? 'text-accent font-semibold' : ''}`}>
                            <ThumbsUp className={`h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
                            <span>{post.likes.length} Like{post.likes.length !== 1 && 's'}</span>
                        </button>
                         <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 hover:text-accent transition-colors">
                            <MessageSquare className="h-4 w-4" />
                            <span>{post.comments.length} Comment{post.comments.length !== 1 && 's'}</span>
                        </button>
                    </div>

                    {showComments && (
                        <div className="mt-4 space-y-3 pt-3 border-t border-border animate-fade-in-down">
                            {post.comments.map(comment => (
                                <div key={comment.id} className="flex items-start gap-2">
                                     <ProfilePlaceholder seed={comment.authorId} className="w-8 h-8 rounded-full flex-shrink-0" />
                                     <div className="bg-page p-2 rounded-lg flex-grow">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-semibold text-sm text-primary-text">{comment.authorName}</span>
                                            <span className="text-xs text-muted">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                                        </div>
                                        <p className="text-sm text-muted">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                             <div className="flex items-start gap-2">
                                <ProfilePlaceholder className="w-8 h-8 rounded-full flex-shrink-0" />
                                <div className="flex-grow">
                                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..." rows={2} className="form-input text-sm" />
                                    <div className="text-right mt-1">
                                        <Button size="sm" onClick={handleAddComment} isLoading={isCommenting}>Post</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TicketPostComponent;
