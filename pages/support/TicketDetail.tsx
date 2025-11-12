import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { SupportTicket, TicketPost, User } from '../../types';
import { useAuthStore } from '../../store/authStore';
// FIX: Add missing `Star` icon to the import from lucide-react.
import { Loader2, ArrowLeft, Send, Users, Phone, MessageSquare, Video, Paperclip, Star } from 'lucide-react';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import { format } from 'date-fns';
import { ProfilePlaceholder } from '../../components/ui/ProfilePlaceholder';
import TicketPostComponent from '../../components/support/TicketPost';
import CloseTicketModal from '../../components/support/CloseTicketModal';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const PriorityIndicator: React.FC<{ priority: SupportTicket['priority'] }> = ({ priority }) => {
    const styles = {
        Low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        High: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
        Urgent: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[priority]}`}>{priority}</span>;
};

const StatusChip: React.FC<{ status: SupportTicket['status'] }> = ({ status }) => {
    const styles = {
        Open: 'status-chip--pending',
        'In Progress': 'sync-chip--pending_sync',
        'Pending Requester': 'leave-status-chip--pending_hr_confirmation',
        Resolved: 'leave-status-chip--approved',
        Closed: 'status-chip--draft',
    };
    return <span className={`status-chip ${styles[status]}`}>{status}</span>;
};


const TicketDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width: 1023px)');

    useEffect(() => {
        if (!id) return;
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [ticketData, usersData] = await Promise.all([
                    api.getSupportTicketById(id),
                    api.getNearbyUsers()
                ]);
                if (ticketData) {
                    setTicket(ticketData);
                } else {
                    setToast({ message: 'Ticket not found.', type: 'error' });
                    navigate('/support');
                }
                setNearbyUsers(usersData);
            } catch (error) {
                setToast({ message: 'Failed to load ticket data.', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id, navigate]);
    
    const handleAddPost = async () => {
        if (!newPostContent.trim() || !ticket || !user) return;
        setIsPosting(true);
        try {
            const newPost = await api.addTicketPost(ticket.id, {
                ticketId: ticket.id,
                authorId: user.id,
                authorName: user.name,
                authorRole: user.role,
                content: newPostContent
            });
            setTicket(prev => prev ? { ...prev, posts: [...prev.posts, newPost] } : null);
            setNewPostContent('');
        } catch (e) {
            setToast({ message: 'Failed to add post.', type: 'error' });
        } finally {
            setIsPosting(false);
        }
    };

    const handleTicketUpdate = async (updates: Partial<SupportTicket>) => {
        if (!ticket) return;
        try {
            const updatedTicket = await api.updateSupportTicket(ticket.id, updates);
            setTicket(updatedTicket);
            if(updates.status) setToast({ message: `Ticket status updated to ${updates.status}`, type: 'success' });
        } catch (e) {
            setToast({ message: 'Failed to update ticket.', type: 'error' });
        }
    };
    
    const handleCloseTicket = async (rating: number, feedback: string) => {
        await handleTicketUpdate({ status: 'Closed', rating, feedback, closedAt: new Date().toISOString() });
        setIsCloseModalOpen(false);
    };
    
    const openWhatsAppChat = (phone?: string) => {
        if (!phone) {
            setToast({ message: 'User does not have a phone number.', type: 'error' });
            return;
        }
        // Remove all non-digit characters to normalize.
        let numberToCall = phone.replace(/\D/g, '');
        
        // Take the last 10 digits to ensure we have a standard mobile number.
        if (numberToCall.length > 10) {
            numberToCall = numberToCall.slice(-10);
        }

        if (numberToCall.length !== 10) {
            setToast({ message: 'Invalid phone number format.', type: 'error' });
            return;
        }
        
        // Prepend the Indian country code.
        window.open(`https://wa.me/91${numberToCall}`, '_blank');
    };

    if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-accent"/></div>;
    if (!ticket) return null;

    const isRequester = user?.id === ticket.raisedById;

    const renderActionButtons = () => {
        if (ticket.status === 'Closed') return null;

        return (
            <div className="flex flex-wrap gap-2">
                {ticket.status === 'Open' && (
                    <Button onClick={() => handleTicketUpdate({ status: 'In Progress', assignedToId: user?.id, assignedToName: user?.name })}>
                        Assign to Me
                    </Button>
                )}
                 {ticket.status === 'In Progress' && user?.id === ticket.assignedToId && (
                    <Button onClick={() => handleTicketUpdate({ status: 'Resolved', resolvedAt: new Date().toISOString() })}>
                        Mark as Resolved
                    </Button>
                )}
                 {ticket.status === 'Resolved' && isRequester && (
                    <Button onClick={() => setIsCloseModalOpen(true)}>
                        Close Ticket
                    </Button>
                )}
            </div>
        );
    };

    return (
        <div className="p-4">
             {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
             {isCloseModalOpen && <CloseTicketModal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} onSubmit={handleCloseTicket} />}

             <div className="flex items-center gap-4 mb-4">
                <Button variant="icon" onClick={() => navigate('/support')}><ArrowLeft/></Button>
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-primary-text">{ticket.title}</h2>
                    <p className="text-xs text-muted">#{ticket.ticketNumber}</p>
                </div>
             </div>

             <div className="lg:grid lg:grid-cols-3 lg:gap-6">
                <main className="lg:col-span-2 space-y-6">
                    <div className="bg-card p-4 rounded-xl shadow-card space-y-4">
                        <div className="flex flex-wrap gap-4 justify-between items-start">
                             <div className="flex items-center gap-4">
                                <StatusChip status={ticket.status} />
                                <PriorityIndicator priority={ticket.priority} />
                            </div>
                            <div className="text-sm text-muted text-right">
                                <p>Raised by: <span className="font-semibold text-primary-text">{ticket.raisedByName}</span></p>
                                <p>{format(new Date(ticket.raisedAt), 'dd MMM, yyyy - hh:mm a')}</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted whitespace-pre-wrap">{ticket.description}</p>
                        {ticket.attachmentUrl && (
                            <div className="mt-4">
                                <h5 className="text-sm font-semibold text-primary-text mb-2">Attachment</h5>
                                <a href={ticket.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block border rounded-lg overflow-hidden max-w-xs hover:border-accent">
                                    <img src={ticket.attachmentUrl} alt="Attachment" className="max-h-64 w-auto" />
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {ticket.posts.map(post => (
                            <TicketPostComponent key={post.id} post={post} ticket={ticket} setTicket={setTicket} />
                        ))}
                    </div>

                    {ticket.status !== 'Closed' && (
                        <div className="bg-card p-4 rounded-xl shadow-card flex items-start gap-3">
                            <ProfilePlaceholder className="w-10 h-10 rounded-full flex-shrink-0" />
                            <div className="w-full">
                                <textarea
                                    value={newPostContent}
                                    onChange={e => setNewPostContent(e.target.value)}
                                    placeholder="Add a public reply..."
                                    className="form-input w-full"
                                    rows={3}
                                />
                                <div className="mt-2 flex justify-between items-center">
                                    <Button variant="icon" size="sm" title="Attach file"><Paperclip className="h-5 w-5"/></Button>
                                    <Button onClick={handleAddPost} isLoading={isPosting}>
                                        <Send className="mr-2 h-4"/> Post
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                <aside className="space-y-6 mt-6 lg:mt-0">
                    <div className="bg-card p-4 rounded-xl shadow-card">
                        <h3 className="font-semibold text-primary-text mb-3">Ticket Details</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted">Assigned To:</span> <span className="font-semibold">{ticket.assignedToName || 'Unassigned'}</span></div>
                            <div className="flex justify-between"><span className="text-muted">Category:</span> <span>{ticket.category}</span></div>
                            {ticket.resolvedAt && <div className="flex justify-between"><span className="text-muted">Resolved:</span> <span>{format(new Date(ticket.resolvedAt), 'dd MMM, yy')}</span></div>}
                            {ticket.closedAt && <div className="flex justify-between"><span className="text-muted">Closed:</span> <span>{format(new Date(ticket.closedAt), 'dd MMM, yy')}</span></div>}
                            {ticket.rating && <div className="flex justify-between"><span className="text-muted">Rating:</span> <span className="flex items-center gap-1">{ticket.rating} <Star className="h-4 w-4 text-yellow-400 fill-current"/></span></div>}
                        </div>
                        <div className="mt-4 pt-4 border-t border-border">
                           {renderActionButtons()}
                        </div>
                    </div>
                     <div className="bg-card p-4 rounded-xl shadow-card">
                        <h3 className="font-semibold text-primary-text mb-3 flex items-center gap-2"><Users className="h-5 w-5 text-muted"/> Nearby Users</h3>
                        <div className="space-y-3">
                            {nearbyUsers.map(u => (
                                <div key={u.id} className="flex items-center gap-3">
                                    <div className="relative">
                                        <ProfilePlaceholder photoUrl={u.photoUrl} seed={u.id} className="w-10 h-10 rounded-full" />
                                        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-card"></span>
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-sm font-semibold">{u.name}</p>
                                        <p className="text-xs text-muted">{u.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="icon" size="sm" title="WhatsApp Chat" onClick={() => openWhatsAppChat(u.phone)}><Phone className="h-4 w-4"/></Button>
                                        <Button variant="icon" size="sm" title="WhatsApp Chat" onClick={() => openWhatsAppChat(u.phone)}><MessageSquare className="h-4 w-4"/></Button>
                                        <Button 
                                            variant="icon" 
                                            size="sm" 
                                            title="WhatsApp Chat" 
                                            onClick={() => openWhatsAppChat(u.phone)}
                                        >
                                            <Video className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
             </div>
        </div>
    );
};

export default TicketDetail;