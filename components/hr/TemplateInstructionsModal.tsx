import React from 'react';
import Button from '../ui/Button';
import { FileText, AlertTriangle, CheckCircle, FileUp, FileDown, Edit, Plus } from 'lucide-react';

interface TemplateInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstructionStep: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div>
        <h4 className="font-bold text-lg text-primary-text mb-2">Step {number}: {title}</h4>
        <div className="text-sm text-muted space-y-2">{children}</div>
    </div>
);

const TemplateInstructionsModal: React.FC<TemplateInstructionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-card w-full max-w-3xl my-8 animate-fade-in-scale flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center gap-3">
          <FileText className="h-6 w-6 text-accent"/>
          <h3 className="text-xl font-bold text-primary-text">How to Use Import Templates</h3>
        </div>
        <div className="flex-grow overflow-y-auto p-6 space-y-6 max-h-[70vh]">
          
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold text-red-800">The Golden Rule: Do Not Modify the Template Structure</h4>
                    <p className="text-sm text-red-700 mt-1">
                        You must **NEVER** add, delete, rename, or reorder columns. Any changes to the header row will cause the import to fail. This rule ensures data integrity.
                    </p>
                </div>
            </div>
          </div>

          <InstructionStep number={1} title="Get the Template">
            <p>You have two options for getting a file to work with:</p>
            <ul className="list-disc list-inside pl-4 space-y-2">
                <li>
                    <strong className="text-primary-text flex items-center gap-2"><FileText className="h-4 w-4"/> Download Template:</strong>
                    <span>Provides a blank CSV file with only the correct header row. Use this for adding **new** records in bulk.</span>
                </li>
                 <li>
                    <strong className="text-primary-text flex items-center gap-2"><FileDown className="h-4 w-4"/> Export Data:</strong>
                    <span>Provides a CSV file filled with all the current data from the system. Use this for **updating existing** records in bulk.</span>
                </li>
            </ul>
          </InstructionStep>

          <InstructionStep number={2} title="Edit Your Data">
            <ul className="list-disc list-inside pl-4 space-y-2">
                <li>
                    <strong className="text-primary-text flex items-center gap-2"><Edit className="h-4 w-4"/> To Update Existing Data:</strong>
                    <span>Use the file from **Export Data**. Find the row you want to change and edit its values. Do **NOT** edit the ID columns (e.g., `GroupId`, `EntityId`). These are used by the system to identify records.</span>
                </li>
                <li>
                    <strong className="text-primary-text flex items-center gap-2"><Plus className="h-4 w-4"/> To Add New Data:</strong>
                    <span>Add a new row at the bottom of the file. Leave the ID columns blank; the system will generate them automatically. Fill in all other required information.</span>
                </li>
                 <li>
                    <strong className="text-primary-text">Complex Data (JSON):</strong>
                    <span>For Site Configuration, some columns like `agreementDetails` contain complex data. This is exported as a JSON text string. Only edit this text if you are familiar with JSON, as incorrect formatting will cause the import to fail.</span>
                </li>
            </ul>
          </InstructionStep>

          <InstructionStep number={3} title="Save and Import">
            <ul className="list-disc list-inside pl-4 space-y-2">
                <li>
                    <strong className="text-primary-text">Save as CSV:</strong>
                    <span>After making your changes, save your file. If you are using Excel or Google Sheets, make sure to **Save As** or **Download As** a **CSV (Comma-Separated Values)** file.</span>
                </li>
                 <li>
                    <strong className="text-primary-text flex items-center gap-2"><FileUp className="h-4 w-4"/> Import:</strong>
                    <span>Go back to the application, click **Import**, and select the CSV file you just saved.</span>
                </li>
            </ul>
          </InstructionStep>

           <InstructionStep number={4} title="Review Feedback">
                <ul className="list-disc list-inside pl-4 space-y-2">
                    <li>
                        <strong className="text-green-600 flex items-center gap-2"><CheckCircle className="h-4 w-4"/> Success:</strong>
                        <span>You will see a success message indicating how many records were imported.</span>
                    </li>
                    <li>
                        <strong className="text-red-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> Error:</strong>
                        <span>If the import fails, a specific error message will appear. The most common error is a "Header mismatch," which means you have violated the Golden Rule. If this happens, download a fresh template and carefully copy your data into it.</span>
                    </li>
                </ul>
            </InstructionStep>
        </div>
        <div className="p-4 border-t flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default TemplateInstructionsModal;