import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { api } from '../../services/api';
import type { BackOfficeIdSeries } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Toast from '../ui/Toast';
import { Loader2, Plus, Trash2, Save, Upload, Download, FileText } from 'lucide-react';

const CSV_HEADERS = ['Department', 'Designation', 'PermanentId', 'TemporaryId'];

const toCSV = (data: BackOfficeIdSeries[]): string => {
    const header = CSV_HEADERS.join(',');
    const rows = data.map(row => 
        [row.department, row.designation, row.permanentId, row.temporaryId]
        .map(val => {
            const strVal = String(val ?? '');
            if (strVal.includes(',')) return `"${strVal}"`;
            return strVal;
        }).join(',')
    );
    return [header, ...rows].join('\n');
};

const fromCSV = (csvText: string): Partial<BackOfficeIdSeries>[] => {
    const lines = csvText.trim().replace(/\r/g, '').split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['Department', 'Designation', 'PermanentId', 'TemporaryId'];
    if (!requiredHeaders.every(h => headers.includes(h))) {
        throw new Error('CSV is missing required headers.');
    }

    return lines.slice(1).map(line => {
        const values = line.split(',');
        const row: Partial<BackOfficeIdSeries> = {};
        headers.forEach((header, index) => {
            if (header === 'Department') row.department = values[index];
            if (header === 'Designation') row.designation = values[index];
            if (header === 'PermanentId') row.permanentId = values[index];
            if (header === 'TemporaryId') row.temporaryId = values[index];
        });
        return row;
    });
};


const BackofficeHeadsConfig: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const importRef = useRef<HTMLInputElement>(null);

    const { register, control, handleSubmit, reset, watch } = useForm<{ series: BackOfficeIdSeries[] }>({
        defaultValues: { series: [] }
    });
    const { fields, append, remove, replace } = useFieldArray({ control, name: "series" });

    useEffect(() => {
        setIsLoading(true);
        api.getBackOfficeIdSeries()
            .then(data => reset({ series: data }))
            .catch(() => setToast({ message: 'Failed to load data.', type: 'error' }))
            .finally(() => setIsLoading(false));
    }, [reset]);
    
    const watchedFields = watch("series");

    const groupedSeries = useMemo(() => {
        if (!Array.isArray(watchedFields)) {
            return {};
        }
        return watchedFields.reduce((acc, field, index) => {
            const department = field.department || 'Uncategorized';
            if (!acc[department]) {
                acc[department] = [];
            }
            acc[department].push({ ...field, originalIndex: index });
            return acc;
        }, {} as Record<string, (BackOfficeIdSeries & { originalIndex: number })[]>);
    }, [watchedFields]);

    const handleAddRow = () => {
        append({ id: `new_${Date.now()}`, department: '', designation: '', permanentId: '', temporaryId: '' });
    };

    const handleSave = async (data: { series: BackOfficeIdSeries[] }) => {
        try {
            await api.updateBackOfficeIdSeries(data.series);
            setToast({ message: 'Configuration saved successfully.', type: 'success' });
        } catch (error) {
            setToast({ message: 'Failed to save configuration.', type: 'error' });
        }
    };
    
    const handleExport = () => {
        if (!Array.isArray(watchedFields) || watchedFields.length === 0) {
            setToast({ message: 'No data to export.', type: 'error' });
            return;
        }
        const csvData = toCSV(watchedFields);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'back_office_id_series.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadTemplate = () => {
        const csvString = CSV_HEADERS.join(',');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'id_series_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const parsedData = fromCSV(text);
                const newSeries = parsedData.map(d => ({
                    id: `imported_${Date.now()}_${Math.random()}`,
                    department: d.department || '',
                    designation: d.designation || '',
                    permanentId: d.permanentId || '',
                    temporaryId: d.temporaryId || '',
                }));
                replace(newSeries);
                setToast({ message: `Imported ${newSeries.length} records.`, type: 'success' });
            } catch (error: any) {
                setToast({ message: error.message || 'Failed to import CSV.', type: 'error' });
            } finally {
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <form onSubmit={handleSubmit(handleSave)} className="bg-card p-6 rounded-xl shadow-card">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            <input type="file" ref={importRef} className="hidden" accept=".csv" onChange={handleFileImport} />

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-semibold text-primary-text">Back Office Department & Emp ID Series</h3>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button type="button" variant="outline" onClick={handleDownloadTemplate}><FileText className="mr-2 h-4 w-4" /> Template</Button>
                    <Button type="button" variant="outline" onClick={() => importRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Import</Button>
                    <Button type="button" variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
                    <Button type="submit"><Save className="mr-2 h-4 w-4" /> Save</Button>
                </div>
            </div>

             <div className="space-y-6">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
                ) : Object.keys(groupedSeries).length === 0 ? (
                    <div className="text-center p-8 text-muted bg-page rounded-lg">No ID series defined. Click "Add Designation" to begin.</div>
                ) : (
                    Object.entries(groupedSeries).map(([department, items]) => (
                        <div key={department} className="border border-border rounded-xl">
                            <div className="p-4 bg-page rounded-t-xl">
                                <Input 
                                    aria-label={`Department for ${department}`} 
                                    id={`series.${items[0].originalIndex}.department`} 
                                    {...register(`series.${items[0].originalIndex}.department`)} 
                                    className="font-semibold text-lg !border-0 !p-0 !bg-transparent focus:!ring-0" 
                                />
                            </div>
                            <div className="space-y-3 p-4">
                                {Array.isArray(items) && items.map(item => (
                                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-10 gap-2 items-center">
                                        <div className="md:col-span-3">
                                            <Input placeholder="Designation" aria-label={`Designation for ${department}`} id={`series.${item.originalIndex}.designation`} {...register(`series.${item.originalIndex}.designation`)} />
                                        </div>
                                        <div className="md:col-span-3">
                                            <Input placeholder="Permanent ID" aria-label={`Permanent ID for ${item.designation}`} id={`series.${item.originalIndex}.permanentId`} {...register(`series.${item.originalIndex}.permanentId`)} />
                                        </div>
                                        <div className="md:col-span-3">
                                            <Input placeholder="Temporary ID" aria-label={`Temporary ID for ${item.designation}`} id={`series.${item.originalIndex}.temporaryId`} {...register(`series.${item.originalIndex}.temporaryId`)} />
                                        </div>
                                        <div className="md:col-span-1 text-right">
                                            <Button type="button" variant="icon" size="sm" onClick={() => remove(item.originalIndex)} aria-label={`Remove ${item.designation}`} title={`Remove ${item.designation}`}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Button type="button" onClick={handleAddRow} variant="outline" className="mt-6"><Plus className="mr-2 h-4 w-4" /> Add Designation</Button>
        </form>
    );
};

export default BackofficeHeadsConfig;