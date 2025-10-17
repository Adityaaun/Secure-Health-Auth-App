import React, { useEffect, useState } from 'react';
import { authed } from '../lib/authed';
import { User } from '../types';
import Card from './Card';
import Button, { ButtonProps } from './Button'; // <-- IMPORT ButtonProps

type Session = {
  _id: string;
  userAgent: string;
  ip: string;
  lastSeenAt: string;
  createdAt: string;
};

// Use ButtonProps to correctly type the SmallButton
const SmallButton = (props: ButtonProps) => (
    <Button {...props} className={`px-2.5 py-1.5 text-xs ${props.className}`} />
);

export default function SessionManager({ user }: { user: User }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await authed('/api/user/sessions', user.token);
      setSessions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user.token]);

  const handleLogout = async (sessionId: string) => {
    if (!confirm('Are you sure you want to log out this session?')) return;

    try {
      await authed(`/api/user/sessions/${sessionId}`, user.token, { method: 'DELETE' });
      fetchSessions();
    } catch (err: any) {
      alert(`Failed to log out session: ${err.message}`);
    }
  };

  return (
    <Card title="Active Sessions">
      <p className="text-sm text-gray-500 mb-4">
        This is a list of devices that have logged into your account. Revoke any sessions you don't recognize.
      </p>
      {loading && <p>Loading sessions...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && (
        <ul className="divide-y divide-gray-200">
          {sessions.map((session, index) => (
            <li key={session._id} className="py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">
                  {session.userAgent ? session.userAgent.substring(0, 70) : 'Unknown Device'}...
                  {index === 0 && <span className="ml-2 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">This session</span>}
                </p>
                <p className="text-sm text-gray-500">
                  IP: {session.ip} &bull; Last seen: {new Date(session.lastSeenAt).toLocaleString()}
                </p>
              </div>
              {index !== 0 && (
                <SmallButton onClick={() => handleLogout(session._id)} variant="secondary">
                  Log out
                </SmallButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}