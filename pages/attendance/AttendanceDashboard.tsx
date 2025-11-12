import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import html2pdf from 'html2pdf.js';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { usePermissionsStore } from '../../store/permissionsStore';
import type { AttendanceEvent, DailyAttendanceRecord, DailyAttendanceStatus, User, LeaveRequest, Holiday, AttendanceSettings, OnboardingData, Organization, UserRole } from '../../types';
import { format, getDaysInMonth, addDays, startOfToday, endOfToday, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, eachDayOfInterval, differenceInHours, isSaturday, isSunday } from 'date-fns';
import { Loader2, Download, Users, UserCheck, UserX, Clock, BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { DateRangePicker, type Range, type RangeKeyDict } from 'react-date-range';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import DatePicker from '../../components/ui/DatePicker';
import Toast from '../../components/ui/Toast';
import Input from '../../components/ui/Input';
import StatCard from '../../components/ui/StatCard';
import Logo from '../../components/ui/Logo';
import { useSettingsStore } from '../../store/settingsStore';
import {
    Chart,
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    DoughnutController,
    ArcElement,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';

// Register the necessary components for Chart.js to work in a tree-shaken environment
Chart.register(
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    DoughnutController,
    ArcElement,
    Tooltip,
    Legend,
    Filler
);


// --- Reusable Dashboard Components ---
const ChartContainer: React.FC<{ title: string, icon: React.ElementType, children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
    <div className="bg-card p-6 rounded-xl shadow-card col-span-1">
        <div className="flex items-center mb-4">
            <Icon className="h-5 w-5 mr-3 text-muted" />
            <h3 className="font-semibold text-primary-text">{title}</h3>
        </div>
        <div className="h-60 relative">{children}</div>
    </div>
);

const AttendanceTrendChart: React.FC<{ data: { labels: string[], present: number[], absent: number[] } }> = ({ data }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                chartInstance.current = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.labels,
                        datasets: [
                            {
                                label: 'Present',
                                data: data.present,
                                backgroundColor: '#005D22',
                                borderColor: '#004218',
                                borderWidth: 1,
                                borderRadius: 4,
                            },
                            {
                                label: 'Absent',
                                data: data.absent,
                                backgroundColor: '#EF4444',
                                borderColor: '#DC2626',
                                borderWidth: 1,
                                borderRadius: 4,
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.1)' } },
                            x: { 
                                grid: { display: false },
                                ticks: {
                                    maxRotation: 0,
                                    minRotation: 0,
                                    autoSkip: true,
                                    maxTicksLimit: 7,
                                }
                            }
                        },
                        plugins: { 
                            legend: {
                                display: true,
                                position: 'bottom',
                                align: 'center',
                                labels: {
                                    usePointStyle: true,
                                    pointStyle: 'rectRounded',
                                    boxWidth: 12,
                                    padding: 20,
                                    font: {
                                        family: "'Manrope', sans-serif",
                                        size: 12,
                                    }
                                }
                            },
                            tooltip: {
                                backgroundColor: '#0F172A',
                                titleFont: { family: "'Manrope', sans-serif" },
                                bodyFont: { family: "'Manrope', sans-serif" },
                                cornerRadius: 8,
                                padding: 10,
                                displayColors: true,
                                boxPadding: 4,
                            }
                        }
                    }
                });
            }
        }
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data]);

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex-grow relative">
                <canvas ref={chartRef}></canvas>
            </div>
        </div>
    );
};

const ProductivityChart: React.FC<{ data: { labels: string[], hours: number[] } }> = ({ data }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                gradient.addColorStop(0, 'rgba(0, 93, 34, 0.4)');
                gradient.addColorStop(1, 'rgba(0, 93, 34, 0)');
                chartInstance.current = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.labels,
                        datasets: [{
                            label: 'Average Hours Worked',
                            data: data.hours,
                            borderColor: '#005D22',
                            backgroundColor: gradient,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#005D22',
                            pointRadius: 0,
                            pointHoverRadius: 5,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                             y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.1)' } },
                             x: { 
                                grid: { display: false },
                                ticks: {
                                    maxRotation: 0,
                                    minRotation: 0,
                                    autoSkip: true,
                                    maxTicksLimit: 7,
                                }
                            }
                        },
                        plugins: { 
                            legend: {
                                display: true,
                                position: 'bottom',
                                align: 'center',
                                labels: {
                                    usePointStyle: true,
                                    pointStyle: 'rectRounded',
                                    boxWidth: 12,
                                    padding: 20,
                                    font: {
                                        family: "'Manrope', sans-serif",
                                        size: 12,
                                    }
                                }
                            },
                             tooltip: {
                                backgroundColor: '#0F172A',
                                titleFont: { family: "'Manrope', sans-serif" },
                                bodyFont: { family: "'Manrope', sans-serif" },
                                cornerRadius: 8,
                                padding: 10,
                                displayColors: true,
                                boxPadding: 4,
                            }
                        }
                    }
                });
            }
        }
    }, [data]);

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex-grow relative">
                <canvas ref={chartRef}></canvas>
            </div>
        </div>
    );
};


interface DashboardData {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    onLeaveToday: number;
    attendanceTrend: { labels: string[]; present: number[]; absent: number[] };
    productivityTrend: { labels: string[]; hours: number[] };
}

const AttendanceDashboard: React.FC = () => {
    const { user } = useAuthStore();
    const { permissions } = usePermissionsStore();

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    
    const [dateRange, setDateRange] = useState<Range[]>([
        { startDate: startOfToday(), endDate: endOfToday(), key: 'selection' }
    ]);
    const [activeDateFilter, setActiveDateFilter] = useState('Today');
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const datePickerRef = useRef<HTMLDivElement>(null);
    
    const canDownloadReport = user && permissions[user.role]?.includes('download_attendance_report');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setIsDatePickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    useEffect(() => {
        if (canDownloadReport) {
            api.getUsers().then(setAllUsers);
        }
    }, [canDownloadReport]);
    
    const fetchDashboardData = useCallback(async (startDate: Date, endDate: Date) => {
        setIsLoading(true);
        try {
            const data = await api.getAttendanceDashboardData(startDate, endDate, new Date());
            setDashboardData(data);
        } catch (error) {
            console.error("Failed to load dashboard data via RPC", error);
            // Optionally set a toast message here
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (dateRange[0].startDate && dateRange[0].endDate) {
            fetchDashboardData(dateRange[0].startDate, dateRange[0].endDate);
        }
    }, [dateRange, fetchDashboardData]);
    
    const handleSetDateFilter = (filter: string) => {
        setActiveDateFilter(filter);
        const today = new Date();
        let startDate = startOfToday();
        let endDate = endOfToday();

        if (filter === 'This Month') {
            startDate = startOfMonth(today);
            endDate = endOfMonth(today);
        } else if (filter === 'This Year') {
            startDate = startOfYear(today);
            endDate = endOfYear(today);
        } else if (filter === 'Last 7 Days') {
            startDate = subDays(today, 6);
        } else if (filter === 'Last 30 Days') {
            startDate = subDays(today, 29);
        }
        
        if (endDate > today) {
            endDate = today;
        }

        setDateRange([{ startDate, endDate, key: 'selection' }]);
    };

    const handleCustomDateChange = (item: RangeKeyDict) => {
        setDateRange([item.selection]);
        setActiveDateFilter('Custom');
        setIsDatePickerOpen(false);
    };

    const statDateLabel = useMemo(() => {
        const endDate = dateRange[0].endDate!;
        const today = new Date();
        if (format(endDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) return "Today";
        return `on ${format(endDate, 'MMM d')}`;
    }, [dateRange]);

    if (isLoading && !dashboardData) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
    }

    return (
        <div className="p-4 space-y-6">
            {isReportModalOpen && <ReportModal allUsers={allUsers} onClose={() => setIsReportModalOpen(false)} initialDateRange={dateRange[0]} />}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-primary-text">Attendance Dashboard</h2>
                {canDownloadReport && <Button variant="outline" onClick={() => setIsReportModalOpen(true)}><Download className="mr-2 h-4 w-4" /> Download Report</Button>}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                    {['Today', 'This Month', 'This Year'].map(filter => (
                        <Button key={filter} variant={activeDateFilter === filter ? 'primary' : 'secondary'} size="sm" onClick={() => handleSetDateFilter(filter)}>
                            {filter}
                        </Button>
                    ))}
                </div>
                <div className="relative" ref={datePickerRef}>
                    <Button variant="outline" size="sm" onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>
                            {activeDateFilter === 'Custom' ? `${format(dateRange[0].startDate!, 'dd MMM, yyyy')} - ${format(dateRange[0].endDate!, 'dd MMM, yyyy')}` : 'Custom Range'}
                        </span>
                    </Button>
                    {isDatePickerOpen && (
                        <div className="absolute top-full right-0 mt-2 z-10 bg-card border rounded-lg shadow-lg">
                            <DateRangePicker
                                onChange={handleCustomDateChange}
                                months={2}
                                ranges={dateRange}
                                direction="horizontal"
                                maxDate={new Date()}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Employees" value={dashboardData?.totalEmployees || 0} icon={Users} />
                <StatCard title={`Present ${statDateLabel}`} value={dashboardData?.presentToday || 0} icon={UserCheck} />
                <StatCard title={`Absent ${statDateLabel}`} value={dashboardData?.absentToday || 0} icon={UserX} />
                <StatCard title={`On Leave ${statDateLabel}`} value={dashboardData?.onLeaveToday || 0} icon={Clock} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ChartContainer title="Attendance Trend" icon={BarChart3}>
                    {dashboardData ? <AttendanceTrendChart data={dashboardData.attendanceTrend} /> : <Loader2 className="h-6 w-6 animate-spin text-muted mx-auto mt-20"/>}
                </ChartContainer>
                <ChartContainer title="Productivity Trend (Avg. Hours)" icon={TrendingUp}>
                    {dashboardData ? <ProductivityChart data={dashboardData.productivityTrend} /> : <Loader2 className="h-6 w-6 animate-spin text-muted mx-auto mt-20"/>}
                </ChartContainer>
            </div>
        </div>
    );
};

// --- Report Modal Component ---
type ReportFormat = 'monthlyMuster' | 'attendanceLog';

type MusterData = {
    userId: string;
    userName: string;
    dailyStatuses: { date: string, status: string }[];
}[];

const statusLegend: Record<string, string> = {
  P: 'Present', A: 'Absent', L: 'Leave', HL: 'Half-day Leave',
  HD: 'Half-day Present', SH: 'Short Hours', H: 'Holiday', WO: 'Week Off'
};

const AttendanceLogPdfComponent: React.FC<{ data: (AttendanceEvent & { userName: string })[]; dateRange: Range }> = ({ data, dateRange }) => {
    return (
        <div className="p-8 font-sans text-sm text-black bg-white">
            <div className="flex justify-between items-center border-b pb-4 mb-6">
                <Logo className="h-10" />
                <div className="text-right">
                    <h1 className="text-xl font-bold">Attendance Log</h1>
                    <p className="text-gray-600">{format(dateRange.startDate!, 'dd MMM yyyy')} to {format(dateRange.endDate!, 'dd MMM yyyy')}</p>
                </div>
            </div>
            <table className="w-full mt-6 text-left border-collapse">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="p-2 border border-gray-300">User</th>
                        <th className="p-2 border border-gray-300">Date</th>
                        <th className="p-2 border border-gray-300">Time</th>
                        <th className="p-2 border border-gray-300">Event</th>
                        <th className="p-2 border border-gray-300">Location</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map(event => (
                        <tr key={event.id} className="border-b">
                            <td className="p-2 border border-gray-300">{event.userName}</td>
                            <td className="p-2 border border-gray-300">{format(new Date(event.timestamp), 'dd MMM, yyyy')}</td>
                            <td className="p-2 border border-gray-300">{format(new Date(event.timestamp), 'hh:mm a')}</td>
                            <td className="p-2 border border-gray-300 capitalize">{event.type.replace('-', ' ')}</td>
                            <td className="p-2 border border-gray-300">{event.latitude ? `${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}` : 'N/A'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const MonthlyMusterPdfComponent: React.FC<{ data: MusterData; dateRange: Range }> = ({ data, dateRange }) => {
    const days = eachDayOfInterval({ start: dateRange.startDate!, end: dateRange.endDate! });

    return (
        <div className="p-8 font-sans text-[8px] text-black bg-white">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
                <Logo className="h-8" />
                <div className="text-right">
                    <h1 className="text-lg font-bold">Monthly Muster Report</h1>
                    <p className="text-gray-600">{format(dateRange.startDate!, 'dd MMM yyyy')} to {format(dateRange.endDate!, 'dd MMM yyyy')}</p>
                </div>
            </div>

            <table className="w-full border-collapse border border-gray-400">
                <thead>
                    <tr className="bg-gray-100 font-bold">
                        <td className="border p-1 border-gray-400 w-32">Employee Name</td>
                        {days.map(day => <td key={day.toISOString()} className="border p-1 border-gray-400 text-center w-6">{format(day, 'dd')}</td>)}
                    </tr>
                </thead>
                <tbody>
                    {data.map(user => {
                        const statusMap = new Map(user.dailyStatuses.map(ds => [ds.date, ds.status]));
                        return (
                            <tr key={user.userId}>
                                <td className="border p-1 border-gray-400 font-semibold">{user.userName}</td>
                                {days.map(day => {
                                    const status = statusMap.get(format(day, 'yyyy-MM-dd')) || '-';
                                    return <td key={day.toISOString()} className="border p-1 border-gray-400 text-center">{status}</td>
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="mt-4 text-[9px]">
                <h4 className="font-bold mb-1">Legend:</h4>
                <div className="grid grid-cols-4 gap-x-4 gap-y-1">
                    {Object.entries(statusLegend).map(([code, description]) => (
                        <div key={code}><span className="font-bold">{code}</span>: {description}</div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ReportModal: React.FC<{
    allUsers: User[];
    onClose: () => void;
    initialDateRange: Range;
}> = ({ allUsers, onClose, initialDateRange }) => {
    const [reportUser, setReportUser] = useState<string>('all');
    const [reportFormat, setReportFormat] = useState<ReportFormat>('monthlyMuster');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStatus, setGenerationStatus] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [reportError, setReportError] = useState('');
    const [pdfContent, setPdfContent] = useState<React.ReactElement | null>(null);
    const pdfRef = useRef<HTMLDivElement>(null);

    const generateClientSideMusterData = useCallback(async (
        usersToReport: User[],
        startDate: Date,
        endDate: Date
    ): Promise<MusterData> => {
        const { attendance: attendanceSettings, officeHolidays, fieldHolidays } = useSettingsStore.getState();

        const [allEvents, allLeaves] = await Promise.all([
            api.getAllAttendanceEvents(startDate.toISOString(), endDate.toISOString()),
            api.getLeaveRequests({
                userIds: usersToReport.map(u => u.id),
                startDate: format(startDate, 'yyyy-MM-dd'),
                endDate: format(endDate, 'yyyy-MM-dd')
            })
        ]);

        const eventsByUser = allEvents.reduce((acc, event) => {
            if (!acc[event.userId]) acc[event.userId] = [];
            acc[event.userId].push(event);
            return acc;
        }, {} as Record<string, AttendanceEvent[]>);

        const leavesByUser = allLeaves.reduce((acc, leave) => {
            if (!acc[leave.userId]) acc[leave.userId] = [];
            acc[leave.userId].push(leave);
            return acc;
        }, {} as Record<string, LeaveRequest[]>);

        const getStaffType = (role: UserRole): 'office' | 'field' => 
            (['admin', 'hr', 'finance'].includes(role) ? 'office' : 'field');

        const musterData: MusterData = [];

        for (const user of usersToReport) {
            const dailyStatuses: { date: string, status: string }[] = [];
            const staffType = getStaffType(user.role);
            const userHolidays = staffType === 'office' ? officeHolidays : fieldHolidays;
            const userHolidayDates = new Set(userHolidays.map(h => h.date));
            const userRules = attendanceSettings[staffType];
            const intervalDays = eachDayOfInterval({ start: startDate, end: endDate });

            for (const day of intervalDays) {
                const dayString = format(day, 'yyyy-MM-dd');
                const onLeave = (leavesByUser[user.id] || []).find(l => dayString >= l.startDate && dayString <= l.endDate);
                if (onLeave) {
                    dailyStatuses.push({ date: dayString, status: onLeave.dayOption === 'half' ? 'HL' : 'L' });
                    continue;
                }
                if (userHolidayDates.has(dayString)) {
                    dailyStatuses.push({ date: dayString, status: 'H' });
                    continue;
                }
                if (isSunday(day) || isSaturday(day)) {
                     dailyStatuses.push({ date: dayString, status: 'WO' });
                     continue;
                }
                const eventsForDay = (eventsByUser[user.id] || []).filter(e => format(new Date(e.timestamp), 'yyyy-MM-dd') === dayString);
                if (eventsForDay.length > 0) {
                    const checkIns = eventsForDay.filter(e => e.type === 'check-in').sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                    const checkOuts = eventsForDay.filter(e => e.type === 'check-out').sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    const firstCheckIn = checkIns[0];
                    const lastCheckOut = checkOuts[0];
                    
                    if (firstCheckIn && lastCheckOut) {
                        const workHours = differenceInHours(new Date(lastCheckOut.timestamp), new Date(firstCheckIn.timestamp));
                        if (workHours >= userRules.minimumHoursFullDay) dailyStatuses.push({ date: dayString, status: 'P' });
                        else if (workHours >= userRules.minimumHoursHalfDay) dailyStatuses.push({ date: dayString, status: 'HD' });
                        else dailyStatuses.push({ date: dayString, status: 'SH' });
                    } else if (firstCheckIn) {
                        if (day < startOfToday()) dailyStatuses.push({ date: dayString, status: 'A' });
                        else dailyStatuses.push({ date: dayString, status: 'P' }); // Incomplete today
                    } else {
                        dailyStatuses.push({ date: dayString, status: 'A' });
                    }
                } else {
                    dailyStatuses.push({ date: dayString, status: 'A' });
                }
            }
            musterData.push({ userId: user.id, userName: user.name, dailyStatuses });
        }
        return musterData;
    }, []);

    useEffect(() => {
        if (pdfContent && pdfRef.current) {
            const element = pdfRef.current;
            const opt = {
                margin: 0.5,
                filename: `Attendance_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
            };
            html2pdf().from(element).set(opt).save().then(() => {
                setPdfContent(null);
                setIsGenerating(false);
                setGenerationStatus('');
            });
        }
    }, [pdfContent]);

    useEffect(() => {
        let interval: number;
        if (isGenerating) {
            const statuses = ["Fetching data...", "Processing records...", "Compiling report...", "Almost there..."];
            let statusIndex = 0;
            setGenerationStatus(statuses[statusIndex]);
            interval = window.setInterval(() => {
                statusIndex = (statusIndex + 1) % statuses.length;
                setGenerationStatus(statuses[statusIndex]);
            }, 1500);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isGenerating]);

    const handleGenerate = async (formatType: 'csv' | 'pdf') => {
        setGenerationStatus('Preparing report...');
        setIsGenerating(true);
        setReportError('');
        
        const usersToFetch = reportUser === 'all'
            ? allUsers
            : allUsers.filter(u => u.id === reportUser);
        
        if (usersToFetch.length === 0) {
            setReportError('No user selected or found.');
            setIsGenerating(false);
            return;
        }

        if (!initialDateRange.startDate || !initialDateRange.endDate) {
            setReportError('Invalid date range selected.');
            setIsGenerating(false);
            return;
        }

        try {
            if (reportFormat === 'attendanceLog') {
                const userMap = new Map(allUsers.map(u => [u.id, u.name]));
                const userIdsToFetch = new Set(usersToFetch.map(u => u.id));

                const allEventsInRange = await api.getAllAttendanceEvents(initialDateRange.startDate!.toISOString(), initialDateRange.endDate!.toISOString());

                const allEvents = allEventsInRange
                    .filter(event => userIdsToFetch.has(event.userId))
                    .map(event => ({
                        ...event,
                        userName: userMap.get(event.userId) || 'Unknown User'
                    }))
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                if (allEvents.length === 0) throw new Error('No attendance data found for the selected criteria.');

                if (formatType === 'csv') {
                    const headers = ['User Name', 'Date', 'Time', 'Event Type', 'Location (Lat, Lng)'];
                    const rows = allEvents.map(e => [`"${e.userName.replace(/"/g, '""')}"`, format(new Date(e.timestamp), 'yyyy-MM-dd'), format(new Date(e.timestamp), 'HH:mm:ss'), e.type, e.latitude ? `${e.latitude},${e.longitude}` : ''].join(','));
                    const csvContent = [headers.join(','), ...rows].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.setAttribute('download', 'attendance_log.csv');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setIsGenerating(false);
                } else { // PDF
                    setPdfContent(<AttendanceLogPdfComponent data={allEvents} dateRange={initialDateRange} />);
                }

            } else if (reportFormat === 'monthlyMuster') {
                const musterData: MusterData = await generateClientSideMusterData(usersToFetch, initialDateRange.startDate, initialDateRange.endDate);

                if (musterData.length === 0) throw new Error('Could not generate muster data.');
                
                if (formatType === 'csv') {
                    const days = eachDayOfInterval({ start: initialDateRange.startDate, end: initialDateRange.endDate });
                    const headers = ['Employee Name', ...days.map(d => format(d, 'dd-MMM'))];
                    
                    const rows = musterData.map(user => {
                        const statusMap = new Map(user.dailyStatuses.map(ds => [ds.date, ds.status]));
                        const row = [`"${user.userName}"`];
                        days.forEach(day => {
                            row.push(statusMap.get(format(day, 'yyyy-MM-dd')) || '-');
                        });
                        return row.join(',');
                    });
                    
                    const csvContent = [headers.join(','), ...rows].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.setAttribute('download', 'monthly_muster.csv');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setIsGenerating(false);

                } else { // PDF
                     setPdfContent(<MonthlyMusterPdfComponent data={musterData} dateRange={initialDateRange} />);
                }
            }

        } catch (err: any) {
            setReportError(err.message || 'An error occurred while generating the report.');
            setIsGenerating(false);
            console.error(err);
        }
    };

    const handleGenerateCsv = () => handleGenerate('csv');
    const handleGeneratePdf = () => handleGenerate('pdf');

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
        {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
        <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '11in' }}><div ref={pdfRef}>{pdfContent}</div></div>
        
        <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-lg m-4 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
            {isGenerating ? (
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="p-4 rounded-full bg-accent-light animate-pulse-bg">
                        <Loader2 className="h-10 w-10 animate-spin text-accent" />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-primary-text">Generating Report</p>
                    <p className="text-muted">{generationStatus}</p>
                </div>
            ) : (
            <>
                <h3 className="text-lg font-bold text-primary-text mb-4">Generate Attendance Report</h3>
                <div className="space-y-4">
                    <div className="p-3 bg-page rounded-lg text-center">
                        <p className="text-sm font-medium text-muted">Report Period</p>
                        <p className="font-semibold text-primary-text">
                            {initialDateRange.startDate && format(initialDateRange.startDate, 'dd MMM, yyyy')} - {initialDateRange.endDate && format(initialDateRange.endDate, 'dd MMM, yyyy')}
                        </p>
                    </div>

                    <Select label="Employee" id="report-user" value={reportUser} onChange={e => setReportUser(e.target.value)}>
                        <option value="all">All Employees</option>
                        {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </Select>
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">Report Format</label>
                        <div className="flex gap-2 p-1 bg-page rounded-lg">
                            {(['monthlyMuster', 'attendanceLog'] as ReportFormat[]).map(type => (
                                <button key={type} onClick={() => setReportFormat(type)} className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${reportFormat === type ? 'bg-card shadow-sm' : 'hover:bg-card/50'}`}>
                                    {type === 'monthlyMuster' ? 'Monthly Muster' : 'Attendance Log'}
                                </button>
                            ))}
                        </div>
                    </div>
                    {reportError && <p className="text-sm text-red-600">{reportError}</p>}
                </div>
                <div className="flex justify-end gap-3 pt-6 mt-4 border-t">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleGenerateCsv}>Generate CSV</Button>
                    <Button onClick={handleGeneratePdf}>Generate PDF</Button>
                </div>
            </>
            )}
        </div>
      </div>
    );
};

export default AttendanceDashboard;