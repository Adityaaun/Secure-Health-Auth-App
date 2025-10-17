import React, { useState } from 'react';
import Input from './Input';
import Button from './Button';

// --- FIX: Update onSubmit to include the trustDevice boolean ---
export default function TwoFAModal({ open, onClose, onSubmit, message }: { open: boolean; onClose: () => void; onSubmit: (code: string, trustDevice: boolean) => Promise<void>; message?: string }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  // --- FIX: Add state for the "Trust this device" checkbox ---
  const [trustDevice, setTrustDevice] = useState(true);

  if (!open) return null;

  const handleSubmit = async () => {
    setIsLoading(true);
    setErr('');
    try {
      // --- FIX: Pass the trustDevice state to the onSubmit function ---
      await onSubmit(code.trim(), trustDevice);
    } catch (e: any) {
      setErr(e.message || 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 grid place-items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm space-y-4">
        <h3 className="text-xl font-semibold">Two-Factor Authentication</h3>
        <p className="text-sm text-gray-600">{message || 'Enter the 6-digit code from your authenticator app.'}</p>
        <Input value={code} onChange={e => setCode(e.target.value)} placeholder="123456" />

        {/* --- FIX: Add the checkbox UI --- */}
        <div className="flex items-center">
          <input
            id="trustDevice"
            type="checkbox"
            checked={trustDevice}
            onChange={(e) => setTrustDevice(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="trustDevice" className="ml-2 block text-sm text-gray-900">
            Trust this device for 30 days
          </label>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>Verify</Button>
        </div>
      </div>
    </div>
  );
}