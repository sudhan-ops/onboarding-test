import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useEnrollmentRulesStore } from '../../store/enrollmentRulesStore';
import { api } from '../../services/api';
import type { OrganizationGroup, Company, Entity, Organization, SiteStaffDesignation } from '../../types';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { Loader2, Building, ArrowRight, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';

const SelectOrganization = () => {
    const navigate = useNavigate();
    const { updateOrganization, updatePersonal } = useOnboardingStore();
    const { enforceManpowerLimit, manpowerLimitRule } = useEnrollmentRulesStore();
    const { user } = useAuthStore();
    
    const [isLoading, setIsLoading] = useState(true);
    const [groups, setGroups] = useState<OrganizationGroup[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [siteStaffDesignations, setSiteStaffDesignations] = useState<SiteStaffDesignation[]>([]);
    
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [selectedEntityId, setSelectedEntityId] = useState('');
    const [selectedDesignation, setSelectedDesignation] = useState('');
    const [designationsForSite, setDesignationsForSite] = useState<SiteStaffDesignation[]>([]);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    const [manpowerStatus, setManpowerStatus] = useState({ isOverLimit: false, message: '' });
    const isMobileView = user?.role === 'field_officer' && isMobile;

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [structure, orgs, designations] = await Promise.all([
                    api.getOrganizationStructure(),
                    api.getOrganizations(),
                    api.getSiteStaffDesignations(),
                ]);
                setGroups(structure);
                setOrganizations(orgs);
                setSiteStaffDesignations(designations);
            } catch (error) {
                console.error("Failed to fetch organization structure", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);
    const companies = useMemo(() => selectedGroup?.companies || [], [selectedGroup]);
    
    const selectedCompany = useMemo(() => companies.find(c => c.id === selectedCompanyId), [companies, selectedCompanyId]);
    const entities = useMemo(() => selectedCompany?.entities || [], [selectedCompany]);

    useEffect(() => {
        // When the site selection changes, reset the designation
        setSelectedDesignation('');

        const selectedEntity = entities.find(e => e.id === selectedEntityId);

        if (selectedEntity) {
            // As per user request, populate with all available staff designations from the master list.
            // This removes the dependency on a site-specific manpower plan.
            setDesignationsForSite(siteStaffDesignations);
        } else {
            // If no site is selected, clear the designation list
            setDesignationsForSite([]);
        }
    }, [selectedEntityId, entities, siteStaffDesignations]);

    useEffect(() => {
        const checkManpower = async () => {
            setManpowerStatus({ isOverLimit: false, message: '' });
            if (!selectedEntityId || !enforceManpowerLimit) {
                return;
            }

            const selectedEntity = entities.find(e => e.id === selectedEntityId);
            const orgId = selectedEntity?.organizationId;
            if (!orgId) return;

            const organization = organizations.find(o => o.id === orgId);
            const approvedCount = organization?.manpowerApprovedCount;

            if (approvedCount === undefined || approvedCount === null) {
                setManpowerStatus({ isOverLimit: false, message: 'Manpower limit not set for this site.' });
                return;
            }

            try {
                const submissions = await api.getVerificationSubmissions();
                const currentCount = submissions.filter(s => s.organizationId === orgId && (s.status === 'verified' || s.status === 'pending')).length;

                if (currentCount >= approvedCount) {
                    const message = `Manpower limit of ${approvedCount} reached (${currentCount} deployed).`;
                    setManpowerStatus({ isOverLimit: true, message });
                } else {
                    const message = `Manpower: ${currentCount} / ${approvedCount} deployed.`;
                    setManpowerStatus({ isOverLimit: false, message });
                }
            } catch (e) {
                setManpowerStatus({ isOverLimit: false, message: 'Could not verify manpower count.' });
            }
        };

        checkManpower();
    }, [selectedEntityId, organizations, entities, enforceManpowerLimit]);

    const handleContinue = () => {
        const selectedEntity = entities.find(e => e.id === selectedEntityId);
        if (selectedEntity?.organizationId) {
            const organization = organizations.find(o => o.id === selectedEntity.organizationId);
            const designationDetails = siteStaffDesignations.find(d => d.designation === selectedDesignation);

            if (organization && designationDetails) {
                updateOrganization({
                    organizationId: organization.id,
                    organizationName: organization.shortName,
                    joiningDate: format(new Date(), 'yyyy-MM-dd'),
                    workType: 'Full-time',
                    designation: selectedDesignation,
                    department: designationDetails.department,
                    defaultSalary: designationDetails.monthlySalary || null,
                });
                updatePersonal({
                    salary: designationDetails.monthlySalary || null
                });
                navigate('/onboarding/pre-upload');
            } else {
                console.error("Organization or Designation details not found.");
            }
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    const canContinue = !selectedEntityId || !selectedDesignation || (manpowerStatus.isOverLimit && manpowerLimitRule === 'block');
    
    if (isMobileView) {
      return (
        <div className="h-full flex flex-col">
            <header className="p-4 flex-shrink-0 flex items-center gap-4 fo-mobile-header">
                <button onClick={() => navigate('/onboarding')} aria-label="Go back">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1>New Enrollment</h1>
            </header>
            <main className="flex-1 overflow-y-auto p-4">
                <div className="bg-card rounded-2xl p-6 space-y-6">
                    <div className="text-center">
                        <div className="inline-block bg-accent-light p-3 rounded-full mb-2">
                            <Building className="h-8 w-8 text-accent-dark" />
                        </div>
                        <h2 className="text-xl font-bold text-primary-text">Select Site</h2>
                        <p className="text-sm text-gray-400">Choose the client and site for the new employee.</p>
                    </div>
                    <div className="space-y-4">
                        <select value={selectedGroupId} onChange={(e) => { setSelectedGroupId(e.target.value); setSelectedCompanyId(''); setSelectedEntityId(''); }} className="fo-select fo-select-arrow">
                            <option value="">-- Select a Group --</option>
                            {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                        </select>
                        <select value={selectedCompanyId} onChange={(e) => { setSelectedCompanyId(e.target.value); setSelectedEntityId(''); }} disabled={!selectedGroupId} className="fo-select fo-select-arrow">
                            <option value="">-- Select a Company --</option>
                            {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
                        </select>
                        <select value={selectedEntityId} onChange={(e) => setSelectedEntityId(e.target.value)} disabled={!selectedCompanyId} className="fo-select fo-select-arrow">
                            <option value="">-- Select a Client/Site --</option>
                            {entities.map(entity => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                        </select>
                        <select value={selectedDesignation} onChange={(e) => setSelectedDesignation(e.target.value)} disabled={!selectedEntityId} className="fo-select fo-select-arrow">
                            <option value="">-- Select a Designation --</option>
                            {designationsForSite.map(desig => <option key={desig.id} value={desig.designation}>{desig.designation}</option>)}
                        </select>
                        {manpowerStatus.message && (
                            <div className={`mt-4 text-sm p-3 rounded-lg ${manpowerStatus.isOverLimit ? 'bg-red-900/50 text-red-300 border border-red-500/50' : 'bg-green-900/50 text-green-300 border border-green-500/50'}`}>
                                {manpowerStatus.message}
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <footer className="p-4 flex-shrink-0 flex items-center justify-between gap-4">
                <button onClick={() => navigate('/onboarding')} className="fo-btn-secondary px-6">Back</button>
                <button onClick={handleContinue} disabled={canContinue} className="fo-btn-primary flex-1">
                    Continue
                </button>
            </footer>
        </div>
      );
    }

    return (
        <div className="p-4 md:p-0">
            <div className="bg-card p-8 rounded-xl shadow-card max-w-2xl mx-auto">
                <div className="flex items-center mb-6">
                    <div className="bg-accent-light p-3 rounded-full mr-4">
                        <Building className="h-8 w-8 text-accent-dark" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-primary-text">Select Site</h2>
                        <p className="text-muted">Choose the client and site for the new employee.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <Select
                        label="Company Group"
                        id="group"
                        value={selectedGroupId}
                        onChange={(e) => {
                            setSelectedGroupId(e.target.value);
                            setSelectedCompanyId('');
                            setSelectedEntityId('');
                        }}
                    >
                        <option value="">-- Select a Group --</option>
                        {groups.map(group => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                    </Select>

                    <Select
                        label="Company"
                        id="company"
                        value={selectedCompanyId}
                        onChange={(e) => {
                            setSelectedCompanyId(e.target.value);
                            setSelectedEntityId('');
                        }}
                        disabled={!selectedGroupId}
                    >
                        <option value="">-- Select a Company --</option>
                        {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                    </Select>

                    <Select
                        label="Client / Site"
                        id="entity"
                        value={selectedEntityId}
                        onChange={(e) => setSelectedEntityId(e.target.value)}
                        disabled={!selectedCompanyId}
                    >
                        <option value="">-- Select a Client/Site --</option>
                        {entities.map(entity => (
                            <option key={entity.id} value={entity.id}>{entity.name}</option>
                        ))}
                    </Select>
                    
                    <Select
                        label="Designation"
                        id="designation"
                        value={selectedDesignation}
                        onChange={(e) => setSelectedDesignation(e.target.value)}
                        disabled={!selectedEntityId}
                    >
                        <option value="">-- Select a Designation --</option>
                        {designationsForSite.map(desig => (
                            <option key={desig.id} value={desig.designation}>{desig.designation}</option>
                        ))}
                    </Select>
                </div>
                
                {manpowerStatus.message && (
                    <div className={`mt-4 text-sm p-3 rounded-lg ${manpowerStatus.isOverLimit ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {manpowerStatus.message}
                    </div>
                )}

                <div className="mt-8 pt-6 border-t flex justify-end">
                    <Button
                        onClick={handleContinue}
                        disabled={canContinue}
                    >
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SelectOrganization;