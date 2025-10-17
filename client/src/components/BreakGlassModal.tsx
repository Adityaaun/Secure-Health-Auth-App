import React, { useState } from 'react';
import Button from './Button';

interface BreakGlassModalProps {
  patientName: string;
  onConfirm: (justification: string) => Promise<void>;
  onClose: () => void;
}

export default function BreakGlassModal({ patientName, onConfirm, onClose }: BreakGlassModalProps) {
  const [justification, setJustification] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (justification.trim().length < 10) {
      setError('A detailed justification of at least 10 characters is required.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await onConfirm(justification);
    } catch (err: any) {
      setError(err.message || 'Failed to get access.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 grid place-items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md space-y-4">
        <h3 className="text-xl font-semibold text-yellow-800">Emergency Access Required</h3>
        <p className="text-sm text-gray-600">
          You are about to perform a "Break the Glass" action to access the records for **{patientName}**.
          This action will be permanently logged and sent to an administrator for review.
        </p>
        <div>
          <label htmlFor="justification" className="block text-sm font-medium text-gray-700 mb-1">
            Justification for Access
          </label>
          <textarea
            id="justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="e.g., Patient is unresponsive in the ER, requires immediate access to allergy information."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary" disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} isLoading={isLoading}>
            Confirm & Access Records
          </Button>
        </div>
      </div>
    </div>
  );
}