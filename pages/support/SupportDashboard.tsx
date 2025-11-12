import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { SupportTicket, User } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { Loader2, Plus, LifeBuoy, Users, Phone, MessageSquare, Video, Star, ThumbsUp, MessageSquare as CommentIcon, Search, Filter } from 'lucide-react';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import { formatDistanceToNow } from 'date-fns';
import NewTicketModal from '../../components/support/NewTicketModal';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { ProfilePlaceholder } from '../../components/ui/ProfilePlaceholder';
// FIX: Add missing imports for Input and Select components.
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

const PriorityIndicator: React.FC<{ priority: SupportTicket['priority'] }> = ({ priority }) => {
    const styles = {
        Low: 'bg-blue-500',
        Medium: 'bg-yellow-500',
        High: 'bg-orange-500',
        Urgent: 'bg-red-500',
    };
    return <span className={`w-3 h-3 rounded-full ${styles[priority]}`} title={`Priority: ${priority}`}></span>;
};

const StatusChip: React.FC<{ status: SupportTicket['status'] }> = ({ status }) => {
    const styles = {
        Open: 'status-chip--pending',
        'In Progress': 'sync-chip--pending_sync',
        'Pending Requester': 'leave-status-chip--pending_hr_confirmation',
        Resolved: 'leave-status-chip--approved',
        Closed: 'status-chip--draft',
    };
    return <span className={`status-chip text-xs ${styles[status]}`}>{status}</span>;
};

const TicketCard: React.FC<{ ticket: SupportTicket, onClick: () => void }> = ({ ticket, onClick }) => (
    <div onClick={onClick} className="bg-card p-4 rounded-xl border border-border hover:border-accent cursor-pointer transition-colors duration-200 flex flex-col justify-between h-full">
        <div>
            <div className="flex justify-between items-start gap-2">
                <h4 className="font-bold text-primary-text leading-tight">{ticket.title}</h4>
                <div className="flex-shrink-0"><PriorityIndicator priority={ticket.priority} /></div>
            </div>
            <p className="text-xs text-muted mt-1">#{ticket.ticketNumber}</p>
        </div>
        <div className="mt-4">
            <div className="flex justify-between items-center text-xs text-muted">
                <span>By: {ticket.raisedByName}</span>
                <span>{formatDistanceToNow(new Date(ticket.raisedAt), { addSuffix: true })}</span>
            </div>
            <div className="mt-2"><StatusChip status={ticket.status} /></div>
        </div>
    </div>
);


const SupportDashboard: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width: 1023px)');
    
    const [filters, setFilters] = useState({
        status: 'all',
        priority: 'all',
        searchTerm: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const [ticketsData, usersData] = await Promise.all([
                    api.getSupportTickets(),
                    api.getNearbyUsers()
                ]);
                setTickets(ticketsData);
                setNearbyUsers(usersData.filter(nu => nu.id !== user.id));
            } catch (error) {
                setToast({ message: 'Failed to load support data.', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            const statusMatch = filters.status === 'all' || ticket.status === filters.status;
            const priorityMatch = filters.priority === 'all' || ticket.priority === filters.priority;
            const searchMatch = filters.searchTerm === '' || 
                ticket.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                ticket.ticketNumber.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                ticket.description.toLowerCase().includes(filters.searchTerm.toLowerCase());
            return statusMatch && priorityMatch && searchMatch;
        });
    }, [tickets, filters]);

    const stats = useMemo(() => {
        const userActionTickets = tickets.filter(t => t.status === 'Resolved' && t.raisedById === user?.id);
        return {
            open: tickets.filter(t => t.status === 'Open').length,
            inProgress: tickets.filter(t => t.status === 'In Progress').length,
            pendingYourAction: userActionTickets.length,
        }
    }, [tickets, user]);

    const handleNewTicketSuccess = (newTicket: SupportTicket) => {
        setTickets(prev => [newTicket, ...prev]);
        setIsNewTicketModalOpen(false);
        setToast({ message: 'New ticket created successfully!', type: 'success' });
        navigate(`/support/ticket/${newTicket.id}`);
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
    
    const StatCard: React.FC<{ title: string, value: number, className?: string }> = ({ title, value, className }) => (
        <div className={`p-4 rounded-lg ${className}`}>
            <p className="text-sm text-muted">{title}</p>
            <p className="text-2xl font-bold text-primary-text">{value}</p>
        </div>
    );

    return (
        <div className="p-4 space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            {isNewTicketModalOpen && (
                <NewTicketModal
                    isOpen={isNewTicketModalOpen}
                    onClose={() => setIsNewTicketModalOpen(false)}
                    onSuccess={handleNewTicketSuccess}
                />
            )}

            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-accent-light"><LifeBuoy className="h-6 w-6 text-accent-dark" /></div>
                    <h2 className="text-2xl font-bold text-primary-text">Backend Support & Audit</h2>
                </div>
                <Button onClick={() => setIsNewTicketModalOpen(true)} className="w-full lg:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> New Post
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="Open" value={stats.open} className="bg-red-500/10" />
                <StatCard title="In Progress" value={stats.inProgress} className="bg-blue-500/10" />
                <StatCard title="Pending Your Action" value={stats.pendingYourAction} className="bg-green-500/10" />
            </div>

            <div className="lg:grid lg:grid-cols-3 lg:gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-card p-4 rounded-xl shadow-card">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                             <div className="relative col-span-1 sm:col-span-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                                <Input id="search" placeholder="Search tickets..." className="pl-10" value={filters.searchTerm} onChange={e => setFilters(f => ({...f, searchTerm: e.target.value}))} />
                            </div>
                            <Select label="Status" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))}><option value="all">All Statuses</option><option>Open</option><option>In Progress</option><option value="Pending Requester">Pending Requester</option><option>Resolved</option><option>Closed</option></Select>
                            <Select label="Priority" value={filters.priority} onChange={e => setFilters(f => ({...f, priority: e.target.value}))}><option value="all">All Priorities</option><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></Select>
                        </div>
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent"/></div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredTickets.length > 0 ? filteredTickets.map(ticket => (
                                    <TicketCard key={ticket.id} ticket={ticket} onClick={() => navigate(`/support/ticket/${ticket.id}`)} />
                                )) : (
                                    <p className="col-span-full text-center py-10 text-muted">No tickets match your filters.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <aside className="hidden lg:block space-y-6">
                    <div className="bg-card p-4 rounded-xl shadow-card">
                        <h3 className="font-semibold text-primary-text mb-3 flex items-center gap-2"><Users className="h-5 w-5 text-muted"/> Nearby Available Users</h3>
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
                                        <Button variant="icon" size="sm" title={`Call ${u.name} via WhatsApp`} onClick={() => openWhatsAppChat(u.phone)}><Phone className="h-4 w-4"/></Button>
                                        <Button variant="icon" size="sm" title={`Message ${u.name} via WhatsApp`} onClick={() => openWhatsAppChat(u.phone)}><MessageSquare className="h-4 w-4"/></Button>
                                        <Button 
                                            variant="icon" 
                                            size="sm" 
                                            title={`Video call ${u.name} via WhatsApp`}
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

export default SupportDashboard;