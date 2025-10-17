import React, { useState, useEffect } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { api } from '../lib/api';
import TwoFAModal from '../components/TwoFAModal';
import BehaviorTracker from '../components/BehaviorTracker';
import { getDeviceId } from '../lib/device';
import Input from '../components/Input';
import Button from '../components/Button';

export default function Login({ onSuccess, onForgotPassword }: { onSuccess: (u: any) => void; onForgotPassword: () => void; }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [behavior, setBehavior] = useState<any>({});
  const [twoFAOpen, setTwoFAOpen] = useState(false);
  const [twoFAMessage, setTwoFAMessage] = useState('');
  const [pending, setPending] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState('');
  const [deviceId, setDeviceId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  async function tryLogin(extra: any = {}) {
    setError('');
    setIsLoading(true);

    if (!captchaToken && !extra.twoFAToken) {
      setError('Please complete the CAPTCHA verification.');
      setIsLoading(false);
      return;
    }

    try {
      const body = { email, password, captchaToken, behavior, deviceId, ...extra };
      const res = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(body) });
      
      if (res?.stage === '2fa') {
        setPending({ email, password });
        setTwoFAMessage(res.message || 'Enter the 6-digit code from your authenticator app.');
        setTwoFAOpen(true);
        return;
      }
      
      if (res?.token) {
        localStorage.setItem('authToken', res.token);
        onSuccess({ ...res.user, token: res.token });
      }
    } catch (e: any) {
      setError(e.message || 'Login failed');
      setCaptchaToken(null); 
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <BehaviorTracker onUpdate={setBehavior} />
      <div>
        <label htmlFor="email" className="sr-only">Email</label>
        <Input id="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="password" className="sr-only">Password</label>
        <Input id="password" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </div>

      {siteKey ? (
        <div className="flex justify-center">
            <ReCAPTCHA sitekey={siteKey} onChange={(token) => setCaptchaToken(token)} />
        </div>
      ) : (
        <p className="text-sm text-red-600">reCAPTCHA Site Key is missing.</p>
      )}

      <Button onClick={() => tryLogin()} disabled={!captchaToken || isLoading} className="w-full" isLoading={isLoading}>
        Login
      </Button>

      {error && <p className="text-sm text-center text-red-600">{error}</p>}

      <div className="text-sm text-center">
        <button type="button" onClick={onForgotPassword} className="font-medium text-blue-600 hover:text-blue-500">
          Forgot your password?
        </button>
      </div>

      <TwoFAModal
        open={twoFAOpen}
        onClose={() => setTwoFAOpen(false)}
        message={twoFAMessage}
        onSubmit={async (code, trustDevice) => {
          if (!pending) throw new Error('No pending login');
          await tryLogin({ twoFAToken: code, trustDevice: trustDevice });
          setTwoFAOpen(false);
        }}
      />
    </div>
  );
}