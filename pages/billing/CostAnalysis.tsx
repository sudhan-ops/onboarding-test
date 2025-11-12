import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { api } from '../../services/api';
import type { SubmissionCostBreakdown, VerificationCosts, VerificationCostSetting } from '../../types';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { DateRangePicker, type Range, type RangeKeyDict } from 'react-date-range';
import { format, startOfToday, subDays } from 'date-fns';
import { Loader2, Download, IndianRupee, Users, Settings, Save, ChevronDown, FileText, Plus, Trash2, Calendar } from 'lucide-react';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import { useSettingsStore } from '../../store/settingsStore';
import Input from '../../components/ui/Input';
import Toast from '../../components/ui/Toast';
import { useMediaQuery } from '../../hooks/useMediaQuery';


// Mobile Card component for the detailed report
const CostReportCard: React.FC<{ item: SubmissionCostBreakdown }> = ({ item }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-semibold text-primary-text">{item.employeeName}</p>
                    <p className="text-sm text-muted">{item.employeeId}</p>
                    <p className="text-xs text-muted mt-1">{format(new Date(item.enrollmentDate.replace(/-/g, '/')), 'dd MMM, yyyy')}</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-accent">₹{item.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
            </div>
            {item.breakdown.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="flex justify-between items-center w-full text-sm text-muted">
                        <span>Details</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isExpanded && (
                        <ul className="list-disc list-inside space-y-1 mt-2 text-sm text-muted animate-fade-in-down">
                            {item.breakdown.map((b, i) => (
                                <li key={i}>{b.name}: ₹{(b.cost || 0).toFixed(2)}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

// Skeleton for mobile card view
const MobileReportSkeleton: React.FC = () => (
    <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3 skeleton-pulse">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <div className="h-5 w-32 bg-gray-300 rounded"></div>
                        <div className="h-4 w-24 bg-gray-300 rounded"></div>
                    </div>
                    <div className="h-6 w-20 bg-gray-300 rounded"></div>
                </div>
                <div className="h-4 w-1/4 bg-gray-300 rounded mt-2"></div>
            </div>
        ))}
    </div>
);


const CostAnalysis: React.FC = () => {
    const [data, setData] = useState<SubmissionCostBreakdown[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { verificationCosts: costsFromStore, updateVerificationCosts } = useSettingsStore();

    const [editableCosts, setEditableCosts] = useState<VerificationCosts>(costsFromStore);
    const [isConfigDirty, setIsConfigDirty] = useState(false);
    
    const [dateRange, setDateRange] = useState<Range[]>([{
        startDate: subDays(new Date(), 29), // Default to Last 30 days
        endDate: new Date(),
        key: 'selection'
    }]);
    const [activeDateFilter, setActiveDateFilter] = useState('Last 30 Days');
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const datePickerRef = useRef<HTMLDivElement>(null);
    
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const pdfRef = useRef<HTMLDivElement>(null);
    const isMobile = useMediaQuery('(max-width: 767px)');


    const fetchData = useCallback(async () => {
        const startDate = dateRange[0]?.startDate;
        const endDate = dateRange[0]?.endDate;
        if (!startDate || !endDate) return;

        setIsLoading(true);
        try {
            const result = await api.getVerificationCostBreakdown(format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'));
            setData(result);
        } catch (error) {
            console.error("Failed to fetch cost breakdown", error);
            setToast({ message: "Failed to load verification data.", type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
        setEditableCosts(costsFromStore);
    }, [costsFromStore]);
    
    useEffect(() => {
        setIsConfigDirty(JSON.stringify(editableCosts) !== JSON.stringify(costsFromStore));
    }, [editableCosts, costsFromStore]);

    // FIX: Made handleCostChange more type-safe to prevent type pollution in the store.
    const handleCostChange = (id: string, field: 'name' | 'cost', value: string) => {
        setEditableCosts(prev => prev.map(item => {
            if (item.id === id) {
                if (field === 'cost') {
                    return { ...item, cost: parseFloat(value) || 0 };
                }
                return { ...item, name: value };
            }
            return item;
        }));
    };

    const handleAddItem = () => {
        setEditableCosts(prev => [...prev, { id: `new_${Date.now()}`, name: 'New Verification Type', cost: 0 }]);
    };

    const handleRemoveItem = (id: string) => {
        setEditableCosts(prev => prev.filter(item => item.id !== id));
    };

    const handleSaveCosts = () => {
        updateVerificationCosts(editableCosts);
        setToast({ message: 'Costs updated successfully!', type: 'success' });
    };
    
    const processedData = useMemo(() => {
        const costsMap = new Map(costsFromStore.map(c => [c.name, c.cost]));
        return data.map(submission => {
            const newBreakdown = submission.breakdown.map(item => ({
                ...item,
                // FIX: Added explicit Number() casting to defend against potentially malformed data and resolve type errors.
                cost: Number(costsMap.get(item.name)) || 0,
            }));
            const newTotalCost = newBreakdown.reduce((sum, item) => sum + ((item.cost || 0) * item.count), 0);
            return {
                ...submission,
                breakdown: newBreakdown,
                totalCost: newTotalCost,
            };
        });
    }, [data, costsFromStore]);

    const summaryStats = useMemo(() => {
        const totalEmployees = processedData.length;
        const totalCost = processedData.reduce((sum, item) => sum + item.totalCost, 0);
        const averageCost = totalEmployees > 0 ? totalCost / totalEmployees : 0;
        return { totalEmployees, totalCost, averageCost };
    }, [processedData]);

    const verificationUsageBreakdown = useMemo(() => {
        const usage: { [key: string]: { count: number; total: number } } = {};
        
        processedData.forEach(sub => {
            sub.breakdown.forEach(item => {
                if (!usage[item.name]) {
                    usage[item.name] = { count: 0, total: 0 };
                }
                usage[item.name].count += item.count;
                usage[item.name].total += (item.cost || 0) * item.count;
            });
        });

        return Object.entries(usage).map(([name, data]) => ({ name, ...data }));
    }, [processedData]);

    const handleExport = (type: 'csv' | 'pdf') => {
        // PDF generation logic here
    };
    
    const dateFilters = [
        { label: 'Today', value: 'Today' },
        { label: 'Last 7 Days', value: 'Last 7 Days' },
        { label: 'Last 30 Days', value: 'Last 30 Days' },
    ];
    
    const handleSetDateFilter = (filter: string) => {
        const end = new Date();
        let start = new Date();
        if (filter === 'Today') {
            start = startOfToday();
        } else if (filter === 'Last 7 Days') {
            start = subDays(end, 6);
        } else if (filter === 'Last 30 Days') {
            start = subDays(end, 29);
        }
        setActiveDateFilter(filter);
        setDateRange([{ startDate: start, endDate: end, key: 'selection' }]);
        setIsDatePickerOpen(false);
    };

    const handleCustomDateChange = (item: RangeKeyDict) => {
        setDateRange([item.selection]);
    };

    return (
        <div className="p-4 space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            
            <AdminPageHeader title="Verification Costing">
                 <div className="w-full sm:w-auto">
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:flex-wrap">
                        {dateFilters.map(filter => (
                            <Button key={filter.value} variant={activeDateFilter === filter.value ? 'outline' : 'secondary'} size="sm" onClick={() => handleSetDateFilter(filter.value)} className="justify-center">
                                {filter.label}
                            </Button>
                        ))}
                        <div className="relative" ref={datePickerRef}>
                            <Button 
                                variant={activeDateFilter === 'Custom' ? 'outline' : 'secondary'} 
                                size="sm" 
                                onClick={() => { setIsDatePickerOpen(prev => !prev); setActiveDateFilter('Custom'); }}
                                className="w-full justify-center"
                            >
                                <Calendar className="mr-2 h-4 w-4" />
                                <span>Custom Range</span>
                            </Button>
                            {isDatePickerOpen && (
                                <div className="absolute top-full right-0 mt-2 z-10 bg-card border rounded-lg shadow-lg">
                                    <DateRangePicker
                                        onChange={handleCustomDateChange}
                                        ranges={dateRange}
                                        maxDate={new Date()}
                                        direction="horizontal"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </AdminPageHeader>

            <div className="bg-card p-4 md:p-6 rounded-xl shadow-card">
                <details className="group">
                    <summary className="cursor-pointer flex justify-between items-center list-none">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-primary-text"><Settings className="h-5 w-5 text-muted"/> Cost Configuration</h3>
                        <ChevronDown className="transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-4 pt-4 border-t">
                         <div className="space-y-2">
                            {editableCosts.map((item) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-12 sm:col-span-6">
                                        <Input
                                            aria-label="Cost Item Name"
                                            value={item.name}
                                            onChange={e => handleCostChange(item.id, 'name', e.target.value)}
                                            className="!py-2"
                                        />
                                    </div>
                                    <div className="col-span-8 sm:col-span-4">
                                        <Input
                                            aria-label="Cost Value"
                                            type="number"
                                            step="0.01"
                                            value={item.cost || 0}
                                            onChange={e => handleCostChange(item.id, 'cost', e.target.value)}
                                            className="!py-2"
                                        />
                                    </div>
                                    <div className="col-span-4 sm:col-span-2 text-right">
                                        <Button variant="icon" onClick={() => handleRemoveItem(item.id)} aria-label={`Remove ${item.name}`}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-between items-center">
                            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                                <Plus className="mr-2 h-4" /> Add Cost Item
                            </Button>
                            <Button onClick={handleSaveCosts} disabled={!isConfigDirty}><Save className="mr-2 h-4"/> Save Costs</Button>
                        </div>
                    </div>
                </details>
            </div>
            
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Verification Cost" value={`₹${summaryStats.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={IndianRupee} />
                <StatCard title="Total Verified Employees" value={summaryStats.totalEmployees} icon={Users} />
                <StatCard title="Avg. Cost Per Employee" value={`₹${summaryStats.averageCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={IndianRupee} />
            </div>

            <div className="md:bg-card md:p-6 md:rounded-xl md:shadow-card">
                <h3 className="text-lg font-semibold mb-4 text-primary-text">Verification Usage Breakdown</h3>
                {isLoading ? (
                    <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin text-muted"/></div>
                ) : verificationUsageBreakdown.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {verificationUsageBreakdown.map(item => (
                            <div key={item.name} className="bg-page p-4 rounded-lg border">
                                <p className="text-sm font-medium text-muted">{item.name}</p>
                                <p className="text-2xl font-bold text-primary-text">{item.count}</p>
                                <p className="text-sm font-semibold text-accent-dark">Total: ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-muted py-8">No verification data for this period.</p>
                )}
            </div>
            
            <div className="md:bg-card md:p-6 md:rounded-xl md:shadow-card">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-primary-text">Detailed Report</h3>
                </div>
                 <div className="mt-4 pt-4 border-t border-border">
                    {isMobile ? (
                        isLoading ? <MobileReportSkeleton /> :
                        processedData.length === 0 ? <p className="text-center text-muted py-8">No report data for this period.</p> :
                        <div className="space-y-4">
                            {processedData.map(item => <CostReportCard key={item.id} item={item} />)}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border responsive-table">
                                <thead className="bg-page">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Employee</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Enrollment Date</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Cost Breakdown</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted uppercase">Total Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr><td colSpan={4} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted mx-auto"/></td></tr>
                                    ) : processedData.length === 0 ? (
                                        <tr><td colSpan={4} className="text-center py-10 text-muted">No report data for this period.</td></tr>
                                    ) : (
                                        processedData.map((item) => (
                                            <tr key={item.id}>
                                                <td data-label="Employee" className="px-6 py-4">
                                                    <div className="font-medium text-primary-text">{item.employeeName}</div>
                                                    <div className="text-sm text-muted">{item.employeeId}</div>
                                                </td>
                                                <td data-label="Enrollment Date" className="px-6 py-4 whitespace-nowrap text-sm text-muted">{format(new Date(item.enrollmentDate.replace(/-/g, '/')), 'dd MMM, yyyy')}</td>
                                                <td data-label="Cost Breakdown" className="px-6 py-4 text-sm text-muted">
                                                    <ul className="list-disc list-inside space-y-1">
                                                        {item.breakdown.map((b, i) => (
                                                            <li key={i}>{b.name}: ₹{(b.cost || 0).toFixed(2)}</li>
                                                        ))}
                                                        {item.breakdown.length === 0 && <li>No verifications performed</li>}
                                                    </ul>
                                                </td>
                                                <td data-label="Total Cost" className="px-6 py-4 whitespace-nowrap text-right font-semibold text-primary-text">₹{item.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CostAnalysis;