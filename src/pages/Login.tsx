import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Navigate } from 'react-router-dom';
import { setCredentials } from '../store/authSlice';
import type { RootState } from '../store/store';
import { Mail, Lock, ArrowRight, Truck, User } from 'lucide-react';
import { api } from '../services/api';
import { socketService } from '../services/socket';

export const Login: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'client' | 'rider'>('client');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  // If already logged in, redirect accordingly
  if (isAuthenticated && user) {
    if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
    if (user.role === 'client') return <Navigate to="/orders" replace />;
    if (user.role === 'rider') return <Navigate to="/my-deliveries" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isRegister) {
        // Register
        await api.post<{ access_token: string }>('/auth/register', {
          name,
          email,
          password,
          role,
        });

        // After register, automatically log in by fetching user details or registering credentials
        // To be safe, we login after register
        const loginRes = await api.post<{ access_token: string; user: { id: string; name: string; email: string; role: 'admin' | 'client' | 'rider' } }>('/auth/login', {
          email,
          password,
        });

        dispatch(setCredentials({
          token: loginRes.data.access_token,
          user: loginRes.data.user,
        }));
        
        socketService.connect();
        redirectUser(loginRes.data.user.role);
      } else {
        // Login
        const loginRes = await api.post<{ access_token: string; user: { id: string; name: string; email: string; role: 'admin' | 'client' | 'rider' } }>('/auth/login', {
          email,
          password,
        });

        dispatch(setCredentials({
          token: loginRes.data.access_token,
          user: loginRes.data.user,
        }));

        socketService.connect();
        redirectUser(loginRes.data.user.role);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Authentication failed. Please verify credentials.';
      setErrorMsg(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  const redirectUser = (userRole: 'admin' | 'client' | 'rider') => {
    if (userRole === 'admin') navigate('/dashboard');
    else if (userRole === 'client') navigate('/orders');
    else if (userRole === 'rider') navigate('/my-deliveries');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-900/40 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-900/40 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="bg-slate-900/90 border border-slate-800 shadow-2xl rounded-3xl max-w-md w-full p-6 sm:p-8 relative z-10 backdrop-blur-xl">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-indigo-600/10 p-3 rounded-full mb-3 border border-indigo-500/20">
            <Truck className="w-8 h-8 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">
            {isRegister ? 'Create Account' : 'Log In'}
          </h2>
          <p className="text-slate-400 mt-1 text-center text-xs">
            {isRegister ? 'Sign up to manage delivery logistics' : 'Enter your credentials to access the platform'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/40 text-red-200 text-xs rounded-xl font-medium animate-shake">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 bg-slate-950 text-slate-200 text-sm transition-all focus:ring-1 focus:ring-indigo-500"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-9 pr-3 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 bg-slate-950 text-slate-200 text-sm transition-all focus:ring-1 focus:ring-indigo-500"
                placeholder="email@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-9 pr-3 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 bg-slate-950 text-slate-200 text-sm transition-all focus:ring-1 focus:ring-indigo-500"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="client">Client (Place Orders)</option>
                <option value="rider">Rider (Deliver Orders)</option>
                <option value="admin">Admin (Dashboard & Track)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.98] flex items-center justify-center gap-2 mt-4 text-sm disabled:opacity-50"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <>
                <span>{isRegister ? 'Sign Up' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg(null);
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};
