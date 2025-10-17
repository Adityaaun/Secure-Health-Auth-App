import React, { useState, useEffect } from 'react';
import { authed } from '../lib/authed';
import { User } from '../types';
import Card from '../components/Card';
import DoctorSelection from '../components/DoctorSelection';

export default function DashboardPatient({ user: initialUser }: { user: User }) {
  const [user, setUser] = useState(initialUser);
  const [data, setData] = useState<{ summary: any; records: any[] }>({ summary: null, records: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user.primaryDoctorId) {
      (async () => {
        try {
          setLoading(true);
          setError('');
          const [summary, records] = await Promise.all([
            authed('/api/patient/summary', user.token),
            authed('/api/patient/records', user.token),
          ]);
          setData({ summary, records });
        } catch (e: any) {
          setError(e.message || 'Failed to load dashboard data.');
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (!user.primaryDoctorId) {
    return <DoctorSelection user={user} onDoctorChosen={setUser} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Patient Dashboard</h2>
          <p className="text-gray-600 mt-1">Welcome back, {user.name}</p>
        </div>
      </div>

      {loading && <p className="text-gray-500">Loading dashboard...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && data.summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Next Appointment">
              {data.summary.nextAppointment ? (
                <div>
                  <p className="text-xl font-bold text-gray-800">{new Date(data.summary.nextAppointment.date).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}</p>
                  <p className="mt-1 text-gray-600">with Dr. {data.summary.nextAppointment.doctorId.name}</p>
                </div>
              ) : <p className="text-gray-500">No upcoming appointments.</p>}
            </Card>
            <Card title="Most Recent Record">
              {data.summary.recentRecord ? (
                <div>
                  <p className="font-semibold text-gray-800">{data.summary.recentRecord.title} <span className="text-sm font-normal text-gray-500">({data.summary.recentRecord.category})</span></p>
                  <p className="mt-1 text-gray-600 text-sm">{data.summary.recentRecord.notes.substring(0, 120)}...</p>
                </div>
              ) : <p className="text-gray-500">No records found.</p>}
            </Card>
          </div>

          <Card title="Your Health History">
            {data.records.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.records.map((rec: any) => (
                      <tr key={rec._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(rec.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rec.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rec.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dr. {rec.doctorId.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-gray-500">No health records found.</p>}
          </Card>
        </>
      )}
    </div>
  );
}