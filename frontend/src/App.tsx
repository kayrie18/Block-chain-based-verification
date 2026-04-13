import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  FileUp, 
  ShieldCheck, 
  Search, 
  History, 
  Users, 
  Bell, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  QrCode,
  Save,
  Eye,
  EyeOff,
  User as UserIcon,
  Settings,
  Database,
  Link,
  Table,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { User, UserRole, DocumentRecord, ActivityLog, SystemStats } from './types';
import { generateSHA256, formatDate } from './utils/helpers';
import { QRCodeSVG } from 'qrcode.react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// --- API Helpers ---
const api = {
  async post(endpoint: string, data?: any, token?: string) {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(JSON.parse(text).error?.message || 'Request failed');
    }
    return res.json();
  },
  
  async get(endpoint: string, token?: string) {
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${endpoint}`, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(JSON.parse(text).error?.message || 'Request failed');
    }
    return res.json();
  },

  async patch(endpoint: string, data?: any, token?: string) {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(JSON.parse(text).error?.message || 'Request failed');
    }
    return res.json();
  },

  async uploadForm(endpoint: string, formData: FormData, token?: string, method: string = 'POST') {
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text();
      let errorMessage = 'Request failed';
      try {
        errorMessage = JSON.parse(text).error?.message || errorMessage;
      } catch (e) {
        errorMessage = `Server error (${res.status}): ${text.substring(0, 100)}`;
      }
      throw new Error(errorMessage);
    }
    return res.json();
  },
};

// --- Components ---

const Badge = ({ children, variant = 'info' }: { children: React.ReactNode, variant?: 'success' | 'warning' | 'error' | 'info' }) => {
  const variants = {
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    error: 'bg-rose-100 text-rose-700 border-rose-200',
    info: 'bg-brand-100 text-brand-700 border-brand-200',
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", variants[variant])}>
      {children}
    </span>
  );
};

const Card = ({ children, className, title, subtitle }: { children: React.ReactNode, className?: string, title?: string, subtitle?: string }) => (
  <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}>
    {(title || subtitle) && (
      <div className="px-6 py-4 border-b border-slate-100">
        {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const Button = ({ children, variant = 'primary', className, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' }) => {
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-100 disabled:bg-slate-300',
    secondary: 'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-600',
    outline: 'border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
  };
  return (
    <button 
      className={cn("px-4 py-2 rounded-xl font-medium transition-all active:scale-95 flex items-center justify-center gap-2 disabled:pointer-events-none", variants[variant], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'dashboard'>('landing');
  const [activeTab, setActiveTab] = useState<'overview' | 'upload' | 'verify' | 'search' | 'history' | 'blockchain' | 'admin' | 'profile'>('overview');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [formData, setFormData] = useState({ email: '', password: '', name: '', role: 'User' });
  const [notifications, setNotifications] = useState<{ id: string, title: string, message: string, type: 'success' | 'info' | 'warning', timestamp: Date }[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [blockchainRecords, setBlockchainRecords] = useState<any[]>([]);

  // Load token and user from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setView('dashboard');
    }
  }, []);

  const saveAuth = (user: User, token: string) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setUser(user);
    setToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    setToken(null);
    setView('landing');
  };

  const addNotification = (title: string, message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [{ id, title, message, type, timestamp: new Date() }, ...prev].slice(0, 10));
    if (type === 'success') setSuccess(message);
    if (type === 'warning') setError(message);
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 5000);
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!token) return;
    try {
      const [metricsRes, logsRes, docsRes, chainRes] = await Promise.all([
        api.get('/dashboard/metrics', token),
        api.get('/audit', token),
        api.get('/search/documents?limit=10', token),
        api.get('/blockchain/records?limit=10', token),
      ]);
      setMetrics(metricsRes);
      setAuditLogs(logsRes.logs || []);
      setDocuments(docsRes.items || []);
      setBlockchainRecords(chainRes.records || []);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
    }
  };

  const fetchUsers = async () => {
    if (!token || user?.role !== 'Admin') return;
    try {
      const res = await api.get('/users', token);
      setUsers(res.users || []);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchProfile = async () => {
    if (!token) return;
    try {
      const res = await api.get('/users/me', token);
      setProfileData(res.user);
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
    }
  };

  // Load data when dashboard becomes active
  useEffect(() => {
    if (view === 'dashboard' && token) {
      fetchDashboardData();
      if (user?.role === 'Admin' && activeTab === 'admin') {
        fetchUsers();
      }
      if (activeTab === 'profile') {
        fetchProfile();
      }
    }
  }, [view, token, activeTab, user?.role]);

  // --- Login/Register Handlers ---

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      saveAuth(res.user, res.token);
      setView('dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (name: string, email: string, password: string, role: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register', { name, email, password, role });
      saveAuth(res.user, res.token);
      setView('dashboard');
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (data: FormData) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Use uploadForm helper for multipart/form-data with PATCH
      const res = await api.uploadForm('/users/me', data, token || '', 'PATCH');
      setUser(res.user);
      setProfileData(res.user);
      localStorage.setItem('auth_user', JSON.stringify(res.user));
      setSuccess('Profile updated successfully');
      addNotification('Profile Updated', 'Your profile information and picture have been saved.', 'success');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
      addNotification('Update Failed', err?.message || 'Could not update profile', 'warning');
    } finally {
      setLoading(false);
    }
  };

  // --- Views ---

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-white">
        <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">ChainVerify</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setView('login')}>Log in</Button>
            <Button onClick={() => setView('register')}>Get Started</Button>
          </div>
        </nav>

        <section className="relative pt-20 pb-32">
          <div className="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="info">Blockchain-Powered Security</Badge>
              <h1 className="mt-6 text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                Document Integrity <br />
                <span className="text-brand-600">Verified Instantly.</span>
              </h1>
              <p className="mt-8 text-xl text-slate-600 leading-relaxed max-w-lg">
                Secure your most important documents with cryptographic verification powered by blockchain technology.
              </p>
              <div className="mt-10 flex items-center gap-4">
                <Button className="h-14 px-8 text-lg" onClick={() => setView('register')}>Start Verifying Now</Button>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Card className="relative p-0 border-slate-200/50">
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <FileText className="text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Certificate.pdf</div>
                        <div className="text-xs text-slate-500">✓ Verified on Blockchain</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>
      </div>
    );
  }

  if (view === 'login' || view === 'register') {

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
                <ShieldCheck className="text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900">ChainVerify</span>
            </div>
          </div>
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
              {view === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-slate-500 text-center mb-8">
              {view === 'login' ? 'Sign in to access your dashboard' : 'Register to get started'}
            </p>
            
            {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}

            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              if (view === 'login') {
                handleLogin(formData.email, formData.password);
              } else {
                handleRegister(formData.name, formData.email, formData.password, formData.role);
              }
            }}>
              {view === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" 
                    placeholder="John Doe" 
                    required 
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Email Address</label>
                <input 
                  type="text" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" 
                  placeholder="name@company.com" 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <input 
                  type="password" 
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" 
                  placeholder="••••••••" 
                  required 
                />
              </div>
              
              {view === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Account Role</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                  >
                    <option value="User">User / Verifier</option>
                    <option value="Issuer">Issuer (Organization)</option>
                  </select>
                </div>
              )}

              <Button className="w-full h-12 mt-4" type="submit" disabled={loading}>
                {loading ? 'Loading...' : (view === 'login' ? 'Sign In' : 'Create Account')}
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                {view === 'login' ? "Don't have an account?" : "Already have an account?"}
                <button 
                  onClick={() => {
                    setView(view === 'login' ? 'register' : 'login');
                    setError('');
                  }}
                  className="ml-1.5 text-brand-600 font-semibold hover:underline"
                >
                  {view === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }


  // --- Dashboard Layout ---

  if (!user || !token) {
    return null;
  }

  const canAccessAdmin = user.role === 'Admin';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-50",
        isSidebarOpen ? "w-72" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="text-white" />
          </div>
          {isSidebarOpen && <span className="text-xl font-bold tracking-tight text-slate-900">ChainVerify</span>}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
            { id: 'upload', icon: FileUp, label: 'Upload', roles: ['Admin', 'Issuer'] },
            { id: 'verify', icon: ShieldCheck, label: 'Verify' },
            { id: 'search', icon: Search, label: 'Search' },
            { id: 'blockchain', icon: Database, label: 'Blockchain' },
            { id: 'history', icon: History, label: 'Audit Log' },
            { id: 'profile', icon: UserIcon, label: 'Profile' },
            { id: 'admin', icon: Users, label: 'Admin', roles: ['Admin'] },
          ]
          .filter(item => !item.roles || item.roles.length === 0 || item.roles.includes(user.role))
          .map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                activeTab === item.id ? "bg-brand-50 text-brand-600" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 transition-all"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="text-xl font-bold text-slate-900 capitalize">
              {activeTab === 'admin' ? 'Admin Panel' : activeTab === 'profile' ? 'My Profile' : activeTab}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 relative transition-colors"
              >
                <Bell size={20} />
                {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />}
              </button>
              
              <AnimatePresence>
                {isNotificationOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-[100]"
                  >
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-900">Notifications</h3>
                      <button onClick={() => setNotifications([])} className="text-xs text-brand-600 font-semibold hover:underline">Clear all</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">No new notifications</div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <div className="flex gap-3">
                              <div className={cn("w-2 h-2 mt-1.5 rounded-full shrink-0", n.type === 'success' ? 'bg-emerald-500' : n.type === 'warning' ? 'bg-rose-500' : 'bg-brand-500')} />
                              <div>
                                <div className="text-sm font-bold text-slate-900">{n.title}</div>
                                <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</div>
                                <div className="text-[10px] text-slate-400 mt-1">{formatDate(n.timestamp)}</div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-500">{user.role}</div>
              </div>
              <img 
                src={user.profilePicture ? `${API_BASE}/../uploads/${user.profilePicture}` : `https://picsum.photos/seed/${user.email}/100/100`} 
                className="w-10 h-10 rounded-xl border border-slate-200 object-cover" 
                alt="Avatar" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>
        </header>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex justify-between items-center">
            {error}
            <button onClick={() => setError('')}><X size={16} /></button>
          </div>
        )}
        {success && (
          <div className="mx-4 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex justify-between items-center">
            {success}
            <button onClick={() => setSuccess('')}><X size={16} /></button>
          </div>
        )}

        {/* View Content */}
        <div className="p-8 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Documents', value: metrics?.totalDocuments || 0, icon: FileText, color: 'brand' },
                    { label: 'Verified', value: metrics?.totalVerified || 0, icon: ShieldCheck, color: 'emerald' },
                    { label: 'Issuers', value: metrics?.totalIssuers || 0, icon: Users, color: 'amber' },
                    { label: 'System Health', value: `${metrics?.systemHealth || 0}%`, icon: AlertCircle, color: 'rose' },
                  ].map((stat, i) => (
                    <Card key={i} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", `bg-${stat.color}-50 text-${stat.color}-600`)}>
                          <stat.icon size={24} />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-slate-900">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</div>
                      <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
                    </Card>
                  ))}
                </div>

                {/* Recent Activity */}
                <Card title="Recent Activity" subtitle="Latest documents and verifications">
                  <div className="mt-6 space-y-4">
                    {auditLogs.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">No activity yet</div>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className="p-4 rounded-2xl border border-slate-100 flex items-start gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", log.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600')}>
                            {log.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{log.action}</div>
                            <div className="text-xs text-slate-500 mt-1">{log.details}</div>
                            <div className="text-[10px] text-slate-400 mt-2">{formatDate(log.timestamp)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === 'upload' && user.role !== 'Admin' && user.role !== 'Issuer' && (
              <motion.div key="upload-denied" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <AlertCircle size={48} className="mx-auto mb-4 text-rose-600" />
                <h3 className="text-lg font-bold text-slate-900">Access Denied</h3>
                <p className="text-slate-600 mt-2">Only Admins and Issuers can upload documents</p>
              </motion.div>
            )}

            {activeTab === 'upload' && (user.role === 'Admin' || user.role === 'Issuer') && (
              <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto">
                <UploadView 
                  token={token!} 
                  onSuccess={() => { fetchDashboardData(); }} 
                  onNotify={addNotification}
                />
              </motion.div>
            )}

            {activeTab === 'verify' && (
              <motion.div key="verify" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-3xl mx-auto">
                <VerifyView token={token!} onVerified={(res) => {
                  addNotification('Verification Complete', `Document: ${res.verdict}`, res.isAuthentic ? 'success' : 'warning');
                  fetchDashboardData();
                }} />
              </motion.div>
            )}

            {activeTab === 'blockchain' && (
              <motion.div key="blockchain" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <BlockchainRecordsView records={blockchainRecords} loading={loading} onRefresh={fetchDashboardData} />
              </motion.div>
            )}

            {activeTab === 'search' && (
              <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <SearchView token={token!} />
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <Card title="System Audit Log" subtitle="Complete history of all activities">
                  <div className="mt-6 space-y-4">
                    {auditLogs.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">No audit log entries</div>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className="p-4 rounded-2xl border border-slate-100 flex items-center justify-between hover:bg-slate-50">
                          <div className="flex items-center gap-4">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", log.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600')}>
                              {log.type === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900">{log.action}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{log.details} • By {log.userName}</div>
                            </div>
                          </div>
                          <div className="text-sm font-bold text-slate-500">{formatDate(log.timestamp).split(',')[0]}</div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === 'profile' && profileData && (
              <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl mx-auto">
                <ProfileView user={profileData} token={token!} onUpdate={handleProfileUpdate} loading={loading} />
              </motion.div>
            )}

            {activeTab === 'admin' && canAccessAdmin && (
              <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <AdminView metrics={metrics} users={users} token={token!} onRefresh={fetchUsers} />
              </motion.div>
            )}

            {activeTab === 'admin' && !canAccessAdmin && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <AlertCircle size={48} className="mx-auto mb-4 text-rose-600" />
                <h3 className="text-lg font-bold text-slate-900">Access Denied</h3>
                <p className="text-slate-600 mt-2">Admin panel is only available to administrators</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// --- Sub-Views ---

function UploadView({ token, onSuccess, onNotify }: { token: string; onSuccess: () => void; onNotify: (t: string, m: string, ty: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    ownerName: '',
    issuingOrganization: '',
    documentType: 'Degree',
  });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = new FormData();
      data.append('document', file);
      data.append('title', formData.title);
      data.append('ownerName', formData.ownerName);
      data.append('issuingOrganization', formData.issuingOrganization);
      data.append('documentType', formData.documentType);

      await api.uploadForm('/documents/upload', data, token);
      onNotify('Upload Successful', `Document "${formData.title}" is now recorded on the blockchain.`, 'success');
      setFormData({ title: '', ownerName: '', issuingOrganization: '', documentType: 'Degree' });
      setFile(null);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
      onNotify('Upload Failed', err?.message || 'An error occurred during upload', 'warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Upload New Document" subtitle="Upload a document to generate a blockchain record">
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8 mt-8">
          <div className="space-y-4">
            {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1.5">Document Title</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Degree Certificate" required />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1.5">Document Owner</label>
              <input type="text" value={formData.ownerName} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Full Name" required />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1.5">Issuing Organization</label>
              <input type="text" value={formData.issuingOrganization} onChange={(e) => setFormData({ ...formData, issuingOrganization: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Organization Name" required />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1.5">Document Type</label>
              <select value={formData.documentType} onChange={(e) => setFormData({ ...formData, documentType: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none bg-white">
                <option>Degree</option>
                <option>Contract</option>
                <option>Certificate</option>
                <option>Licence</option>
                <option>Document</option>
                <option>PowerPoint</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div 
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-brand-400 hover:bg-brand-50/30 transition-all cursor-pointer"
            >
              <FileUp className="text-brand-600 mb-3" size={32} />
              <div className="text-sm font-bold text-slate-900">Click to upload</div>
              <div className="text-xs text-slate-500 mt-1">PDF, PNG, JPG up to 10MB</div>
              {file && <div className="text-xs text-emerald-600 mt-3 font-bold">✓ {file.name}</div>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={formData.documentType === 'PowerPoint' ? '.ppt' : '*'}
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                if (f && formData.documentType === 'PowerPoint' && !f.name.toLowerCase().endsWith('.ppt')) {
                  setError('Only .ppt files are allowed for PowerPoint documents.');
                  setFile(null);
                } else {
                  setFile(f);
                }
              }}
              className="hidden"
            />
            <Button className="w-full h-12" disabled={loading || !file}>
              {loading ? 'Uploading...' : 'Register on Blockchain'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function VerifyView({ token, onVerified }: { token: string; onVerified: (res: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [documentId, setDocumentId] = useState('');
  const [viewMode, setViewMode] = useState<'file' | 'id'>('file');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleVerify = async () => {
    if (viewMode === 'file' && !file) return;
    if (viewMode === 'id' && !documentId) return;

    setLoading(true);
    setResult(null);
    try {
      let res;
      if (viewMode === 'file' && file) {
        // First we search for the document by its hash to get its ID
        const hash = await generateSHA256(file);
        const searchRes = await api.get(`/search/documents?sha256Hash=${hash}`, token);
        
        if (searchRes.items && searchRes.items.length > 0) {
          const doc = searchRes.items[0];
          // Now verify it using the specific verification endpoint
          const formData = new FormData();
          formData.append('document', file);
          res = await api.uploadForm(`/verification/documents/${doc.id}`, formData, token);
        } else {
          throw new Error('This document is not present in the blockchain ledger. Please upload the document first before attempting verification.');
        }
      } else {
        // Verify by ID (QR scan simulation)
        res = await api.get(`/qr/verify?documentId=${documentId}`, token);
      }
      
      setResult(res);
      onVerified(res);
    } catch (err: any) {
      setResult({ verdict: 'Verification Failed', isAuthentic: false, message: err?.message });
      onVerified({ verdict: 'Verification Failed', isAuthentic: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Verify Document Integrity</h2>
        <p className="text-slate-500 mt-2">Check the authenticity of any document against the blockchain</p>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-2xl mb-8 max-w-xs mx-auto">
        <button 
          onClick={() => setViewMode('file')}
          className={cn("flex-1 py-2 text-sm font-bold rounded-xl transition-all", viewMode === 'file' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
          File Upload
        </button>
        <button 
          onClick={() => setViewMode('id')}
          className={cn("flex-1 py-2 text-sm font-bold rounded-xl transition-all", viewMode === 'id' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
          QR / ID Search
        </button>
      </div>

      <div className="space-y-6">
        {viewMode === 'file' ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-3 border-dashed border-brand-200 bg-white rounded-3xl p-12 flex flex-col items-center justify-center text-center hover:border-brand-500 transition-all cursor-pointer group"
          >
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
              <ShieldCheck className="text-brand-600" size={32} />
            </div>
            <div className="text-lg font-bold text-slate-900">Drop document here to verify</div>
            <p className="text-slate-600 mt-2">We will check its cryptographic hash against the blockchain</p>
            {file && <div className="text-sm text-emerald-600 mt-4 font-bold flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">✓ {file.name}</div>}
          </div>
        ) : (
          <Card className="p-8">
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <QrCode className="text-brand-600" size={32} />
              </div>
              <h3 className="font-bold text-slate-900">Enter Document ID</h3>
              <p className="text-sm text-slate-500">Scan result or manual ID entry for blockchain lookup</p>
              <input 
                type="text" 
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-center font-mono"
                placeholder="DOC-67a4..."
              />
            </div>
          </Card>
        )}
        
        <input
          ref={fileRef}
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
        />

        {loading && (
          <div className="py-8 flex flex-col items-center justify-center gap-4">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full" />
            <div className="text-sm font-bold text-slate-600">Checking Blockchain...</div>
          </div>
        )}

        {result && !loading && (
          <Card className={cn("border-2 shadow-xl", result.isAuthentic ? 'border-emerald-200' : 'border-rose-200 animate-pulse')}>
            <div className="p-8 text-center">
              <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6", result.isAuthentic ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600')}>
                {result.isAuthentic ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
              </div>
              <div className={cn("text-3xl font-black mb-2", result.isAuthentic ? 'text-emerald-700' : 'text-rose-700')}>
                {result.verdict}
              </div>
              <div className="text-slate-600 font-medium">
                {result.isAuthentic 
                  ? 'This document is authentic and matches the blockchain record.' 
                  : (result.message || 'This document has been tampered with or is not registered.')}
              </div>

              {result.metadata && (
                <div className="mt-8 pt-8 border-t border-slate-100 text-left grid grid-cols-2 gap-y-4 gap-x-8">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Title</div>
                    <div className="text-sm font-bold text-slate-900">{result.metadata.title}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Owner</div>
                    <div className="text-sm font-bold text-slate-900">{result.metadata.ownerName}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Blockchain Hash</div>
                    <div className="text-xs font-mono text-slate-700 break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {result.hashes?.blockchainHash || result.blockchainHash}
                    </div>
                  </div>
                  {result.blockchain && (
                    <div className="col-span-2 flex items-center gap-4 mt-2">
                      <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Link size={10} /> Transaction ID</div>
                        <div className="text-[10px] font-mono text-slate-600 truncate">{result.blockchain.transactionId}</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Table size={10} /> Block</div>
                        <div className="text-xs font-bold text-slate-900">{result.blockchain.blockNumber}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {((viewMode === 'file' && file) || (viewMode === 'id' && documentId)) && (
          <Button className="w-full h-14 text-lg shadow-xl shadow-brand-100" onClick={handleVerify} disabled={loading}>
            {loading ? 'Verifying Integrity...' : 'Verify on Blockchain'}
          </Button>
        )}
      </div>
    </div>
  );
}

function BlockchainRecordsView({ records, loading, onRefresh }: { records: any[]; loading: boolean; onRefresh: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Blockchain Ledger</h2>
          <p className="text-sm text-slate-500">All registered documents on the public blockchain</p>
        </div>
        <Button variant="outline" onClick={onRefresh} disabled={loading} className="h-10 text-xs">
          Refresh Ledger
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaction ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Block</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No blockchain records found.</td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="text-brand-600" size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{r.title}</div>
                          <div className="text-[10px] text-slate-500 truncate">{r.ownerName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[120px]">
                          {r.transactionId}
                        </code>
                        <Link size={12} className="text-slate-400 hover:text-brand-600 cursor-pointer" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-mono text-slate-700">{r.blockNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-500">{formatDate(new Date(r.timestamp * 1000)).split(',')[0]}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge variant={r.confirmed ? 'success' : 'warning'}>{r.confirmed ? 'Confirmed' : 'Pending'}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SearchView({ token }: { token: string }) {
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/search/documents?q=${encodeURIComponent(query)}&limit=20`, token);
      setDocuments(res.items || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
            placeholder="Search by title, owner, hash, or organization..."
          />
        </div>
        <Button className="px-8 h-14" onClick={handleSearch} disabled={loading}>{loading ? 'Searching...' : 'Search Ledger'}</Button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
          <Search size={48} className="mx-auto text-slate-300 mb-4" />
          <div className="text-lg font-bold text-slate-400">No documents found</div>
          <p className="text-sm text-slate-500 mt-1">Try searching for a different keyword or document hash</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                onClick={() => setSelectedDoc(doc)}
                className={cn(
                  "p-5 bg-white border rounded-2xl transition-all cursor-pointer group",
                  selectedDoc?.id === doc.id ? "border-brand-500 ring-2 ring-brand-50 ring-offset-2" : "border-slate-100 hover:border-brand-200 hover:shadow-md"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-brand-50 transition-colors">
                      <FileText className="text-slate-400 group-hover:text-brand-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{doc.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Owner: {doc.ownerName} • Issuer: {doc.issuingOrganization}</div>
                    </div>
                  </div>
                  <Badge variant={doc.verificationStatus === 'OnChainConfirmed' ? 'success' : 'warning'}>
                    {doc.verificationStatus === 'OnChainConfirmed' ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:sticky lg:top-8 h-fit">
            <AnimatePresence mode="wait">
              {selectedDoc ? (
                <motion.div key={selectedDoc.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <Card className="p-0 overflow-hidden border-brand-100">
                    <div className="bg-brand-600 p-6 text-white">
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="success">Authentic</Badge>
                        <ShieldCheck size={20} />
                      </div>
                      <h3 className="text-xl font-bold">{selectedDoc.title}</h3>
                      <p className="text-brand-100 text-sm mt-1">{selectedDoc.documentType} Registry</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="flex justify-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <QRCodeSVG value={selectedDoc.id} size={160} level="H" includeMargin={true} />
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Blockchain Hash</div>
                          <div className="text-[10px] font-mono text-slate-700 break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
                            {selectedDoc.sha256Hash}
                          </div>
                        </div>
                        
                        {selectedDoc.blockchain && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transaction ID</div>
                              <div className="text-[10px] font-mono text-slate-600 truncate">{selectedDoc.blockchain.transactionId}</div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Block</div>
                              <div className="text-xs font-bold text-slate-900">{selectedDoc.blockchain.blockNumber}</div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Stored On</div>
                              <div className="text-xs font-bold text-slate-900 capitalize">{selectedDoc.storageProvider}</div>
                            </div>
                          </div>
                        )}
                      </div>

                      <Button className="w-full h-12" variant="outline">
                        <QrCode size={18} /> Download QR Code
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <div className="p-12 border-2 border-dashed border-slate-200 rounded-3xl text-center">
                  <ArrowRight size={32} className="mx-auto text-slate-300 mb-4" />
                  <div className="text-sm font-bold text-slate-400">Select a document</div>
                  <p className="text-xs text-slate-500 mt-1">to view full blockchain details and QR code</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileView({ user, token, onUpdate, loading }: { user: User; token: string; onUpdate: (data: FormData) => void; loading: boolean }) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    organization: user.organization || '',
    password: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('organization', formData.organization);
    if (formData.password) data.append('password', formData.password);
    if (file) data.append('profilePicture', file);
    onUpdate(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const avatarUrl = preview || (user.profilePicture ? `${API_BASE}/../uploads/${user.profilePicture}` : `https://picsum.photos/seed/${user.email}/100/100`);

  return (
    <div className="max-w-2xl mx-auto">
      <Card title="My Profile" subtitle="Manage your account settings">
        <form onSubmit={handleUpdate} className="space-y-8 mt-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <img 
                src={avatarUrl} 
                className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-xl group-hover:opacity-75 transition-opacity" 
                alt="Avatar" 
              />
              <button 
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div className="bg-white/90 p-2 rounded-xl shadow-lg border border-slate-200">
                  <FileUp size={20} className="text-brand-600" />
                </div>
              </button>
            </div>
            <div className="text-center">
              <div className="font-bold text-slate-900">{user.name}</div>
              <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">{user.role}</div>
            </div>
            <input type="file" ref={fileRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">Full Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" required />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" required />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">Organization</label>
            <input type="text" value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Your organization name" />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">Change Password (optional)</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none pr-10"
                placeholder="Leave blank to keep current password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formData.password && <div className="text-xs text-slate-500 mt-2">Password must be at least 8 characters</div>}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            <Save size={18} /> {loading ? 'Updating...' : 'Update Profile'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function AdminView({ metrics, users, token, onRefresh }: { metrics: any; users: User[]; token: string; onRefresh: () => void }) {
  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="text-sm font-bold text-slate-500 mb-1">System Health</div>
          <div className="text-2xl font-black text-emerald-600">{metrics?.systemHealth || 0}%</div>
          <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${metrics?.systemHealth || 0}%` }} />
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-bold text-slate-500 mb-1">Blockchain Latency</div>
          <div className="text-2xl font-black text-slate-900">{metrics?.blockchainLatencyMs || 0}ms</div>
          <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 w-[40%]" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-bold text-slate-500 mb-1">Storage Used</div>
          <div className="text-2xl font-black text-slate-900">{metrics?.storageUsedHuman || '0 B'}</div>
          <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 w-[65%]" />
          </div>
        </Card>
      </div>

      <Card title="User Management" subtitle={`${users.length} users registered`}>
        <div className="mt-6 space-y-3">
          {users.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No users registered yet</div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <img src={`https://picsum.photos/seed/${u.email}/100/100`} className="w-10 h-10 rounded-full" alt="User" referrerPolicy="no-referrer" />
                  <div>
                    <div className="text-sm font-bold text-slate-900">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                </div>
                <Badge variant="info">{u.role}</Badge>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}