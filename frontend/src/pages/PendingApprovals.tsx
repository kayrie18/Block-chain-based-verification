import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, XCircle, Clock, FileText, AlertCircle } from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { api } from '../lib/api';
import { formatDate } from '../utils/helpers';
import { DocumentRecord } from '../types';

interface PendingApprovalsProps {
  token: string;
  user: any;
}

export const PendingApprovals: React.FC<PendingApprovalsProps> = ({ token, user }) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get('/management/pending', token);
      setDocuments(res.items || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch pending documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    setError('');
    try {
      await api.post(`/management/approve/${id}`, {}, token);
      setSuccess('Document approved and registered on blockchain');
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Enter rejection reason:');
    if (reason === null) return;

    setActionLoading(id);
    setError('');
    try {
      await api.post(`/management/reject/${id}`, { reason }, token);
      setSuccess('Document rejected');
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Rejection failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-brand-600" />
            Verification Queue
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {user.role === 'Admin' 
              ? 'Institutional compliance monitoring: All pending documents system-wide.' 
              : `Authorized Verifier for ${user.organization}: Manage pending institutional assets.`}
          </p>
        </div>
        <Badge variant="warning" className="h-8 px-4 font-black">{documents.length} Pending</Badge>
      </div>

      {user.role === 'Verifier' && (
        <Card className="bg-brand-50/50 border-brand-100 py-4 px-6">
          <div className="flex items-center gap-3 text-brand-700 text-xs font-bold">
            <AlertCircle size={16} />
            <span>INSTITUTIONAL GATING ACTIVE: You are restricted to managing documents issued by {user.organization}.</span>
          </div>
        </Card>
      )}

      {error && <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3 text-sm font-bold animate-head-shake"><XCircle size={20} />{error}</div>}
      {success && <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-3 text-sm font-bold"><ShieldCheck size={20} />{success}</div>}

      {documents.length === 0 ? (
        <Card className="text-center py-20 border-dashed border-2">
          <Clock size={48} className="mx-auto text-slate-200 mb-4" />
          <h3 className="text-lg font-black text-slate-900 uppercase">Queue Empty</h3>
          <p className="text-slate-500 text-sm">No documents are currently awaiting institutional verification.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:border-brand-300 hover:shadow-lg transition-all border-slate-100">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 p-1">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                    <FileText className="text-amber-600" size={28} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">{doc.title}</h4>
                    <div className="text-xs font-bold text-slate-500 mt-2 flex flex-wrap gap-x-6 gap-y-1 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand-500"/> {doc.issuingOrganization}</span>
                      <span className="flex items-center gap-1.5">Owner: <strong className="text-slate-700">{doc.ownerName}</strong></span>
                      <span className="flex items-center gap-1.5">Type: <strong className="text-slate-700">{doc.documentType}</strong></span>
                    </div>
                    <div className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <span className="px-2 py-0.5 bg-slate-100 rounded">UPLOADED BY {(doc as any).uploadedBy?.name || 'In-System User'}</span>
                       <span>•</span>
                       <span>{formatDate(doc.uploadDate || '')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0 self-end xl:self-center">
                  <Button 
                    variant="outline" 
                    className="h-12 px-6 text-rose-600 border-rose-100 hover:bg-rose-50 text-xs font-black uppercase tracking-widest"
                    onClick={() => handleReject(doc.id)}
                    disabled={!!actionLoading}
                  >
                    <XCircle size={18} />
                    Reject
                  </Button>
                  <Button 
                    variant="brand" 
                    className="h-12 px-8 shadow-lg shadow-brand-500/20 text-xs font-black uppercase tracking-widest"
                    onClick={() => handleApprove(doc.id)}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === doc.id ? 'Processing...' : (
                      <>
                        <ShieldCheck size={18} />
                        Register on Chain
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
};
