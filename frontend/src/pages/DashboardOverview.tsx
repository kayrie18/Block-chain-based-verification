import React from 'react';
import { motion } from 'motion/react';
import { FileText, ShieldCheck, Users, AlertCircle, CheckCircle2, QrCode } from 'lucide-react';
import { Card, Badge } from '../components/UI';
import { formatDate } from '../utils/helpers';
import { ActivityLog, SystemStats } from '../types';

interface DashboardOverviewProps {
  metrics: SystemStats | null;
  auditLogs: ActivityLog[];
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ metrics, auditLogs }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Documents', value: metrics?.totalDocuments || 0, icon: FileText, color: 'brand' },
          { label: 'Blockchain Verified', value: metrics?.totalVerified || 0, icon: ShieldCheck, color: 'emerald' },
          { label: 'Active Issuers', value: metrics?.totalIssuers || 0, icon: Users, color: 'amber' },
          { label: 'System Integrity', value: `${metrics?.systemHealth || 0}%`, icon: AlertCircle, color: 'rose' },
        ].map((stat, i) => (
          <Card key={i} className="p-6 relative overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                <stat.icon size={24} />
              </div>
              <div className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Live Monitor</div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </div>
            <div className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">{stat.label}</div>
            
            {/* Subtle background decoration */}
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon size={100} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <Card title="Live Audit Log" subtitle="Real-time document lifecycle events" className="lg:col-span-2">
          <div className="mt-4 space-y-3">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-medium">No activity recorded yet</div>
            ) : (
              auditLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="p-4 rounded-2xl border border-slate-50 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    log.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
                    log.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {log.type === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-bold text-slate-900 truncate">{log.action}</div>
                      <div className="text-[10px] text-slate-400 font-mono bg-white px-2 py-0.5 rounded border border-slate-100 shadow-sm">
                        {log.userName || 'System'}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 mt-1 line-clamp-1">{log.details}</div>
                    <div className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">{formatDate(log.timestamp)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* System Overview Details */}
        <div className="space-y-8">
          <Card title="Operational Guidance">
            <div className="grid gap-4">
              <div className="p-5 rounded-2xl border border-brand-100 bg-brand-50/20 group hover:bg-brand-50 transition-all border-l-4 border-l-brand-600">
                <div className="flex items-start gap-4">
                   <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/30">
                     <CheckCircle2 size={20} />
                   </div>
                   <div>
                     <div className="text-sm font-black text-brand-900 uppercase tracking-tight">Institutional Workflow</div>
                     <p className="text-[10px] text-brand-700/70 font-bold mt-1 leading-relaxed">
                       Documents uploaded by Issuers are held in the 'Pending' queue. Authorized Verifiers must review for authenticity before triggering an immutable blockchain registration event.
                     </p>
                   </div>
                </div>
              </div>
              
              <div className="p-5 rounded-2xl border border-slate-100 group hover:bg-slate-50 transition-all border-l-4 border-l-slate-400">
                <div className="flex items-start gap-4">
                   <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                     <QrCode size={20} />
                   </div>
                   <div>
                     <div className="text-sm font-black text-slate-700 uppercase tracking-tight">Access & Connectivity</div>
                     <p className="text-[10px] text-slate-500 font-bold mt-1 leading-relaxed">
                       Once verified, use the 'Ledger' to generate secure QR codes. These can be shared for rapid, zero-trust authenticity checks via secure deep links.
                     </p>
                   </div>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Trust Distribution" subtitle="Verification by category">
             <div className="mt-4 space-y-4">
               {[
                 { label: 'Degrees', percent: 65, color: 'bg-brand-500' },
                 { label: 'Contracts', percent: 20, color: 'bg-emerald-500' },
                 { label: 'Certificates', percent: 15, color: 'bg-amber-500' },
               ].map((item, i) => (
                 <div key={i}>
                   <div className="flex justify-between text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-500">
                     <span>{item.label}</span>
                     <span>{item.percent}%</span>
                   </div>
                   <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                     <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                   </div>
                 </div>
               ))}
             </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};
