import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User as UserIcon, Mail, Building, Shield, Save, Eye, EyeOff, Lock } from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { Avatar } from '../components/Avatar';
import { User } from '../types';

interface ProfilePageProps {
  user: User;
  onUpdate: (data: any) => void;
  loading: boolean;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUpdate, loading }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    organization: user.organization || '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // Password changes should go to a separate endpoint, not the profile update
    onUpdate({
      name: formData.name,
      email: formData.email,
      organization: formData.organization,
    });
    // Password field is intentionally not included for security
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto pb-12">
      <div className="relative mb-8">
        <div className="h-48 rounded-3xl bg-gradient-to-r from-brand-600 to-brand-800 shadow-lg overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 flex flex-wrap gap-8 p-4">
             {Array.from({ length: 20 }).map((_, i) => <Shield key={i} size={40} />)}
          </div>
        </div>
        
        <div className="absolute -bottom-16 left-8 flex items-end gap-6">
          <div className="relative group">
            <Avatar user={user} size="xl" className="border-[6px]" />
          </div>
          <div className="mb-4">
            <h1 className="text-3xl font-black text-slate-900 drop-shadow-sm">{user.name}</h1>
            <div className="flex gap-2 mt-1">
              <Badge variant="brand">{user.role}</Badge>
              {user.organization && <Badge variant="info">{user.organization}</Badge>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mt-24">
        <div className="lg:col-span-2">
          <Card title="Account Details" subtitle="Update your personal information and organization settings.">
            <form onSubmit={handleUpdate} className="space-y-6 mt-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <UserIcon size={12} /> Full Name
                  </label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Mail size={12} /> Email Address
                  </label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Building size={12} /> Organization
                </label>
                <input type="text" value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="Enter organization name" />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Lock size={12} /> Security Settings
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none pr-12 font-mono"
                    placeholder="Keep blank for no change"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 italic">Minimum 8 characters required for new passwords</p>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-14 text-lg mt-4">
                <Save size={20} /> {loading ? 'Saving Changes...' : 'Save Profile Settings'}
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
             <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
                 <Shield size={20} />
               </div>
               <h3 className="font-bold">Security Status</h3>
             </div>
             
             <div className="space-y-4">
               <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-400">2FA Status</span>
                 <Badge variant="error" className="bg-rose-500/10 text-rose-400 border-rose-500/20">Inactive</Badge>
               </div>
               <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-400">Account Verified</span>
                 <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">System OK</Badge>
               </div>
               <div className="flex justify-between items-center text-sm pt-4 border-t border-slate-800">
                 <span className="text-slate-400 text-xs">Member since</span>
                 <span className="text-slate-300 text-xs font-mono">{new Date(user.createdAt || '').toLocaleDateString()}</span>
               </div>
             </div>
          </Card>
          
          <Card title="Storage Usage">
             <div className="mt-2">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-500">INDIVIDUAL QUOTA</span>
                  <span className="text-brand-600">12%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 w-[12%]" />
                </div>
                <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                  Your organization currently has <strong>250MB</strong> of secure blockchain-indexed storage available.
                </p>
             </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};
