import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, UserPlus, Shield, Mail, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { Avatar } from '../components/Avatar';
import { api, getBaseUrl } from '../lib/api';
import { User } from '../types';

interface UserManagementProps {
  token: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({ token }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', token);
      setUsers(res.users || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Admin': return <Badge variant="error"><Shield size={10} className="inline mr-1" />Admin</Badge>;
      case 'Verifier': return <Badge variant="success">Verifier</Badge>;
      case 'Issuer': return <Badge variant="info">Issuer</Badge>;
      default: return <Badge variant="warning">User</Badge>;
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to completely delete ${name}? This action cannot be undone.`)) return;
    try {
      await api.delete(`/users/${id}`, token);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleEdit = async (user: User) => {
    const newRole = window.prompt(`Change role for ${user.name} (Admin | Verifier | Issuer | User)?`, user.role);
    if (!newRole) return;
    
    let isVerifierApproved = user.isVerifierApproved;
    if (newRole === 'Verifier') {
      isVerifierApproved = window.confirm(`Should ${user.name} be immediately approved as a Verifier?`);
    }

    try {
      const res = await api.patch(`/users/${user.id}/role`, { role: newRole, isVerifierApproved }, token);
      setUsers(prev => prev.map(u => u.id === user.id ? res.user : u));
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-slate-500">Manage platform access and assign roles</p>
        </div>
        <Button onClick={() => window.alert('Add user functionality coming soon')}>
          <UserPlus size={18} />
          Add User
        </Button>
      </div>

      {error && <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3"><AlertCircle size={20} />{error}</div>}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar user={user} size="md" />
                    <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-lg shadow-sm">
                      {user.role === 'Admin' ? <Shield size={12} className="text-rose-600" /> : <Users size={12} className="text-slate-400" />}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{user.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Mail size={10} /> {user.email}
                    </div>
                    {user.role === 'Verifier' && (
                      <div className={`text-[10px] uppercase font-black tracking-widest mt-1 flex items-center gap-2 ${user.isVerifierApproved ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {user.isVerifierApproved ? '✓ APPROVED' : (
                          <>
                            ⚠ PENDING ADMIN APPROVAL
                            <button 
                              onClick={async () => {
                                try {
                                  const res = await api.patch(`/users/${user.id}/role`, { isVerifierApproved: true }, token);
                                  setUsers(prev => prev.map(u => u.id === user.id ? res.user : u));
                                } catch (err: any) {
                                  alert(err.message || 'Failed to approve');
                                }
                              }} 
                              className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-2 py-0.5 rounded transition-colors cursor-pointer"
                            >
                              APPROVE NOW
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  {getRoleBadge(user.role)}
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" onClick={() => handleEdit(user)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" onClick={() => handleDelete(user.id, user.name)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <Card title="Role Permissions" subtitle="Quick reference for RBAC">
          <ul className="space-y-3 mt-4">
            <li className="flex items-center gap-3 text-sm text-slate-600">
               <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
               <strong>Admin:</strong> Full system access, users, audit logs.
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-600">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
               <strong>Verifier:</strong> Can approve/reject pending documents.
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-600">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
               <strong>Issuer:</strong> Can upload documents for approval.
            </li>
          </ul>
        </Card>
        
        <Card title="System Settings" subtitle="Global platform configuration">
           <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl mt-4">
             <span className="text-sm font-medium text-slate-700">Auto-Approval Mode</span>
             <Badge variant="error">Disabled</Badge>
           </div>
           <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl mt-2">
             <span className="text-sm font-medium text-slate-700">Duplicate Prevention</span>
             <Badge variant="success">Enabled</Badge>
           </div>
        </Card>
      </div>
    </motion.div>
  );
};
