import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  FileUp, 
  ShieldCheck, 
  Search, 
  History, 
  Users, 
  LogOut, 
  Menu, 
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  User as UserIcon,
  Copy,
  Download,
  Mail,
  Send,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// Removed broken imports - inline views
import { api } from './lib/api';
import { cn } from './lib/utils';
import { User, UserRole, DocumentRecord, ActivityLog, SystemStats } from './types';

import { Avatar } from './components/Avatar';

import { PublicVerifyPage } from './pages/PublicVerifyPage';
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
// Cleaned - use imported api from lib/api.ts

// --- Components ---

const Badge: React.FC<React.PropsWithChildren<{ variant?: 'success' | 'warning' | 'error' | 'info'; className?: string }>> = ({ children, variant = 'info', className }) => {
  const variants = {
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    error: 'bg-rose-100 text-rose-700 border-rose-200',
    info: 'bg-brand-100 text-brand-700 border-brand-200',
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border inline-flex items-center", variants[variant], className)}>
      {children}
    </span>
  );
};

const Card: React.FC<React.PropsWithChildren<{ className?: string, title?: string, subtitle?: string }>> = ({ children, className, title, subtitle }) => (
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
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'dashboard' | 'publicVerify'>('landing');
  const [activeTab, setActiveTab] = useState<'overview' | 'upload' | 'verify' | 'search' | 'history' | 'admin' | 'profile'>('overview');

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
    setProfileData(null);
    setView('landing');
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!token) return;
    try {
      const [metricsRes, logsRes, docsRes] = await Promise.all([
        api.get('/dashboard/metrics', token),
        api.get('/dashboard/audit', token),
        api.get('/search/documents?limit=10', token),
      ]);
      setMetrics(metricsRes);
      setAuditLogs(logsRes.logs || []);
      setDocuments(docsRes.items || []);
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

  const handleProfileUpdate = async (data: any) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.patch('/users/me', data, token || '');
      setUser(res.user);
      setProfileData(res.user);
      localStorage.setItem('auth_user', JSON.stringify(res.user));
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
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

              <div className="mt-6">
                <Button variant="outline" className="h-14 px-8 text-lg" onClick={() => setView('publicVerify')}>
                  PUBLIC VERIFY
                </Button>
                <p className="mt-2 text-xs text-slate-500">Search and verify authenticity without signing in.</p>
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

  if (view === 'publicVerify') {
    return <PublicVerifyPage onBack={() => setView('landing')} />;
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
                  type="email" 
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
            { id: 'search', icon: Search, label: 'Search' },
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
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-500">{user.role}</div>
              </div>
              <Avatar user={user} size="md" className="border border-slate-200" />
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
              <UploadView token={token!} onSuccess={() => { setSuccess('Document uploaded successfully'); fetchDashboardData(); }} />
            )}



            {activeTab === 'search' && (
              <SearchView token={token!} />
            )}

            {activeTab === 'history' && (
              <AuditLogView token={token!} userRole={user.role} />
            )}

            {activeTab === 'profile' && !profileData && (
              <div className="text-center py-12 text-slate-500">Loading profile...</div>
            )}
            {activeTab === 'profile' && profileData && (
              <ProfileView user={profileData} token={token!} onUpdate={handleProfileUpdate} loading={loading} />
            )}

            {activeTab === 'admin' && canAccessAdmin && (
              <AdminView metrics={metrics} users={users} token={token!} onRefresh={fetchUsers} />
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

function UploadView({ token, onSuccess }: { token: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedDoc, setUploadedDoc] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    ownerName: '',
    issuingOrganization: '',
    documentType: 'Degree',
  });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const allowedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        setError('Unsupported file format. Allowed: PDF, DOC, DOCX, PPT, PPTX.');
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

      const res = await api.uploadForm('/documents/upload', data, token);
      setUploadedDoc(res);
      setFormData({ title: '', ownerName: '', issuingOrganization: '', documentType: 'Degree' });
      setFile(null);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto">
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
                <option>License</option>
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
              <div className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, PPT, PPTX up to 20MB</div>
              {file && <div className="text-xs text-emerald-600 mt-3 font-bold">✓ {file.name}</div>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <Button className="w-full h-12" disabled={loading || !file}>
              {loading ? 'Uploading...' : 'Register on Blockchain'}
            </Button>
          </div>
        </form>
      </Card>

      {uploadedDoc && (
        <Card title="Document Uploaded Successfully" subtitle="Your document has been anchored on the blockchain">
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle2 className="text-emerald-600 shrink-0" size={22} />
              <div>
                <div className="text-sm font-bold text-emerald-800">Blockchain Anchoring Confirmed</div>
                <div className="text-xs text-emerald-700 mt-0.5">Document hash recorded on-chain. Status: {uploadedDoc.status}</div>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400 font-bold mb-2">SHA-256 Authenticity Hash</div>
              <div className="font-mono text-sm break-all bg-slate-50 border border-slate-100 rounded-xl p-3 text-slate-800 select-all">
                {uploadedDoc.sha256Hash || uploadedDoc.document?.sha256Hash}
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Share this hash so others can independently verify your document on ChainVerify's public portal.
            </p>
            <div className="flex flex-wrap gap-3">
              <UploadHashCopyButton hash={uploadedDoc.sha256Hash || uploadedDoc.document?.sha256Hash} />
              <Button
                variant="outline"
                onClick={() => {
                  const hash = uploadedDoc.sha256Hash || uploadedDoc.document?.sha256Hash || '';
                  const title = uploadedDoc.document?.title || uploadedDoc.title || 'Document';
                  const subject = encodeURIComponent(`Document Authenticity Hash — ${title}`);
                  const body = encodeURIComponent(
                    `Hello,\n\nI am sharing the SHA-256 authenticity hash for the following document registered on ChainVerify:\n\nDocument: ${title}\nSHA-256 Hash: ${hash}\n\nYou can independently verify this document by visiting the ChainVerify public portal and searching for this hash.\n\nThis hash is cryptographically tied to the document and cannot be forged.`
                  ).replace(/%0A/g, '%0D%0A');
                  window.location.href = `mailto:?subject=${subject}&body=${body}`;
                }}
              >
                <Mail size={16} /> Share via Email
              </Button>
            </div>
          </div>
        </Card>
      )}
    </motion.div>
  );
}



// Helper: copy hash with tick feedback
function UploadHashCopyButton({ hash }: { hash?: string }) {
  const [copied, setCopied] = useState(false);
  if (!hash) return null;
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(hash);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Hash</>}
    </Button>
  );
}

function SearchView({ token }: { token: string }) {
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

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

  const isPreviewable = (fileName?: string) => {
    if (!fileName) return false;
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'txt'].includes(ext || '');
  };

  // Open document inline in new tab via authenticated URL (sets Content-Disposition: inline)
  const handleView = (docId: string, fileName?: string) => {
    if (!isPreviewable(fileName)) {
      alert('Preview unavailable for this file type. Please use the Download button.');
      return;
    }
    const base = API_BASE.replace(/\/api\/?$/, '');
    // We cannot pass Bearer token via window.open, so we construct a direct link.
    // The /public/view route serves verified docs inline without auth (already backend-supported).
    window.open(`${base}/api/documents/public/${docId}/view`, '_blank', 'noopener');
  };

  // Download document as attachment
  const handleDownload = (docId: string) => {
    const base = API_BASE.replace(/\/api\/?$/, '');
    window.open(`${base}/api/documents/public/${docId}/download`, '_blank', 'noopener');
  };

  return (
    <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none"
          placeholder="Search by title, owner, hash, or organization..."
        />
        <Button onClick={handleSearch} disabled={loading}>{loading ? 'Searching...' : 'Search'}</Button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No documents found. Try a search above.</div>
      ) : (
        <Card>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900">{doc.title}</div>
                    <div className="text-xs text-slate-500 mt-1">Owner: {doc.ownerName} • Issuer: {doc.issuingOrganization} • Type: {doc.documentType}</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-2 break-all">{doc.sha256Hash}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={doc.status === 'verified' ? 'success' : 'warning'}>
                      {doc.status}
                    </Badge>
                    {doc.status === 'verified' && (
                      <>
                        <Button
                          variant="outline"
                          className="h-8 px-3 text-xs gap-1.5"
                          onClick={() => handleView(doc.id, doc.originalFileName)}
                          title="Preview document inline in browser"
                        >
                          <Eye size={13} /> View
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 px-3 text-xs gap-1.5"
                          onClick={() => handleDownload(doc.id)}
                          title="Download document file"
                        >
                          <Download size={13} /> Download
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
}

function ProfileView({ user, token, onUpdate, loading }: { user: User; token: string; onUpdate: (data: any) => void; loading: boolean }) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    organization: user.organization || '',
    password: '',
  });
  const [shareCopied, setShareCopied] = useState(false);
  
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      name: user.name || '',
      email: user.email || '',
      organization: user.organization || '',
    }));
  }, [user]);

  const [showPassword, setShowPassword] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      name: formData.name,
      email: formData.email,
      organization: formData.organization,
      ...(formData.password && { password: formData.password }),
    });
  };

  const shareVerificationMessage = `ChainVerify Identity Reference\n\nName: ${user.name}\nRole: ${user.role}\nOrganization: ${user.organization || 'N/A'}\nEmail: ${user.email}\n\nTo verify any document issued or uploaded by this account, search the document hash on the ChainVerify public verification portal.`;

  const handleShareViaEmail = () => {
    const subject = encodeURIComponent(`ChainVerify Identity — ${user.name}`);
    const body = encodeURIComponent(shareVerificationMessage);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleCopyShareMessage = async () => {
    await navigator.clipboard.writeText(shareVerificationMessage);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl mx-auto space-y-6">
      <Card title="My Profile" subtitle="Manage your account settings">
        <form onSubmit={handleUpdate} className="space-y-6 mt-8">
          <div className="mb-8 flex items-center gap-6">
            <Avatar user={user} size="xl" className="border-4 border-white shadow-lg" />
            <div>
              <div className="font-bold text-slate-900 text-lg">{user.name}</div>
              <div className="text-slate-500 text-sm">{user.role}</div>
              <div className="text-xs text-slate-400 mt-1">{user.email}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">Full Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" required />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">Email Address</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" required />
              <p className="text-xs text-slate-400 mt-1.5">Used as your identity reference for document ownership</p>
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
              <EyeOff size={16} className="absolute right-3 top-3 text-slate-400 cursor-pointer" onClick={() => setShowPassword(!showPassword)} />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Updating...' : 'Update Profile'}
          </Button>
        </form>
      </Card>

      {/* Share Verification Identity */}
      <Card title="Share Verification Identity" subtitle="Let others know how to verify documents linked to your account">
        <div className="space-y-4 mt-4">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">{shareVerificationMessage}</pre>
          </div>
          <p className="text-xs text-slate-500">
            Share this identity reference so recipients can confirm your role and use the public portal to verify any documents you have issued.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleCopyShareMessage}>
              {shareCopied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Message</>}
            </Button>
            <Button variant="outline" onClick={handleShareViaEmail}>
              <Mail size={16} /> Share via Email
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ---- Standalone Audit Log View (fetches independently with pagination) ----
function AuditLogView({ token, userRole }: { token: string; userRole: string }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 25;

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/dashboard/audit?limit=${LIMIT}&page=${p}`, token);
      setLogs(res.logs || []);
      setPage(res.page?.page || 1);
      setTotalPages(res.page?.totalPages || 1);
      setTotal(res.page?.total || 0);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(1); }, [token]);

  const iconFor = (type: string) => {
    if (type === 'success') return <ShieldCheck size={18} className="text-emerald-600" />;
    if (type === 'error') return <AlertCircle size={18} className="text-rose-600" />;
    if (type === 'warning') return <AlertCircle size={18} className="text-amber-600" />;
    return <CheckCircle2 size={18} className="text-brand-600" />;
  };
  const bgFor = (type: string) => {
    if (type === 'success') return 'bg-emerald-50';
    if (type === 'error') return 'bg-rose-50';
    if (type === 'warning') return 'bg-amber-50';
    return 'bg-brand-50';
  };

  return (
    <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <Card
        title={userRole === 'Admin' ? 'System Audit Log' : 'My Activity Log'}
        subtitle={userRole === 'Admin'
          ? `All system activity — ${total} total entries`
          : `Your personal activity history — ${total} entries`
        }
      >
        <div className="flex justify-end mb-4">
          <Button variant="outline" onClick={() => fetchLogs(page)} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {loading && logs.length === 0 && (
          <div className="text-center py-12 text-slate-400">Loading audit entries...</div>
        )}

        {!loading && logs.length === 0 && (
          <div className="text-center py-12 text-slate-500">No audit log entries found.</div>
        )}

        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', bgFor(log.type))}>
                {iconFor(log.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-slate-900 text-sm">{log.action}</div>
                  <div className="text-xs text-slate-400 shrink-0">{formatDate(log.timestamp)}</div>
                </div>
                <div className="text-xs text-slate-500 mt-1">{log.details}</div>
                {log.userName && (
                  <div className="text-[10px] text-slate-400 mt-1 font-medium uppercase tracking-wide">By {log.userName}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1 || loading} onClick={() => fetchLogs(page - 1)} className="h-8 px-3 text-xs">
                Previous
              </Button>
              <Button variant="outline" disabled={page >= totalPages || loading} onClick={() => fetchLogs(page + 1)} className="h-8 px-3 text-xs">
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function AdminView({ metrics, users, token, onRefresh }: { metrics: any; users: User[]; token: string; onRefresh: () => void }) {
  return (
    <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card title="Admin Controls" subtitle="Manage verifier approval and institution users.">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-slate-600">Total users: <span className="font-bold">{users.length}</span></div>
          <Button variant="outline" onClick={onRefresh}>Refresh</Button>
        </div>
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">{u.name}</div>
                <div className="text-xs text-slate-500">{u.email} • {u.role}</div>
              </div>
              <Badge variant={u.role === 'Verifier' && !u.isVerifierApproved ? 'warning' : 'success'}>
                {u.role === 'Verifier' && !u.isVerifierApproved ? 'Pending Approval' : 'Active'}
              </Badge>
            </div>
          ))}
          {users.length === 0 && <div className="text-sm text-slate-500">No users loaded.</div>}
        </div>
      </Card>
      <Card title="System Snapshot">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-xl bg-slate-50">Documents: {metrics?.totalDocuments || 0}</div>
          <div className="p-3 rounded-xl bg-slate-50">Verified: {metrics?.totalVerified || 0}</div>
        </div>
      </Card>
    </motion.div>
  );
}
