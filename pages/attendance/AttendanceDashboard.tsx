import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import html2pdf from 'html2pdf.js';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { usePermissionsStore } from '../../store/permissionsStore';
import type { AttendanceEvent, DailyAttendanceRecord, DailyAttendanceStatus, User, LeaveRequest, Holiday, AttendanceSettings, OnboardingData, Organization, UserRole } from '../../types';
import { format, getDaysInMonth, addDays, startOfToday, endOfToday, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, eachDayOfInterval, differenceInHours, differenceInMinutes, isSaturday, isSunday } from 'date-fns';
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
import { useThemeStore } from '../../store/themeStore';
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
                {canDownloadReport && <Button type="button" variant="outline" onClick={() => setIsReportModalOpen(true)}><Download className="mr-2 h-4 w-4" /> Download Report</Button>}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                    {['Today', 'This Month', 'This Year'].map(filter => (
                        <Button key={filter} type="button" variant={activeDateFilter === filter ? 'primary' : 'secondary'} size="sm" onClick={() => handleSetDateFilter(filter)}>
                            {filter}
                        </Button>
                    ))}
                </div>
                <div className="relative" ref={datePickerRef}>
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}>
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
type ReportFormat = 'basicReport' | 'attendanceLog';
type BasicReportDataRow = {
    date: string;
    userName: string;
    status: DailyAttendanceStatus | 'On Leave (Full)' | 'On Leave (Half)' | 'Short Hours';
    checkIn: string | null;
    checkOut: string | null;
    duration: string | null;
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

const BasicReportPdfComponent: React.FC<{ data: BasicReportDataRow[]; dateRange: Range }> = ({ data, dateRange }) => {
    return (
        <div className="p-8 font-sans text-[9px] text-black bg-white">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
                <Logo className="h-8" />
                <div className="text-right">
                    <h1 className="text-lg font-bold">Basic Attendance Report</h1>
                    <p className="text-gray-600">{format(dateRange.startDate!, 'dd MMM yyyy')} to {format(dateRange.endDate!, 'dd MMM yyyy')}</p>
                </div>
            </div>

            <table className="w-full border-collapse border border-gray-400">
                <thead>
                    <tr className="bg-gray-200 font-bold">
                        <td className="border p-1 border-gray-400">Employee Name</td>
                        <td className="border p-1 border-gray-400">Date</td>
                        <td className="border p-1 border-gray-400">Status</td>
                        <td className="border p-1 border-gray-400">Check In</td>
                        <td className="border p-1 border-gray-400">Check Out</td>
                        <td className="border p-1 border-gray-400">Hours Worked</td>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row: BasicReportDataRow, index: number) => (
                        <tr key={`${row.userName}-${row.date}-${index}`}>
                            <td className="border p-1 border-gray-400">{row.userName}</td>
                            {/* FIX: Cast row.date to string before calling replace to fix type error. */}
                            <td className="border p-1 border-gray-400">{format(new Date(String(row.date).replace(/-/g, '/')), 'dd MMM, yyyy')}</td>
                            <td className="border p-1 border-gray-400">{row.status}</td>
                            <td className="border p-1 border-gray-400">{row.checkIn || '-'}</td>
                            <td className="border p-1 border-gray-400">{row.checkOut || '-'}</td>
                            <td className="border p-1 border-gray-400">{row.duration || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const ReportModal: React.FC<{
    allUsers: User[];
    onClose: () => void;
    initialDateRange: Range;
}> = ({ allUsers, onClose, initialDateRange }) => {
    const { theme } = useThemeStore();
    const [reportUser, setReportUser] = useState<string>('all');
    const [reportFormat, setReportFormat] = useState<ReportFormat>('basicReport');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStatus, setGenerationStatus] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [reportError, setReportError] = useState('');
    const [pdfContent, setPdfContent] = useState<React.ReactElement | null>(null);
    const pdfRef = useRef<HTMLDivElement>(null);

    const generateClientSideBasicReportData = useCallback(async (
        usersToReport: User[],
        startDate: Date,
        endDate: Date
    ): Promise<BasicReportDataRow[]> => {
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

        const reportData: BasicReportDataRow[] = [];

        for (const user of usersToReport) {
            const staffType = getStaffType(user.role);
            const userHolidays = staffType === 'office' ? officeHolidays : fieldHolidays;
            const userHolidayDates = new Set(userHolidays.map(h => h.date));
            const userRules = attendanceSettings[staffType];
            const intervalDays = eachDayOfInterval({ start: startDate, end: endDate });

            for (const day of intervalDays) {
                const dayString = format(day, 'yyyy-MM-dd');
                const onLeave = (leavesByUser[user.id] || []).find(l => dayString >= l.startDate && dayString <= l.endDate);
                const eventsForDay = (eventsByUser[user.id] || []).filter(e => format(new Date(e.timestamp), 'yyyy-MM-dd') === dayString);

                let status: BasicReportDataRow['status'] = 'Absent';
                let checkIn: string | null = null;
                let checkOut: string | null = null;
                let duration: string | null = null;
                
                if (onLeave) {
                    status = onLeave.dayOption === 'half' ? 'On Leave (Half)' : 'On Leave (Full)';
                } else if (userHolidayDates.has(dayString)) {
                    status = 'Holiday';
                } else if (isSunday(day) || isSaturday(day)) {
                     status = 'Weekend';
                } else if (eventsForDay.length > 0) {
                    const checkIns = eventsForDay.filter(e => e.type === 'check-in').sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                    const checkOuts = eventsForDay.filter(e => e.type === 'check-out').sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    const firstCheckIn = checkIns[0];
                    const lastCheckOut = checkOuts[0];
                    
                    if(firstCheckIn) checkIn = format(new Date(firstCheckIn.timestamp), 'HH:mm');

                    if (firstCheckIn && lastCheckOut) {
                        checkOut = format(new Date(lastCheckOut.timestamp), 'HH:mm');
                        const diffMinutes = differenceInMinutes(new Date(lastCheckOut.timestamp), new Date(firstCheckIn.timestamp));
                        const workHours = diffMinutes / 60.0;
                        const hours = Math.floor(diffMinutes / 60);
                        const minutes = diffMinutes % 60;
                        duration = `${hours}h ${minutes}m`;

                        if (workHours >= userRules.minimumHoursFullDay) status = 'Present';
                        else if (workHours >= userRules.minimumHoursHalfDay) status = 'Half Day';
                        else status = 'Short Hours';
                    } else if (firstCheckIn) {
                        if (day < startOfToday()) {
                            status = 'Absent'; // Incomplete from a past day is Absent
                        } else {
                            status = 'Incomplete'; // Still present today
                        }
                    } else {
                        status = 'Absent';
                    }
                } else {
                    status = 'Absent';
                }

                reportData.push({ date: dayString, userName: user.name, status, checkIn, checkOut, duration });
            }
        }
        return reportData;
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
            html2pdf().from(element).set(opt).save();
        }
    }, [pdfContent]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setReportError('');
        setPdfContent(null);
        
        try {
            const usersToReport = reportUser === 'all' ? allUsers : allUsers.filter(u => u.id === reportUser);
            if (usersToReport.length === 0) throw new Error("No users selected for the report.");

            if (reportFormat === 'attendanceLog') {
                setGenerationStatus('Fetching event logs...');
                const allEvents = await api.getAllAttendanceEvents(initialDateRange.startDate!.toISOString(), initialDateRange.endDate!.toISOString());
                const eventsToReport = allEvents
                    .filter(e => reportUser === 'all' || e.userId === reportUser)
                    .map(e => ({...e, userName: allUsers.find(u => u.id === e.userId)?.name || 'Unknown'}));
                
                setGenerationStatus('Preparing document...');
                setPdfContent(<AttendanceLogPdfComponent data={eventsToReport} dateRange={initialDateRange} />);

            } else { // basicReport
                setGenerationStatus('Calculating daily statuses...');
                const reportData = await generateClientSideBasicReportData(usersToReport, initialDateRange.startDate!, initialDateRange.endDate!);
                
                setGenerationStatus('Preparing document...');
                setPdfContent(<BasicReportPdfComponent data={reportData} dateRange={initialDateRange} />);
            }

        } catch (error: any) {
            setReportError(error.message || 'An unexpected error occurred.');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleDownloadPdf = () => {
        const element = pdfRef.current;
        if (element) {
            const opt = {
                margin: 0.5,
                filename: `Attendance_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
            };
            html2pdf().from(element).set(opt).outputPdf('bloburl').then((pdfBlobUrl) => {
                const link = document.createElement('a');
                link.href = pdfBlobUrl;
                link.download = opt.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        }
    };
    
    const handleDownloadCsv = () => {
        if (!pdfContent) return;

        let dataToExport, columns;
        if (reportFormat === 'basicReport') {
            dataToExport = (pdfContent.props.data as BasicReportDataRow[]).map(row => ({
                Date: format(new Date(String(row.date).replace(/-/g, '/')), 'dd-MM-yyyy'),
                'Employee Name': row.userName,
                Status: row.status,
                'Check In': row.checkIn || '',
                'Check Out': row.checkOut || '',
                'Hours Worked': row.duration || '',
            }));
            columns = ['Date', 'Employee Name', 'Status', 'Check In', 'Check Out', 'Hours Worked'];
        } else { // attendanceLog
            dataToExport = (pdfContent.props.data as (AttendanceEvent & { userName: string })[]).map(event => ({
                User: event.userName,
                Date: format(new Date(event.timestamp), 'dd-MM-yyyy'),
                Time: format(new Date(event.timestamp), 'HH:mm:ss'),
                Event: event.type,
                Location: event.latitude ? `${event.latitude}, ${event.longitude}` : '',
            }));
            columns = ['User', 'Date', 'Time', 'Event', 'Location'];
        }

        const header = columns.join(',');
        const rows = dataToExport.map(row => 
            columns.map(col => {
                const val = row[col as keyof typeof row] || '';
                const strVal = String(val);
                if (strVal.includes(',')) return `"${strVal}"`;
                return strVal;
            }).join(',')
        );
        const csvData = [header, ...rows].join('\n');

        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'attendance_report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
            <div className={`bg-card rounded-xl shadow-card p-6 w-full max-w-lg m-4 animate-fade-in-scale ${theme === 'dark' ? 'pro-dark-theme' : ''}`} onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-primary-text mb-4">Download Attendance Report</h3>
                <div className="space-y-4">
                    <p className="text-sm text-muted">
                        Report will be generated for the currently selected date range: <strong>{format(initialDateRange.startDate!, 'dd MMM')} - {format(initialDateRange.endDate!, 'dd MMM')}</strong>.
                    </p>
                    <Select label="Select User(s)" id="report-user" value={reportUser} onChange={e => setReportUser(e.target.value)}>
                        <option value="all">All Users</option>
                        {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </Select>
                     <Select label="Report Format" id="report-format" value={reportFormat} onChange={e => setReportFormat(e.target.value as ReportFormat)}>
                        <option value="basicReport">Basic Daily Report</option>
                        <option value="attendanceLog">Detailed Attendance Log</option>
                    </Select>
                </div>
                {isGenerating && <div className="mt-4 text-sm text-muted flex items-center"><Loader2 className="h-4 w-4 animate-spin mr-2"/> {generationStatus}</div>}
                {reportError && <div className="mt-4 text-sm text-red-500">{reportError}</div>}
                <div className="mt-6 flex justify-between items-center">
                    <div>
                        {pdfContent && (
                             <div className="flex gap-2">
                                <Button onClick={handleDownloadPdf} variant="outline" size="sm">Download PDF</Button>
                                <Button onClick={handleDownloadCsv} variant="outline" size="sm">Download CSV</Button>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={onClose} variant="secondary">Cancel</Button>
                        <Button onClick={handleGenerate} isLoading={isGenerating}>Generate</Button>
                    </div>
                </div>
                {/* Hidden div for PDF generation */}
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}><div ref={pdfRef}>{pdfContent}</div></div>
            </div>
        </div>
    );
};


export default AttendanceDashboard;
