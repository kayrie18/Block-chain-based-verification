import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { History, ShieldCheck, AlertCircle, Search, Filter, Download, ArrowUpRight } from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { api } from '../lib/api';
import { formatDate } from '../utils/helpers';
import { ActivityLog } from '../types';

interface HistoryPageProps {
  token: string;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ token }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/audit', token);
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(search.toLowerCase()) || 
                          log.details.toLowerCase().includes(search.toLowerCase()) ||
                          log.userName?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || log.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">System Audit Log</h2>
          <p className="text-slate-500">Comprehensive cryptographic history of all platform events</p>
        </div>
        <Button variant="outline" onClick={() => window.alert('Exporting to PDF...')}>
          <Download size={18} />
          Export Ledger
        </Button>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by action, user, or details..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select 
              className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none bg-white text-sm font-medium"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Events</option>
              <option value="success">Success Only</option>
              <option value="warning">Warnings</option>
              <option value="error">Errors</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <History size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No logs found</h3>
            <p className="text-slate-500">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((log) => (
              <div key={log.id} className="p-4 rounded-2xl border border-slate-50 hover:bg-slate-50/50 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      log.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
                      log.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                      log.type === 'error' ? 'bg-rose-100 text-rose-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {log.type === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{log.action}</span>
                        <Badge variant={log.type as any} className="text-[8px] px-1.5">{log.type}</Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{log.details}</div>
                    </div>
                  </div>
                  
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDate(log.timestamp)}</div>
                    <div className="text-[10px] font-bold text-slate-400 group-hover:text-brand-600 transition-colors flex items-center gap-1">
                      USER: {log.userName || 'SYSTEM'} <ArrowUpRight size={10} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      
      <p className="text-center text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black py-8">
        Blockchain-Encrypted Immutable Audit Ledger
      </p>
    </motion.div>
  );
};
