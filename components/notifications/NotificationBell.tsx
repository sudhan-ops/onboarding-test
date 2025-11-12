import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationStore';
import { Bell, UserPlus, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Notification, NotificationType } from '../../types';
import Button from '../ui/Button';

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
    const iconMap: Record<NotificationType, React.ElementType> = {
        task_assigned: UserPlus,
        task_escalated: AlertTriangle,
        provisional_site_reminder: ClipboardCheck,
    };
    const colorMap: Record<NotificationType, string> = {
        task_assigned: 'text-blue-500',
        task_escalated: 'text-orange-500',
        provisional_site_reminder: 'text-purple-500',
    };
    const Icon = iconMap[type] || Bell;
    return <Icon className={`h-5 w-5 ${colorMap[type]}`} />;
};

const NotificationBell: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);
        if (notification.linkTo) {
            navigate(notification.linkTo);
        }
        setIsOpen(false);
    };
    
    const handleMarkAll = () => {
        markAllAsRead();
    }

    return (
        <div className={`relative notification-bell ${className}`} ref={panelRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-page text-muted"
                aria-label={`Notifications (${unreadCount} unread)`}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-card" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-4 md:right-0 mt-3 w-[calc(100vw-2.5rem)] max-w-sm md:w-96 bg-card rounded-2xl shadow-lg border border-border z-20">
                    <div className="flex justify-between items-center p-3 border-b border-border">
                        <h4 className="font-semibold text-primary-text">Notifications</h4>
                        {unreadCount > 0 && (
                             <Button variant="outline" size="sm" onClick={handleMarkAll}>Mark all as read</Button>
                        )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`flex items-start gap-3 p-3 border-b border-border cursor-pointer transition-colors ${
                                        !notif.isRead 
                                        ? 'bg-accent-light hover:brightness-125' 
                                        : 'hover:bg-page'
                                    }`}
                                >
                                    <div className="flex-shrink-0 mt-0.5"><NotificationIcon type={notif.type} /></div>
                                    <div className="flex-1">
                                        <p className="text-sm text-primary-text">{notif.message}</p>
                                        <p className="text-xs text-muted mt-0.5">{formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}</p>
                                    </div>
                                    {!notif.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />}
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-muted p-6">You have no notifications.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;