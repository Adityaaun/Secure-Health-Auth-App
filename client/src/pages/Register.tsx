import React, { useState, useEffect } from 'react';
import zxcvbn from 'zxcvbn'; // Import the library
import { api } from '../lib/api';
import { authed } from '../lib/authed'; // Added missing import
import Input from '../components/Input';
import Button from '../components/Button';

// Helper component for the strength bar
const PasswordStrengthMeter = ({ score }: { score: number }) => {
  const strength = {
    0: { text: 'Very Weak', color: 'bg-red-500' },
    1: { text: 'Weak', color: 'bg-orange-500' },
    2: { text: 'Okay', color: 'bg-yellow-500' },
    3: { text: 'Good', color: 'bg-blue-500' },
    4: { text: 'Strong', color: 'bg-green-500' },
  }[score];

  const width = `${(score + 1) * 20}%`;

  return (
    <div>
      <div className="relative h-2 bg-gray-200 rounded-full">
        <div 
          className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-300 ${strength?.color}`}
          style={{ width: width }}
        />
      </div>
      <p className="text-right text-xs mt-1 text-gray-500">
        Strength: <span className="font-semibold">{strength?.text}</span>
      </p>
    </div>
  );
};

export default function Register({ onRegistered }: { onRegistered: () => void }) {
  // --- Step 1 State ---
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'doctor' | 'patient'>('doctor');
  
  // --- Password Strength State ---
  const [strength, setStrength] = useState({ score: 0 });

  // --- Step 2 State ---
  const [step, setStep] = useState<'register' | '2fa' | 'done'>('register');
  const [tempAuth, setTempAuth] = useState<{ token: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [tempSecret, setTempSecret] = useState<string | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');

  // --- General State ---
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Effect to check password strength ---
  useEffect(() => {
    if (password) {
      setStrength(zxcvbn(password));
    } else {
      setStrength({ score: 0 });
    }
  }, [password]);

  const isPasswordWeak = strength.score < 2; // Password must be at least "Okay"

  // --- Step 1: Handle Initial Registration ---
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (isPasswordWeak) {
      setErr('Please choose a stronger password.');
      return;
    }
    setErr(''); setMsg('');
    setIsLoading(true);
    try {
      const res = await api('/api/auth/register', { 
        method: 'POST', 
        body: JSON.stringify({ name, email, password, role }) 
      });
      
      setTempAuth({ token: res.token });
      await startTwoFASetup(res.token);
      setStep('2fa');
      setMsg('Account created! Now, secure your account with two-factor authentication.');
    } catch (e: any) {
      setErr(e.message || 'Failed to register.');
    } finally {
      setIsLoading(false);
    }
  }

  // --- Step 2.1: Fetch QR Code ---
  async function startTwoFASetup(token: string) {
    setIsLoading(true); setErr('');
    try {
      const r = await authed('/api/2fa/setup', token, { method: 'POST' });
      setQr(r.qrDataUrl);
      setTempSecret(r.tempSecret);
    } catch (e: any) {
      setErr(e.message || 'Failed to start 2FA setup');
    } finally {
      setIsLoading(false);
    }
  }

  // --- Step 2.2: Confirm & Enable 2FA ---
  async function confirmEnable() {
    if (!tempAuth) return;
    setIsLoading(true); setErr('');
    try {
      await authed('/api/2fa/enable', tempAuth.token, { 
        method: 'POST', 
        body: JSON.stringify({ token: twoFaCode }) 
      });
      setMsg('Setup complete! You can now log in.');
      setStep('done');
      setTimeout(() => onRegistered(), 2000);
    } catch (e: any) {
      setErr(e.message || 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  }

  if (step === '2fa' || step === 'done') {
    return (
      <div className="space-y-4">
        <h3 className="text-center font-semibold text-lg">Secure Your Account</h3>
        <p className="text-center text-sm text-gray-600">Scan the QR code with your authenticator app (e.g., Google Authenticator, Authy), then enter the 6-digit code below.</p>
        
        {err && <p className="text-sm text-center text-red-600">{err}</p>}
        {msg && <p className="text-sm text-center text-green-600">{msg}</p>}

        {qr && step === '2fa' && (
          <div className="p-4 border rounded-md space-y-4">
            <div className="flex flex-col items-center">
              <img src={qr} alt="QR Code" className="border p-1 bg-white" />
              {tempSecret && <p className="text-xs text-gray-500 mt-2">Manual setup key: <code>{tempSecret}</code></p>}
            </div>
            <div className="flex gap-2">
              <Input value={twoFaCode} onChange={e => setTwoFaCode(e.target.value)} placeholder="Enter 6-digit code" disabled={isLoading} />
              <Button onClick={confirmEnable} isLoading={isLoading}>Confirm</Button>
            </div>
          </div>
        )}

        {step === 'done' && (
           <Button onClick={onRegistered} className="w-full">Go to Login</Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <Input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />
      <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
      
      {/* --- Password Strength Meter UI --- */}
      {password && <PasswordStrengthMeter score={strength.score} />}

      <select
        value={role}
        onChange={e => setRole(e.target.value as any)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="doctor">Register as a Doctor</option>
        <option value="patient">Register as a Patient</option>
      </select>

      <Button type="submit" className="w-full" isLoading={isLoading} disabled={isPasswordWeak && !!password}>
        Create account
      </Button>

      {err && <p className="text-sm text-center text-red-600">{err}</p>}
    </form>
  );
}