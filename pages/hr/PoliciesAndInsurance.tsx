import React, { useState, useCallback, useEffect } from 'react';
import PolicyManagement from './PolicyManagement';
import InsuranceManagement from './InsuranceManagement';
import { ShieldHalf, FileText } from 'lucide-react';

type Tab = 'policies' | 'insurance';

const PoliciesAndInsurance: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('policies');

    return (
        <div className="p-4 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-primary-text">Policies & Insurance</h2>
            </div>
            
            <div>
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('policies')}
                        className={`flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'policies'
                                ? 'border-accent text-accent-dark'
                                : 'border-transparent text-muted hover:text-primary-text hover:border-gray-300'
                        }`}
                    >
                        <FileText className="h-5 w-5" />
                        <span>Company Policies</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('insurance')}
                        className={`flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'insurance'
                                ? 'border-accent text-accent-dark'
                                : 'border-transparent text-muted hover:text-primary-text hover:border-gray-300'
                        }`}
                    >
                        <ShieldHalf className="h-5 w-5" />
                        <span>Insurance Plans</span>
                    </button>
                </nav>
            </div>

            <div className="md:bg-card md:p-8 md:rounded-xl md:shadow-card">
                {activeTab === 'policies' && <PolicyManagement />}
                {activeTab === 'insurance' && <InsuranceManagement />}
            </div>
        </div>
    );
};

export default PoliciesAndInsurance;