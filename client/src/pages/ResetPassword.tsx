import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import Input from '../components/Input';
import Button from '../components/Button';

export default function ResetPassword({ onPasswordReset }: { onPasswordReset: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get('token');
    if (urlToken) {
      setToken(urlToken);
    } else {
      setErr('No reset token found. Please request a new reset link.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErr('Passwords do not match.');
      return;
    }
    if (!token) {
      setErr('Missing reset token.');
      return;
    }

    setIsLoading(true);
    setMsg('');
    setErr('');

    try {
      const response = await api('/api/reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setMsg(response.message);
      setTimeout(() => onPasswordReset(), 3000);
    } catch (error: any) {
      setErr(error.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-center font-semibold text-lg">Set a New Password</h3>
      
      {msg && <p className="text-sm text-center text-green-600">{msg}</p>}
      {err && <p className="text-sm text-center text-red-600">{err}</p>}

      { !msg && token && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Reset Password
          </Button>
        </form>
      )}
       {!token && !msg && (
        <div className="text-sm text-center">
            <button type="button" onClick={onPasswordReset} className="font-medium text-blue-600 hover:text-blue-500">
                Back to Login
            </button>
        </div>
       )}
    </div>
  );
}