// client/src/pages/DashboardDoctor.tsx

import React, { useEffect, useState, useRef } from 'react';
import PatientDetailModal from '../components/PatientDetailModal';
import { authed } from '../lib/authed';
import { User } from '../types';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import BehaviorTracker from '../components/BehaviorTracker';
import SessionManager from '../components/SessionManager';
import BreakGlassModal from '../components/BreakGlassModal';

// --- FIX: Define the onLogout prop for the ReAuthModal ---
const ReAuthModal = ({ onVerify }: { onVerify: () => void }) => (
  <div className="fixed inset-0 bg-black bg-opacity-75 grid place-items-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
      <h3 className="text-xl font-semibold">Security Challenge</h3>
      <p className="text-sm text-gray-600 my-4">Your session has been locked due to unusual activity. Please re-verify to continue.</p>
      <Button onClick={onVerify}>Re-Authenticate</Button>
      <p className="text-xs text-gray-400 mt-2">(This would typically require a password or 2FA)</p>
    </div>
  </div>
);

interface SummaryData {
  todaysAppointments: number;
  totalPatients: number;
}
interface DashboardData {
  summary: SummaryData | null;
  appointments: any[];
  patients: any[];
}

const PatientSearch = ({ user, onPatientSelect }: { user: User, onPatientSelect: (p: any) => void }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            return;
        }
        const handler = setTimeout(async () => {
            setIsLoading(true);
            try {
                const data = await authed(`/api/doctor/search-patients?q=${query}`, user.token);
                setResults(data);
            } catch (error) {
                console.error("Search failed:", error);
                setResults([]);
            }
            setIsLoading(false);
        }, 500);
        return () => clearTimeout(handler);
    }, [query, user.token]);

    return (
        <div className="relative">
            <Input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search for any patient in the network (e.g., for ER)"
            />
            {query.length > 1 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg mt-1 z-10 max-h-60 overflow-y-auto">
                    {isLoading && <p className="px-4 py-2 text-sm text-gray-500">Searching...</p>}
                    {!isLoading && results.length === 0 && <p className="px-4 py-2 text-sm text-gray-500">No results found.</p>}
                    <ul className="divide-y divide-gray-100">
                        {results.map(p => (
                            <li key={p._id}>
                                <button
                                    onClick={() => { onPatientSelect(p); setQuery(''); setResults([]); }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:outline-none"
                                >
                                    <span className="font-semibold">{p.name}</span> <span className="text-gray-500">({p.email})</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// --- FIX: Add onLogout to the component's props ---
export default function DashboardDoctor({ user, onLogout }: { user: User, onLogout: () => void }) {
  const [data, setData] = useState<DashboardData>({ summary: null, appointments: [], patients: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ patientId: '', date: '', reason: '' });
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [isChallenged, setIsChallenged] = useState(false);
  const behaviorDataRef = useRef({});
  const [breakGlassTarget, setBreakGlassTarget] = useState<any | null>(null);
  const [emergencyRecords, setEmergencyRecords] = useState<any[] | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [summary, appointments, patients] = await Promise.all([
        authed('/api/doctor/summary', user.token),
        authed('/api/doctor/appointments', user.token),
        authed('/api/doctor/patients', user.token),
      ]);
      setData({ summary, appointments, patients });
      if (patients.length > 0 && !form.patientId) {
        setForm(f => ({ ...f, patientId: patients[0]._id }));
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, [user.token]);

  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (document.hidden || isChallenged) return;
      try {
        await authed('/api/session/verify', user.token, {
          method: 'POST',
          body: JSON.stringify({ behavior: behaviorDataRef.current })
        });
        console.log('Session check passed.');
      } catch (error: any) {
        console.error('Session check failed:', error.message);
        setIsChallenged(true);
        clearInterval(intervalId);
      }
    }, 30000);
    return () => clearInterval(intervalId);
  }, [user.token, isChallenged]);

  const handleScheduleAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg({ type: '', text: '' });
    if (!form.patientId || !form.date || !form.reason) {
      setFormMsg({ type: 'error', text: 'All fields are required.' });
      return;
    }
    try {
      const newAppointment = await authed('/api/doctor/appointments', user.token, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setData(d => ({ ...d, appointments: [newAppointment, ...d.appointments] }));
      setFormMsg({ type: 'success', text: 'Appointment scheduled!' });
      setForm({ ...form, date: '', reason: '' });
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Failed to schedule.' });
    }
  };
  
  const handlePatientSearchSelect = (patient: any) => {
    const isMyPatient = data.patients.some(p => p._id === patient._id);
    if (isMyPatient) {
        setSelectedPatient(patient);
    } else {
        setBreakGlassTarget(patient);
    }
  };

  const handleModalClose = () => {
    setSelectedPatient(null);
    setEmergencyRecords(null);
  };

  return (
    <div className="space-y-6">
      <BehaviorTracker onUpdate={(data) => (behaviorDataRef.current = data)} />
      {/* --- FIX: Pass the onLogout function to the modal --- */}
      {isChallenged && <ReAuthModal onVerify={onLogout} />}

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Doctor Dashboard</h2>
          <p className="text-gray-600 mt-1">Welcome, Dr. {user.name}</p>
        </div>
      </div>

      <Card title="Emergency Patient Lookup">
        <PatientSearch user={user} onPatientSelect={handlePatientSearchSelect} />
      </Card>
      
      {loading && <p>Loading dashboard...</p>}
      {error && <p className="text-red-600">{error}</p>}
      
      {!loading && !error && data.summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
              <div className="text-5xl font-bold text-blue-600">{data.summary.todaysAppointments}</div>
              <div className="text-lg text-gray-500 mt-2">Appointments Today</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
              <div className="text-5xl font-bold text-blue-600">{data.summary.totalPatients}</div>
              <div className="text-lg text-gray-500 mt-2">Total Patients</div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Schedule Appointment" className="lg:col-span-1">
              <form onSubmit={handleScheduleAppointment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Patient</label>
                  <select
                    value={form.patientId}
                    onChange={e => setForm({ ...form, patientId: e.target.value })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    {data.patients.map((p: any) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                  <Input type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason</label>
                  <Input type="text" placeholder="e.g., Annual Check-up" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="mt-1" />
                </div>
                <Button type="submit" className="w-full">Schedule</Button>
                {formMsg.text && <p className={`text-sm ${formMsg.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{formMsg.text}</p>}
              </form>
            </Card>
            <div className="lg:col-span-2 space-y-6">
              <Card title="Upcoming Appointments">
                {data.appointments && data.appointments.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {data.appointments.map((app: any) => (
                      <li key={app._id} className="py-3 flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-800">with {app.patientId?.name || 'N/A'}</p>
                        <p className="text-sm text-gray-500">{new Date(app.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-gray-500">No upcoming appointments.</p>}
              </Card>
              <Card title="My Patient Directory">
                {data.patients && data.patients.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {data.patients.map((p: any) => (
                      <li key={p._id} className="py-3">
                        <button onClick={() => setSelectedPatient(p)} className="text-sm font-semibold text-blue-600 hover:underline">
                          {p.name}
                        </button>
                        <span className="ml-2 text-sm text-gray-500">({p.email})</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-gray-500">No patients assigned.</p>}
              </Card>
            </div>
          </div>
        </>
      )}

      <SessionManager user={user} />
      
      {selectedPatient && (
        <PatientDetailModal 
          patient={selectedPatient} 
          userToken={user.token} 
          onClose={handleModalClose}
          initialRecords={emergencyRecords} 
        />
      )}

      {breakGlassTarget && (
        <BreakGlassModal
            patientName={breakGlassTarget.name}
            onClose={() => setBreakGlassTarget(null)}
            onConfirm={async (justification) => {
                const records = await authed(`/api/doctor/emergency-access/${breakGlassTarget._id}`, user.token, {
                    method: 'POST',
                    body: JSON.stringify({ justification }),
                });
                setEmergencyRecords(records);
                setSelectedPatient(breakGlassTarget);
                setBreakGlassTarget(null);
            }}
        />
      )}
    </div>
  );
}