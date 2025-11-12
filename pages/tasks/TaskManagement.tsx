import React, { useState, useEffect, useMemo } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { Plus, Edit, Trash2, Loader2, CheckCircle, AlertTriangle, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Modal from '../../components/ui/Modal';
import TaskForm from '../../components/tasks/TaskForm';
import CompleteTaskForm from '../../components/tasks/CompleteTaskForm';
import type { Task, EscalationStatus, TaskPriority, TaskStatus, User } from '../../types';
import { api } from '../../services/api';
import { format, addDays } from 'date-fns';
import { useThemeStore } from '../../store/themeStore';
import Select from '../../components/ui/Select';
import TableSkeleton from '../../components/skeletons/TableSkeleton';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const getNextDueDateInfo = (task: Task): { date: string | null; isOverdue: boolean } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parseDate = (dateStr: string | null | undefined) => dateStr ? new Date(dateStr) : null;

    if (task.status === 'Done' || !task.dueDate) {
        return { date: task.dueDate ? format(parseDate(task.dueDate)!, 'dd MMM, yyyy') : '-', isOverdue: false };
    }

    let nextDueDate: Date | null = null;
    const baseDueDate = parseDate(task.dueDate)!;

    switch (task.escalationStatus) {
        case 'None':
            nextDueDate = task.escalationLevel1DurationDays ? addDays(baseDueDate, task.escalationLevel1DurationDays) : baseDueDate;
            break;
        case 'Level 1':
            if (task.escalationLevel1DurationDays && task.escalationLevel2DurationDays) {
                const l1Date = addDays(baseDueDate, task.escalationLevel1DurationDays);
                nextDueDate = addDays(l1Date, task.escalationLevel2DurationDays);
            }
            break;
        case 'Level 2':
            if (task.escalationLevel1DurationDays && task.escalationLevel2DurationDays && task.escalationEmailDurationDays) {
                const l1Date = addDays(baseDueDate, task.escalationLevel1DurationDays);
                const l2Date = addDays(l1Date, task.escalationLevel2DurationDays);
                nextDueDate = addDays(l2Date, task.escalationEmailDurationDays);
            }
            break;
        case 'Email Sent':
            // No further due dates
            break;
    }
    
    // If no escalation path, the only due date is the base one.
    if (!nextDueDate) nextDueDate = baseDueDate;

    const isOverdue = nextDueDate ? nextDueDate < today : false;

    return { date: format(nextDueDate, 'dd MMM, yyyy'), isOverdue };
};


const TaskManagement: React.FC = () => {
    const { user } = useAuthStore();
    const { tasks, isLoading, error, fetchTasks, deleteTask, runAutomaticEscalations } = useTaskStore();
    const { theme } = useThemeStore();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isCompleteFormOpen, setIsCompleteFormOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState<Task | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    const [users, setUsers] = useState<User[]>([]);
    const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
    const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
    const [assignedToFilter, setAssignedToFilter] = useState<'all' | string>('all');
    const isMobile = useMediaQuery('(max-width: 767px)');

    useEffect(() => {
        const init = async () => {
            api.getUsers().then(setUsers);
            await fetchTasks();
            await runAutomaticEscalations();
        }
        init();
    }, [fetchTasks, runAutomaticEscalations]);

    const handleAdd = () => {
        setCurrentTask(null);
        setIsFormOpen(true);
    };

    const handleEdit = (task: Task) => {
        setCurrentTask(task);
        setIsFormOpen(true);
    };
    
    const handleComplete = (task: Task) => {
        setCurrentTask(task);
        setIsCompleteFormOpen(true);
    };

    const handleDelete = (task: Task) => {
        setCurrentTask(task);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (currentTask) {
            try {
                await deleteTask(currentTask.id);
                setToast({ message: 'Task deleted.', type: 'success' });
                setIsDeleteModalOpen(false);
            } catch (error) {
                setToast({ message: 'Failed to delete task.', type: 'error' });
            }
        }
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (statusFilter !== 'all' && task.status !== statusFilter) {
                return false;
            }
            if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
                return false;
            }
            if (assignedToFilter === 'unassigned') {
                if (task.assignedToId) return false;
            } else if (assignedToFilter !== 'all' && task.assignedToId !== assignedToFilter) {
                return false;
            }
            return true;
        });
    }, [tasks, statusFilter, priorityFilter, assignedToFilter]);
    
    const clearFilters = () => {
        setStatusFilter('all');
        setPriorityFilter('all');
        setAssignedToFilter('all');
    };
    
    const areFiltersActive = statusFilter !== 'all' || priorityFilter !== 'all' || assignedToFilter !== 'all';


    const getPriorityChip = (priority: Task['priority']) => {
        const isDark = theme === 'dark';
        const styles = {
            High: isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-800',
            Medium: isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-800',
            Low: isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-800',
        };
        return <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[priority]}`}>{priority}</span>;
    };
    
    const getStatusChip = (status: Task['status']) => {
        const isDark = theme === 'dark';
        const styles = {
            'To Do': isDark ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-100 text-gray-800',
            'In Progress': isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-800',
            'Done': isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-800',
        };
        return <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
    };
    
    const getEscalationChip = (status: EscalationStatus) => {
        if (status === 'None') return null;
        const isDark = theme === 'dark';
        const styles: Record<EscalationStatus, string> = {
            'None': '',
            'Level 1': isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-800',
            'Level 2': isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-800',
            'Email Sent': isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-800',
        };
        return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>{status}</span>;
    };

    return (
        <div className="p-4 md:bg-card md:p-6 md:rounded-xl md:shadow-card">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            
            {isFormOpen && (
                <TaskForm
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    initialData={currentTask}
                    setToast={setToast}
                />
            )}
            
            {isCompleteFormOpen && currentTask && (
                <CompleteTaskForm
                    isOpen={isCompleteFormOpen}
                    onClose={() => setIsCompleteFormOpen(false)}
                    task={currentTask}
                    setToast={setToast}
                />
            )}

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirm Deletion"
            >
                Are you sure you want to delete the task "{currentTask?.name}"?
            </Modal>
            
            <AdminPageHeader title="Task Management" />
            
            <div className="flex flex-col md:flex-row gap-4 mb-6 md:items-end justify-between">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Select label="Filter by Status" id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                        <option value="all">All Statuses</option>
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                    </Select>
                    <Select label="Filter by Priority" id="priority-filter" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)}>
                        <option value="all">All Priorities</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </Select>
                    <Select label="Filter by Assignee" id="assignee-filter" value={assignedToFilter} onChange={e => setAssignedToFilter(e.target.value)}>
                        <option value="all">All Users</option>
                        <option value="unassigned">Unassigned</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </Select>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {areFiltersActive && (
                        <Button variant="secondary" onClick={clearFilters}>
                            <X className="mr-2 h-4 w-4" /> Clear Filters
                        </Button>
                    )}
                    <Button onClick={handleAdd}><Plus className="mr-2 h-4 w-4" /> Add Task</Button>
                </div>
            </div>
            
            {error && <p className="text-red-500 mb-4">{error}</p>}

            <div className="overflow-x-auto">
                <table className="min-w-full responsive-table">
                    <thead className="bg-page">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Task Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Priority</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Next Due Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Assigned To</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Escalation</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border md:bg-card md:divide-y-0">
                        {isLoading ? (
                            isMobile
                                ? <tr><td colSpan={7}><TableSkeleton rows={3} cols={7} isMobile /></td></tr>
                                : <TableSkeleton rows={5} cols={7} />
                        ) : filteredTasks.map((task) => {
                            const { date: nextDueDate, isOverdue } = getNextDueDateInfo(task);
                            return (
                                <tr key={task.id} className={isOverdue ? 'bg-red-50' : ''}>
                                    <td data-label="Task Name" className="px-6 py-4 font-medium">{task.name}</td>
                                    <td data-label="Priority" className="px-6 py-4">{getPriorityChip(task.priority)}</td>
                                    <td data-label="Next Due Date" className={`px-6 py-4 text-sm ${isOverdue ? 'font-bold text-red-600' : 'text-muted'}`}>{nextDueDate || '-'}</td>
                                    <td data-label="Assigned To" className="px-6 py-4 text-sm text-muted">{task.assignedToName || '-'}</td>
                                    <td data-label="Status" className="px-6 py-4 text-sm text-muted">{getStatusChip(task.status)}</td>
                                    <td data-label="Escalation" className="px-6 py-4 text-sm text-muted">{getEscalationChip(task.escalationStatus)}</td>
                                    <td data-label="Actions" className="px-6 py-4">
                                        <div className="flex items-center gap-2 justify-end md:justify-start">
                                            <Button variant="icon" size="sm" onClick={() => handleEdit(task)} title="Edit Task"><Edit className="h-4 w-4" /></Button>
                                            <Button variant="icon" size="sm" onClick={() => handleDelete(task)} title="Delete Task"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                                            {task.assignedToId === user?.id && task.status !== 'Done' && (
                                                <Button variant="outline" size="sm" onClick={() => handleComplete(task)}>
                                                    <CheckCircle className="h-4 w-4 mr-2" /> Complete
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 {!isLoading && filteredTasks.length === 0 && (
                    <div className="text-center py-10 text-muted">
                        <p>No tasks found matching your criteria.</p>
                        {areFiltersActive && <Button variant="secondary" size="sm" className="mt-2" onClick={clearFilters}>Clear filters</Button>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskManagement;