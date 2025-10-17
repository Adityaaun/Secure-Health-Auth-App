import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import Login from './Login';
import Register from './Register';
import DashboardDoctor from './DashboardDoctor';
import DashboardPatient from './DashboardPatient';
import AdminPanel from './AdminPanel';
import { User } from '../types';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';


export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgotPassword' | 'resetPassword'>('login');

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/reset-password')) {
        setAuthView('resetPassword');
    }

    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decoded: User & { exp: number, sessionId: string } = jwtDecode(token);
        
        if (decoded.exp * 1000 > Date.now()) {
          setUser({
            id: decoded.id,
            name: decoded.name,
            email: decoded.email,
            role: decoded.role,
            token: token,
            primaryDoctorId: decoded.primaryDoctorId
          });
        } else {
          localStorage.removeItem('authToken');
        }
      } catch (error) {
        console.error("Invalid token found in localStorage", error);
        localStorage.removeItem('authToken');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };
  
  const handlePasswordReset = () => {
    window.history.pushState({}, '', '/');
    setAuthView('login');
  };

  const renderAuthContent = () => {
    switch(authView) {
      case 'register':
        return <Register onRegistered={() => setAuthView('login')} />;
      case 'forgotPassword':
        return <ForgotPassword onCancel={() => setAuthView('login')} />;
      case 'resetPassword':
        return <ResetPassword onPasswordReset={handlePasswordReset} />;
      case 'login':
      default:
        return <Login onSuccess={setUser} onForgotPassword={() => setAuthView('forgotPassword')} />;
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <div className="flex items-center justify-center py-10 px-4">
          <div className="w-full max-w-md space-y-6 bg-white rounded-2xl shadow-md p-8 border border-gray-100">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">HealthGuard — Secure Auth</h1>
              <p className="mt-1 text-gray-500 text-sm">Login or create an account to continue</p>
            </div>
            
            {(authView === 'login' || authView === 'register') && (
              <div className="grid grid-cols-2 rounded-xl bg-gray-100 p-1">
                <button
                  className={`py-2.5 rounded-lg text-sm font-medium transition ${authView === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-800'}`}
                  onClick={() => setAuthView('login')}
                >
                  Login
                </button>
                <button
                  className={`py-2.5 rounded-lg text-sm font-medium transition ${authView === 'register' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-800'}`}
                  onClick={() => setAuthView('register')}
                >
                  Register
                </button>
              </div>
            )}
            
            <div className="mt-4">
              {renderAuthContent()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';
  const isDoctor = user.role === 'doctor';
  const isPatient = user.role === 'patient';

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-gray-900">HealthGuard</span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 capitalize">{user.role}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="inline-flex items-center rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAdmin ? <AdminPanel user={user} /> :
         isDoctor ? <DashboardDoctor user={user} onLogout={handleLogout} /> :
         isPatient ? <DashboardPatient user={user} /> :
         null}
      </main>
    </div>
  );
}