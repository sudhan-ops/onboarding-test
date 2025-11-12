

import React, { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import Button from '../components/ui/Button';
import type { OnboardingData, FamilyMember } from '../types';
import { api } from '../services/api';
import { Download, ShieldCheck } from 'lucide-react';

const PdfExportButton: React.FC<{ elementRef: React.RefObject<HTMLDivElement>, filename: string }> = ({ elementRef, filename }) => {
    const handleExport = () => {
        const element = elementRef.current;
        if (element) {
            const opt = {
                margin: 0.5,
                filename: filename,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
            };
            html2pdf().from(element).set(opt).save();
        }
    };

    return (
        <Button onClick={handleExport} className="mt-8 no-print">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
        </Button>
    );
};

const InsurancePdfView: React.FC = () => {
    // Fix: Removed generic type argument from useParams() to avoid untyped function call error.
    const { id } = useParams();
    const [employeeData, setEmployeeData] = useState<OnboardingData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const pdfRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (id) {
                setIsLoading(true);
                const data = await api.getOnboardingDataById(id);
                if (data) {
                    setEmployeeData(data);
                }
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (isLoading) {
        return <div className="text-center p-10">Loading employee data...</div>;
    }

    if (!employeeData) {
        return <div className="text-center p-10 text-red-500">Could not find employee data.</div>;
    }

    const { personal, family, gmc } = employeeData;
    const dependents = family.filter(f => f.dependent);

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
             <div ref={pdfRef} className="bg-card p-8 rounded-xl border border-border">
                <header className="flex justify-between items-center border-b pb-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-accent-dark">Paradigm Inc.</h1>
                        <p className="text-muted">Group Medical Insurance Plan</p>
                    </div>
                    <ShieldCheck className="h-12 w-12 text-accent" />
                </header>

                <section className="mb-6">
                    <h2 className="text-lg font-semibold text-primary-text border-b pb-2 mb-4">Employee Details</h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        <div><strong>Employee Name:</strong> {personal.firstName} {personal.lastName}</div>
                        <div><strong>Employee ID:</strong> {personal.employeeId}</div>
                        <div><strong>Date of Birth:</strong> {personal.dob}</div>
                        <div><strong>Gender:</strong> {personal.gender}</div>
                    </div>
                </section>
                
                <section className="mb-6">
                    <h2 className="text-lg font-semibold text-primary-text border-b pb-2 mb-4">Nominee Details</h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        <div><strong>Nominee Name:</strong> {gmc.nomineeName}</div>
                        <div><strong>Relationship:</strong> {gmc.nomineeRelation}</div>
                    </div>
                </section>

                {gmc.isOptedIn && dependents.length > 0 && (
                    <section className="mb-6">
                        <h2 className="text-lg font-semibold text-primary-text border-b pb-2 mb-4">Covered Dependents</h2>
                         <table className="w-full text-sm text-left">
                            <thead className="bg-page">
                                <tr>
                                    <th className="p-2 font-medium">Name</th>
                                    <th className="p-2 font-medium">Relationship</th>
                                    <th className="p-2 font-medium">Date of Birth</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dependents.map((dep: FamilyMember) => (
                                    <tr key={dep.id} className="border-b border-border">
                                        <td className="p-2">{dep.name}</td>
                                        <td className="p-2">{dep.relation}</td>
                                        <td className="p-2">{dep.dob}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}

                <footer className="mt-10 pt-6 border-t text-center text-xs text-gray-500">
                    <p>This document confirms your enrollment in the Paradigm Inc. Group Medical Insurance plan. Please keep this for your records. This is a system-generated document and does not require a signature.</p>
                    <p className="mt-2 font-semibold">Policy Effective Date: {new Date().toLocaleDateString()}</p>
                </footer>
            </div>
            <div className="text-center">
                <PdfExportButton elementRef={pdfRef} filename={`Insurance_Card_${personal.employeeId}.pdf`} />
            </div>
        </div>
    );
};

export default InsurancePdfView;