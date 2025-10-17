import React, { useEffect, useState } from 'react';
import { authed } from '../lib/authed';

// Define the component's props, including the new optional prop
interface PatientDetailModalProps {
  patient: any;
  userToken: string;
  onClose: () => void;
  initialRecords?: any[] | null;
}

export default function PatientDetailModal({ patient, userToken, onClose, initialRecords }: PatientDetailModalProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({ title: '', category: 'Visit Note', notes: '' });
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    // If emergency records are provided, use them immediately and stop.
    if (initialRecords) {
      setRecords(initialRecords);
      setLoading(false);
    } else {
      // Otherwise, this is a normal access, so fetch the records from the API.
      (async () => {
        try {
          setLoading(true);
          setError('');
          const recordList = await authed(`/api/doctor/records/${patient._id}`, userToken);
          setRecords(recordList);
        } catch (e: any) {
          setError(e.message || 'Failed to load records.');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [patient, userToken, initialRecords]);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg({ type: '', text: '' });
    try {
      const newRecord = await authed('/api/doctor/records', userToken, {
        method: 'POST',
        body: JSON.stringify({ ...form, patientId: patient._id }),
      });
      setRecords([newRecord, ...records]);
      setForm({ title: '', category: 'Visit Note', notes: '' });
      setFormMsg({ type: 'success', text: 'Record added successfully.' });
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Failed to add record.' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 grid place-items-center z-40">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold">{patient.name}</h2>
            <p className="text-gray-500">{patient.email}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-800">&times;</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-2">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Add New Record</h3>
            <form onSubmit={handleAddRecord} className="space-y-4">
              <input 
                value={form.title} 
                onChange={e => setForm({...form, title: e.target.value})} 
                placeholder="Record Title (e.g., Annual Physical)" 
                required 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              />
              <select 
                value={form.category} 
                onChange={e => setForm({...form, category: e.target.value})} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              >
                <option>Visit Note</option>
                <option>Lab Result</option>
                <option>Prescription</option>
              </select>
              <textarea 
                value={form.notes} 
                onChange={e => setForm({...form, notes: e.target.value})} 
                placeholder="Details and notes..." 
                required 
                rows={4} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              />
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                Save Record
              </button>
              {formMsg.text && <p className={`text-sm ${formMsg.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{formMsg.text}</p>}
            </form>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Patient History</h3>
            {loading && <p>Loading records...</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {!loading && !error && records.length === 0 && <p className="text-gray-500">No records found for this patient.</p>}
            <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {records.map(rec => (
                <li key={rec._id} className="border border-gray-200 p-3 rounded-md">
                  <div className="flex justify-between items-center">
                    <strong className="text-gray-800">{rec.title}</strong>
                    <small className="text-gray-500">{new Date(rec.date).toLocaleDateString()}</small>
                  </div>
                  <p className="text-sm text-gray-500">{rec.category}</p>
                  <p className="mt-2 text-sm text-gray-700">{rec.notes}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}