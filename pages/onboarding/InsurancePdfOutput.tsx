
import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import Button from '../../components/ui/Button';
import type { OnboardingData, FamilyMember } from '../../types';
import { api } from '../../services/api';
import { Download, ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useLogoStore } from '../../store/logoStore';
import { format } from 'date-fns';

const OnboardingPdfOutput: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [employeeData, setEmployeeData] = useState<OnboardingData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAccepted, setIsAccepted] = useState(false);
    const pdfRef = useRef<HTMLDivElement>(null);
    const { data: storeData, setFormsGenerated } = useOnboardingStore();
    const logo = useLogoStore((state) => state.currentLogo);

    useEffect(() => {
        const fetchData = async () => {
            if (id && !id.startsWith('draft_')) {
                setIsLoading(true);
                const data = await api.getOnboardingDataById(id);
                setEmployeeData(data || null);
                setIsLoading(false);
            } else {
                // Use data from the store for drafts
                setEmployeeData(storeData);
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id, storeData]);
    
    const handleExport = () => {
        const element = pdfRef.current;
        if (element) {
            const opt = {
                margin:       0,
                filename:     `Onboarding_Forms_${employeeData?.personal.employeeId}.pdf`,
                image:        { type: 'jpeg' as const, quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' as const }
            };
            html2pdf().from(element).set(opt).save();
        }
    };

    const handleConfirm = () => {
        setFormsGenerated(true);
        navigate(`/onboarding/add/review?id=${id}`);
    };

    if (isLoading) return <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin mx-auto"/></div>;
    if (!employeeData) return <div className="text-center p-10 text-red-500">Could not find employee data.</div>;
    
    const d = employeeData;
    const fullName = `${d.personal.firstName} ${d.personal.middleName || ''} ${d.personal.lastName}`.replace(/\s+/g, ' ').trim();
    const fatherName = d.family.find(f => f.relation === 'Father')?.name || '';
    const spouseName = d.family.find(f => f.relation === 'Spouse')?.name || '';
    const motherName = d.family.find(f => f.relation === 'Mother')?.name || '';

    return (
        <div className="bg-page">
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
                 <div className="bg-card p-4 rounded-xl shadow-card no-print mb-8 sticky top-4 z-10">
                     <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                         <Button onClick={() => navigate(-1)} variant="secondary"><ArrowLeft className="mr-2 h-4 w-4"/> Go Back</Button>
                         <div className="text-center">
                             <h2 className="font-bold text-lg">Review Official Forms</h2>
                             <p className="text-sm text-muted">Please confirm these details before submitting.</p>
                         </div>
                         <div className="flex items-center gap-2">
                            <Button onClick={handleExport} variant="outline"><Download className="mr-2 h-4 w-4" /> Download</Button>
                            <Button onClick={handleConfirm}>Confirm & Continue</Button>
                         </div>
                     </div>
                 </div>
                 <div ref={pdfRef} className="bg-white rounded-xl border border-border shadow-lg">
                    {/* Page 1: Employee Personal Data */}
                    <div className="pdf-page p-8 font-serif text-sm text-black">
                        <div className="border-4 border-black p-6 h-full flex flex-col">
                            <h1 className="text-center text-xl font-bold tracking-widest mb-8">EMPLOYEE PERSONAL DATA</h1>
                             <div className="w-64 mx-auto border-2 border-black p-2 my-8">
                                <img src={logo} alt="Paradigm Logo" className="w-full" />
                            </div>
                            <div className="mt-auto space-y-8 text-lg">
                                <div className="flex items-center"><span className="w-48 font-bold">EMPLOYEE'S NAME</span> : <span className="border-b border-black flex-1 ml-2">{fullName}</span></div>
                                <div className="flex items-center"><span className="w-48 font-bold">SITE</span> : <span className="border-b border-black flex-1 ml-2">{d.organization.organizationName}</span></div>
                                <div className="flex items-center"><span className="w-48 font-bold">DESIGNATION</span> : <span className="border-b border-black flex-1 ml-2">{d.organization.designation}</span></div>
                                <div className="flex items-center"><span className="w-48 font-bold">EMPLOYEE'S ID NO.</span> : <span className="border-b border-black flex-1 ml-2">{d.personal.employeeId}</span></div>
                                <div className="flex items-center"><span className="w-48 font-bold">PF No.</span> : <span className="border-b border-black flex-1 ml-2">{d.uan.pfNumber || d.uan.uanNumber}</span></div>
                                <div className="flex items-center"><span className="w-48 font-bold">ESI NO.</span> : <span className="border-b border-black flex-1 ml-2">{d.esi.esiNumber}</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="page-break"></div>

                    {/* Page 8: Personal Data Form */}
                     <div className="pdf-page p-8 font-serif text-xs text-black">
                        <div className="border-2 border-black p-4 h-full relative">
                            <div className="absolute top-4 right-4 w-48">
                                <img src={logo} alt="Paradigm Logo" className="w-full" />
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold">EMPLOYEE ID No. : <span className="font-normal underline">{d.personal.employeeId}</span></h2>
                                <h1 className="text-center font-bold text-base tracking-wider">PERSONAL DATA</h1>
                            </div>
                            <div className="space-y-2">
                                <p>1. Name: <span className="underline">{fullName}</span></p>
                                <p>2. Father's Name: <span className="underline">{fatherName}</span></p>
                                <p>3. Mother's Name: <span className="underline">{motherName}</span></p>
                                <p>4. Reference by: <span className="underline"></span></p>
                                <div className="grid grid-cols-2">
                                  <p>5. Date of Birth: <span className="underline">{d.personal.dob}</span></p>
                                  <p>6. Age: <span className="underline">{d.personal.dob ? new Date().getFullYear() - new Date(d.personal.dob).getFullYear() : ''}</span></p>
                                </div>
                                <div className="grid grid-cols-2">
                                  <p>7. Qualification: <span className="underline">{d.education[0]?.degree || ''}</span></p>
                                  <p>8. Experience: <span className="underline"></span></p>
                                </div>
                                <div className="grid grid-cols-2">
                                  <p>9. Designation: <span className="underline">{d.organization.designation}</span></p>
                                  <p>10. Net Salary Offered: <span className="underline">{d.personal.salary?.toLocaleString('en-IN')}</span></p>
                                </div>
                                <p>11. Present Address: <span className="underline">{`${d.address.present.line1}, ${d.address.present.city}, ${d.address.present.state} - ${d.address.present.pincode}`}</span></p>
                                <div className="grid grid-cols-2">
                                  <p>12. Permanent Address: <span className="underline">{d.address.sameAsPresent ? 'Same as Present' : `${d.address.permanent.line1}, ${d.address.permanent.city}`}</span></p>
                                  <p>Ph. No.: <span className="underline">{d.personal.mobile}</span> Alternate Ph. No.: <span className="underline">{d.personal.alternateMobile || ''}</span></p>
                                </div>
                                {/* Thumb impressions would be manual */}
                                <p>13. Left hand thumb impression</p><div className="grid grid-cols-4 gap-2 h-12 border border-black my-1"><div className="border-r border-black"></div><div className="border-r border-black"></div><div className="border-r border-black"></div><div></div></div>
                                <p>14. Right hand thumb impression</p><div className="grid grid-cols-4 gap-2 h-12 border border-black my-1"><div className="border-r border-black"></div><div className="border-r border-black"></div><div className="border-r border-black"></div><div></div></div>

                                <div className="grid grid-cols-2">
                                  <p>15. Marital Status: <span className="underline">{d.personal.maritalStatus}</span></p>
                                  <p>16. Name of the Spouse: <span className="underline">{spouseName}</span> Contact No.: <span className="underline"></span></p>
                                </div>
                                <p>17. Languages Known: to Speak <span className="underline"></span> to Write <span className="underline"></span></p>
                                <div className="grid grid-cols-2">
                                  <p>18. Date of Joining: <span className="underline">{d.organization.joiningDate}</span></p>
                                  <p>19. ID Card:</p>
                                </div>
                                <div className="grid grid-cols-2">
                                  <p>20. ESI Number: <span className="underline">{d.esi.esiNumber}</span></p>
                                  <p>21. PF Number: <span className="underline">{d.uan.pfNumber || d.uan.uanNumber}</span></p>
                                </div>
                                <div className="grid grid-cols-2">
                                    <p>22. Uniform Details: </p>
                                    <p>23. Shoe Details: </p>
                                </div>
                                <div className="grid grid-cols-2">
                                    <p>24. Name of the Site: <span className="underline">{d.organization.organizationName}</span></p>
                                    <p>25. Site / Estate Manager: </p>
                                </div>
                                <div className="grid grid-cols-2">
                                    <p>26. Record enclosed: </p>
                                    <p>28. Reference Name:</p>
                                </div>
                                <div className="grid grid-cols-2">
                                    <p>27. Hirer: </p>
                                    <p className="ml-24">Reference Ph.:</p>
                                </div>
                                <p>29. Emergency Contact Name: <span className="underline">{d.personal.emergencyContactName}</span> Ph.: <span className="underline">{d.personal.emergencyContactNumber}</span> Blood Group: <span className="underline">{d.personal.bloodGroup}</span></p>
                            </div>
                            <div className="absolute bottom-4 left-4 right-4 flex justify-between">
                                <p>Employee Signature:</p>
                                <p>Documented by:</p>
                            </div>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    );
};

export default OnboardingPdfOutput;
