import React, { useState } from 'react';
import { api } from '../lib/api';
import Input from '../components/Input';
import Button from '../components/Button';

export default function ForgotPassword({ onCancel }: { onCancel: () => void }) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMsg('');
    setErr('');

    try {
      const response = await api('/api/reset/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMsg(response.message);
    } catch (error: any) {
      setErr(error.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-center font-semibold text-lg">Reset Your Password</h3>
      <p className="text-center text-sm text-gray-600">
        Enter your email address and we will send you a link to reset your password.
      </p>
      
      {msg && <p className="text-sm text-center text-green-600">{msg}</p>}
      {err && <p className="text-sm text-center text-red-600">{err}</p>}

      {!msg && (
        <>
            <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
            />
            <Button type="submit" className="w-full" isLoading={isLoading}>
                Send Reset Link
            </Button>
        </>
      )}

      <div className="text-sm text-center">
        <button type="button" onClick={onCancel} className="font-medium text-blue-600 hover:text-blue-500" disabled={isLoading}>
          Back to Login
        </button>
      </div>
    </form>
  );
}