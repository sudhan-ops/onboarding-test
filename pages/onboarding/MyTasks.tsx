import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { Task, Notification, TaskStatus } from '../../types';
import { Loader2, ListTodo, Bell } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const TaskStatusChip: React.FC<{ status: TaskStatus }> = ({ status }) => {
    const styles: Record<TaskStatus, string> = {
        'To Do': 'bg-gray-500',
        'In Progress': 'bg-blue-500',
        'Done': 'bg-green-600',
    };
    return <span className={`fo-status-badge ${styles[status]}`}>{status}</span>;
};


const Tasks: React.FC = () => {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'tasks' | 'notifications'>('tasks');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [allTasks, allNotifications] = await Promise.all([
                    api.getTasks(),
                    api.getNotifications(user.id),
                ]);
                const userTasks = allTasks.filter(t => t.assignedToId === user.id);
                setTasks(userTasks);
                setNotifications(allNotifications);
            } catch (error) {
                console.error("Failed to load data for tasks page", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user]);
    
    // In a real app, 'assignedBy' would be part of the Task model.
    // Here, we simulate it for demonstration.
    const getAssignedBy = (taskId: string) => {
        const roles = ['HR', 'Admin', 'Ops Manager', 'Site Manager'];
        return roles[taskId.charCodeAt(taskId.length - 1) % roles.length];
    }

    return (
        <div>
            <header className="p-4 flex-shrink-0 text-center fo-mobile-header sticky top-0 bg-[#0f1f0f]/80 backdrop-blur-sm z-10 border-b border-[#374151]">
                <h1>Tasks</h1>
            </header>

            <div className="flex-shrink-0 p-4">
                 <div className="fo-tabs-container">
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`fo-tab-button ${activeTab === 'tasks' ? 'active' : ''}`}
                    >
                        Tasks
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`fo-tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
                    >
                        Notifications
                    </button>
                </div>
            </div>

            <main className="p-4">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted" />
                    </div>
                ) : activeTab === 'tasks' ? (
                    tasks.length > 0 ? (
                        <div className="space-y-4">
                            {tasks.map(task => (
                                <div key={task.id} className="fo-task-card">
                                    <div className="fo-task-header">
                                        <p className="fo-task-title">{task.name}</p>
                                        <TaskStatusChip status={task.status} />
                                    </div>
                                    <p className="text-sm text-gray-400 mb-2">{task.description}</p>
                                    <div className="fo-task-meta flex justify-between items-center">
                                        <span>Due: {task.dueDate ? format(new Date(task.dueDate), 'dd MMM, yyyy') : 'N/A'}</span>
                                        <span>Assigned by: {getAssignedBy(task.id)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted pt-16">
                            <ListTodo className="h-12 w-12 mx-auto mb-4" />
                            <p>You have no assigned tasks.</p>
                        </div>
                    )
                ) : (
                     notifications.length > 0 ? (
                        <div className="divide-y divide-border">
                            {notifications.map(notif => (
                                <div key={notif.id} className="fo-notification-item">
                                    <Bell className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-grow">
                                        <p className="text-sm text-gray-300">{notif.message}</p>
                                        <p className="text-xs text-muted mt-1">{formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted pt-16">
                            <Bell className="h-12 w-12 mx-auto mb-4" />
                            <p>You have no notifications.</p>
                        </div>
                    )
                )}
            </main>
        </div>
    );
};

export default Tasks;