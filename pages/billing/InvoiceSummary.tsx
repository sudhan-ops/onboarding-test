import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import html2pdf from 'html2pdf.js';
import { api } from '../../services/api';
import type { Organization, InvoiceData } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Toast from '../../components/ui/Toast';
import { Loader2, Download, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import Logo from '../../components/ui/Logo';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

// New component for status chip
type InvoiceStatus = 'Not Generated' | 'Generated' | 'Sent' | 'Paid';
const InvoiceStatusChip: React.FC<{ status?: InvoiceStatus }> = ({ status }) => {
  if (!status) return <span className="text-xs text-muted">-</span>;
  // Updated styles for better contrast and UI consistency based on screenshot and UX principles
  const statusStyles: Record<InvoiceStatus, string> = {
    'Not Generated': 'bg-slate-700 text-white dark:bg-slate-600 dark:text-slate-200',
    'Generated': 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300',
    'Sent': 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    'Paid': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  };
  return (
    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status]}`}>{status}</span>
  );
};

// New component for the invoice modal content
const InvoiceContent: React.FC<{
    invoiceData: InvoiceData,
    discount: number,
    setDiscount: (d: number) => void,
    roundOff: number,
    setRoundOff: (r: number) => void
}> = ({ invoiceData, discount, setDiscount, roundOff, setRoundOff }) => {
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    const calculations = useMemo(() => {
        if (!invoiceData) return null;
        const subTotal = invoiceData.lineItems.reduce((acc, item) => {
            const amount = item.deployment * item.ratePerMonth;
            const isDeduction = item.description.toLowerCase().includes('deduction');
            return isDeduction ? acc - amount : acc + amount;
        }, 0);
        const serviceCharge = subTotal * 0.10;
        const grandTotal = subTotal + serviceCharge - discount;
        const gst = grandTotal * 0.09;
        const finalTotal = grandTotal + gst + gst + roundOff;
        return { subTotal, serviceCharge, grandTotal, gst, finalTotal };
    }, [invoiceData, discount, roundOff]);

    if (!calculations) return null;

    return (
         <div className="p-4 bg-white text-black text-[10px] printable-area">
            <div className="grid grid-cols-2">
                <div>
                    <p>Name : {invoiceData.siteName}</p>
                    <p>Address : {invoiceData.siteAddress}</p>
                    <p>City : {invoiceData.siteAddress.split(',').pop()?.trim()}</p>
                </div>
                <div className="border border-black">
                    <div className="grid grid-cols-2">
                        <div className="p-1 border-r border-b border-black">Invoice No</div>
                        <div className="p-1 border-b border-black">{invoiceData.invoiceNumber}</div>
                    </div>
                    <div className="grid grid-cols-2">
                        <div className="p-1 border-r border-b border-black">Date</div>
                        <div className="p-1 border-b border-black">{invoiceData.invoiceDate}</div>
                    </div>
                     <div className="grid grid-cols-2">
                        <div className="p-1 border-r border-b border-black">Month</div>
                        <div className="p-1 border-b border-black">{invoiceData.statementMonth.split('-')[0]}</div>
                    </div>
                    <div className="grid grid-cols-2">
                        <div className="p-1 border-r border-black">Due Date</div>
                        <div className="p-1">January 15, 2023</div>
                    </div>
                </div>
            </div>
            
            <div className="my-4 flex justify-center">
                <Logo className="h-10"/>
            </div>
            
            <h2 className="text-center font-bold text-sm underline mb-2">{invoiceData.siteName} Summary Statement for the month of {invoiceData.statementMonth}</h2>
            
            <table className="w-full border-collapse border border-black">
                <thead>
                    <tr className="font-bold bg-gray-200">
                        <td className="border p-1 border-black">Sl.No</td>
                        <td className="border p-1 border-black">Description</td>
                        <td className="border p-1 border-black">Deployment</td>
                        <td className="border p-1 border-black">No of Days</td>
                        <td className="border p-1 border-black">Rate/Day</td>
                        <td className="border p-1 border-black">Rate/Month</td>
                        <td className="border p-1 border-black">Amount(Rs)</td>
                    </tr>
                </thead>
                <tbody>
                     <tr>
                        <td className="border p-1 border-black font-bold" colSpan={7}>SERVICES (01/{format(new Date(invoiceData.statementMonth), 'MM/yyyy')} to {format(new Date(invoiceData.invoiceDate), 'dd/MM/yyyy')})</td>
                    </tr>
                    {invoiceData.lineItems.map((item, index) => {
                        const amount = item.deployment * item.ratePerMonth;
                        const isDeduction = item.description.toLowerCase().includes('deduction');
                        const isSpecial = item.deployment === 0;
                        return (
                        <tr key={item.id}>
                            <td className="border p-1 border-black text-center">{index + 1}</td>
                            <td className={`border p-1 border-black ${isDeduction ? 'text-red-600' : ''}`}>{item.description}</td>
                            <td className="border p-1 border-black text-center">{isSpecial ? '-' : item.deployment}</td>
                            <td className="border p-1 border-black text-center">{isSpecial ? '-' : item.noOfDays}</td>
                            <td className="border p-1 border-black text-right">{isSpecial ? '-' : formatCurrency(item.ratePerDay)}</td>
                            <td className="border p-1 border-black text-right">{isSpecial ? '-' : formatCurrency(item.ratePerMonth)}</td>
                            <td className={`border p-1 border-black text-right ${isDeduction ? 'text-red-600' : ''}`}>{formatCurrency(amount)}</td>
                        </tr>
                    )})}
                    {Array.from({length: Math.max(0, 10 - invoiceData.lineItems.length)}).map((_, i) => (
                        <tr key={`spacer-${i}`}><td className="border p-1 border-black h-6" colSpan={7}></td></tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={5} className="border p-1 border-black font-bold">Sub Total</td>
                        <td colSpan={2} className="border p-1 border-black text-right font-bold">{formatCurrency(calculations.subTotal)}</td>
                    </tr>
                     <tr>
                        <td colSpan={5} className="border p-1 border-black">Admin,Overheads and Service Charges 10% on Sub Total</td>
                        <td colSpan={2} className="border p-1 border-black text-right">{formatCurrency(calculations.serviceCharge)}</td>
                    </tr>
                     <tr className="no-print">
                        <td colSpan={5} className="border p-1 border-black font-bold text-red-600">Discount</td>
                        <td colSpan={2} className="border p-1 border-black text-right">
                            <Input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="text-right !p-1" />
                        </td>
                    </tr>
                     <tr>
                        <td colSpan={5} className="border p-1 border-black font-bold">Grand Total</td>
                        <td colSpan={2} className="border p-1 border-black text-right font-bold">{formatCurrency(calculations.grandTotal)}</td>
                    </tr>
                     <tr>
                        <td colSpan={3} className="border p-1 border-black">Central GST</td>
                        <td colSpan={2} className="border p-1 border-black text-center">9.00%</td>
                        <td colSpan={2} className="border p-1 border-black text-right">{formatCurrency(calculations.gst)}</td>
                    </tr>
                      <tr>
                        <td colSpan={3} className="border p-1 border-black">State GST</td>
                        <td colSpan={2} className="border p-1 border-black text-center">9.00%</td>
                        <td colSpan={2} className="border p-1 border-black text-right">{formatCurrency(calculations.gst)}</td>
                    </tr>
                     <tr>
                        <td colSpan={5} className="border p-1 border-black">Round off</td>
                        <td colSpan={2} className="border p-1 border-black text-right">
                           <span className="print-only">{formatCurrency(roundOff)}</span>
                           <span className="no-print"><Input type="number" step="0.01" value={roundOff} onChange={e => setRoundOff(parseFloat(e.target.value) || 0)} className="text-right !p-1" /></span>
                        </td>
                     </tr>
                     <tr className="bg-gray-200 font-bold text-base">
                        <td colSpan={5} className="border p-2 border-black">Payable for Services rendered</td>
                        <td colSpan={2} className="border p-2 border-black text-right">{formatCurrency(calculations.finalTotal)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};


const InvoiceSummary: React.FC = () => {
    const [sites, setSites] = useState<Organization[]>([]);
    const [isLoadingSites, setIsLoadingSites] = useState(true);
    const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
    
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [statuses, setStatuses] = useState<Record<string, InvoiceStatus>>({});
    
    // Modal State
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        site: Organization | null;
        invoiceData: InvoiceData | null;
        isLoading: boolean;
    }>({ isOpen: false, site: null, invoiceData: null, isLoading: false });

    const [discount, setDiscount] = useState(0);
    const [roundOff, setRoundOff] = useState(0.20);
    
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const pdfRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        api.getOrganizations()
            .then(orgs => setSites(orgs.sort((a,b) => a.shortName.localeCompare(b.shortName))))
            .catch(() => setToast({ message: "Failed to load sites.", type: 'error' }))
            .finally(() => setIsLoadingSites(false));
    }, []);

    const fetchStatuses = useCallback(async (month: string) => {
        setIsLoadingStatuses(true);
        try {
            const date = new Date(month + '-02');
            const statusData = await api.getInvoiceStatuses(date);
            setStatuses(statusData);
        } catch (error) {
            setToast({ message: "Failed to fetch invoice statuses.", type: 'error' });
        } finally {
            setIsLoadingStatuses(false);
        }
    }, []);

    useEffect(() => {
        if (selectedMonth) {
            fetchStatuses(selectedMonth);
        }
    }, [selectedMonth, fetchStatuses]);

    const handleViewInvoice = async (site: Organization) => {
        setModalState({ isOpen: true, site, invoiceData: null, isLoading: true });
        try {
            const date = new Date(selectedMonth + '-02');
            const data = await api.getInvoiceSummaryData(site.id, date);
            setModalState({ isOpen: true, site, invoiceData: data, isLoading: false });
        } catch (error) {
            setToast({ message: 'Failed to fetch invoice data.', type: 'error' });
            setModalState({ isOpen: false, site: null, invoiceData: null, isLoading: false });
        }
    };

    const handleModalDownload = () => {
        const element = pdfRef.current;
        if (!element || !modalState.invoiceData) {
            setToast({ message: 'Could not find invoice to export.', type: 'error' });
            return;
        }
        const opt = {
            margin: 0.25,
            filename: `Invoice_${modalState.invoiceData.siteName.replace(' ','_')}_${modalState.invoiceData.statementMonth}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
        };
        html2pdf().from(element).set(opt).save();
    };

    const closeModal = () => {
        setModalState({ isOpen: false, site: null, invoiceData: null, isLoading: false });
        setDiscount(0);
        setRoundOff(0.20);
    };

    if (isLoadingSites) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent"/></div>;
    }

    return (
        <div className="p-4 md:p-0">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            
             <div className="md:bg-card md:p-6 md:rounded-xl md:shadow-card">
                <AdminPageHeader title="Invoice Summary" />

                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <h3 className="text-xl font-semibold text-primary-text">Monthly Invoice Status</h3>
                        <div className="md:w-56">
                            <Input label="" id="month-select" type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm responsive-table">
                            <thead className="bg-page">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-muted">Site Name</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted">Invoice Status</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border md:bg-card md:divide-y-0">
                                {sites.map(site => (
                                    <tr key={site.id}>
                                        <td data-label="Site Name" className="px-4 py-3 font-medium">{site.shortName}</td>
                                        <td data-label="Status" className="px-4 py-3">
                                            {isLoadingStatuses ? <Loader2 className="h-4 w-4 animate-spin" /> : <InvoiceStatusChip status={statuses[site.id]} />}
                                        </td>
                                        <td data-label="Actions" className="px-4 py-3">
                                            <div className="flex items-center gap-2 justify-end md:justify-start">
                                                <Button variant="icon" size="sm" onClick={() => handleViewInvoice(site)} disabled={statuses[site.id] === 'Not Generated' || isLoadingStatuses} title="View Invoice">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="icon" size="sm" onClick={() => handleViewInvoice(site)} disabled={statuses[site.id] === 'Not Generated' || isLoadingStatuses} title="Download Invoice">
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {modalState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4" onClick={closeModal}>
                    <div className="bg-card rounded-xl shadow-card w-full max-w-4xl m-4 animate-fade-in-scale flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b flex justify-between items-center no-print">
                            <h3 className="text-lg font-bold text-primary-text">Invoice for {modalState.site?.shortName}</h3>
                            <Button variant="icon" onClick={closeModal}><X className="h-5 w-5"/></Button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-4 max-h-[70vh]">
                            {modalState.isLoading ? (
                                <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent"/></div>
                            ) : modalState.invoiceData ? (
                                <div ref={pdfRef}>
                                    <InvoiceContent invoiceData={modalState.invoiceData} discount={discount} setDiscount={setDiscount} roundOff={roundOff} setRoundOff={setRoundOff} />
                                </div>
                            ) : (
                                <p className="text-center text-muted">No data to display.</p>
                            )}
                        </div>
                         <div className="p-4 border-t flex justify-end no-print">
                            <Button onClick={handleModalDownload} disabled={!modalState.invoiceData}>
                                <Download className="mr-2 h-4 w-4"/> Download PDF
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceSummary;