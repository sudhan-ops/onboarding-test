import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ManpowerDetail, SiteStaffDesignation } from '../../types';
import Button from '../ui/Button';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';

type EditableManpowerDetail = ManpowerDetail & { tempId?: string };

interface ManpowerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteName: string;
  details: ManpowerDetail[];
  isLoading: boolean;
  onSave: (details: ManpowerDetail[]) => Promise<void>;
  designations: SiteStaffDesignation[];
}

const ManpowerDetailsModal: React.FC<ManpowerDetailsModalProps> = ({
  isOpen,
  onClose,
  siteName,
  details,
  isLoading,
  onSave,
  designations,
}) => {
  const [editableDetails, setEditableDetails] = useState<EditableManpowerDetail[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollShadow, setShowScrollShadow] = useState(false);

  const uniqueDesignations = useMemo(() => {
    const seen = new Set<string>();
    return designations.filter(d => {
        if (seen.has(d.designation)) {
            return false;
        } else {
            seen.add(d.designation);
            return true;
        }
    }).sort((a,b) => a.designation.localeCompare(b.designation));
  }, [designations]);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (el) {
        const isScrollable = el.scrollHeight > el.clientHeight;
        const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 1; // +1 buffer for precision
        setShowScrollShadow(isScrollable && !isAtBottom);
    } else {
        setShowScrollShadow(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Create a deep copy to avoid mutating the original prop
      setEditableDetails(JSON.parse(JSON.stringify(details)));
      // Check scroll state after a short delay to allow content to render
      const timer = setTimeout(checkScroll, 150);
      return () => clearTimeout(timer);
    }
  }, [details, isOpen, isLoading]);

  const handleDetailChange = (index: number, field: keyof ManpowerDetail, value: string | number) => {
    const newDetails = [...editableDetails];
    const item = newDetails[index];

    if (field === 'count') {
      const numericValue = Number(value);
      item.count = isNaN(numericValue) ? 0 : numericValue;
    } else {
      item.designation = String(value);
    }
    
    setEditableDetails(newDetails);
  };
  
  const handleAddRow = () => {
    setEditableDetails([...editableDetails, { designation: '', count: 0, tempId: `new_${Date.now()}` }]);
    setTimeout(checkScroll, 50); // Re-check scrollability after adding a row
  };

  const handleRemoveRow = (index: number) => {
    const newDetails = editableDetails.filter((_, i) => i !== index);
    setEditableDetails(newDetails);
    setTimeout(checkScroll, 50); // Re-check scrollability after removing a row
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    // Filter out rows with empty designations and remove temporary IDs before saving
    const validDetails = editableDetails
        .filter(d => d.designation.trim() !== '')
        .map(({ tempId, ...rest }) => rest);
    await onSave(validDetails);
    setIsSaving(false);
  };

  const totalCount = React.useMemo(() => {
    return editableDetails.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  }, [editableDetails]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

    const target = e.target as HTMLInputElement;
    if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT') return;

    const rowIndexAttr = target.getAttribute('data-row-index');
    const colIndexAttr = target.getAttribute('data-col-index');

    if (!rowIndexAttr || !colIndexAttr) return;

    // Preserve native up/down arrow behavior for number inputs.
    if (target.type === 'number') {
      return;
    }

    e.preventDefault();

    const formContainer = e.currentTarget;
    const rowIndex = parseInt(rowIndexAttr, 10);
    const colIndex = parseInt(colIndexAttr, 10);

    const nextRowIndex = e.key === 'ArrowUp' ? rowIndex - 1 : rowIndex + 1;

    const nextElement = formContainer.querySelector(`[data-row-index="${nextRowIndex}"][data-col-index="${colIndex}"]`) as HTMLElement;

    if (nextElement) {
      nextElement.focus();
    }
  };


  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-sm sm:max-w-lg md:max-w-2xl m-4 animate-fade-in-scale flex flex-col" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-primary-text">Allocate Manpower</h3>
        <p className="text-sm text-muted mb-4">For site: {siteName}</p>
        
        <div className="flex-grow relative overflow-hidden">
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            onKeyDown={handleKeyDown}
            className="overflow-y-auto pr-2 min-h-[300px] max-h-[60vh] h-full"
          >
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-4 sticky top-0 bg-page p-2 rounded-t-lg z-10">
                    <div className="col-span-6 font-medium text-sm text-muted">Designation</div>
                    <div className="col-span-4 font-medium text-sm text-muted">Count</div>
                    <div className="col-span-2"></div>
                </div>
                {editableDetails.length > 0 ? editableDetails.map((item, index) => (
                  <div key={item.tempId || index} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-6">
                        <Select
                            id={`designation-${index}`}
                            value={item.designation}
                            onChange={(e) => handleDetailChange(index, 'designation', e.target.value)}
                            className="py-1.5"
                            data-row-index={index}
                            data-col-index={0}
                            aria-label={`Designation for row ${index + 1}`}
                        >
                            <option value="">Select Designation</option>
                            {uniqueDesignations.map(d => (
                                <option key={d.id} value={d.designation}>{d.designation}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="col-span-4">
                         <Input
                            id={`count-${index}`}
                            type="number"
                            value={item.count}
                            onChange={(e) => handleDetailChange(index, 'count', e.target.value)}
                            min="0"
                            step="0.01"
                            className="py-1.5"
                            data-row-index={index}
                            data-col-index={1}
                            aria-label={`Count for row ${index + 1}`}
                        />
                    </div>
                    <div className="col-span-2 text-right">
                        <Button variant="icon" size="sm" onClick={() => handleRemoveRow(index)} title="Remove row" aria-label={`Remove row ${index + 1}`}>
                            <Trash2 className="h-4 w-4 text-red-500"/>
                        </Button>
                    </div>
                  </div>
                )) : (
                   <p className="text-center text-muted py-10">No designations added yet. Click below to start.</p>
                )}
                <Button variant="outline" size="sm" onClick={handleAddRow} className="mt-4">
                    <Plus className="h-4 w-4 mr-2"/> Add Designation
                </Button>
              </div>
            )}
          </div>
          {showScrollShadow && (
             <div className="absolute bottom-0 left-0 right-2 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none"></div>
          )}
        </div>
        
        <div className="mt-6 pt-4 border-t flex justify-between items-center">
            <div className="font-semibold">
                Total Manpower: <span className="text-accent">{totalCount.toFixed(2)}</span>
            </div>
            <div className="flex gap-3">
              <Button onClick={onClose} variant="secondary" disabled={isSaving}>Cancel</Button>
              <Button onClick={handleSaveChanges} isLoading={isSaving} disabled={isLoading}>Save Changes</Button>
            </div>
        </div>
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};

export default ManpowerDetailsModal;