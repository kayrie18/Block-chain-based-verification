import React, { useState } from 'react';
import { Search, FileText, CheckCircle2, X } from 'lucide-react';
import { Button, Badge } from './UI';
import { getBaseUrl } from '../lib/api';
import { AnimatePresence, motion } from 'motion/react';

export const PublicSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      const response = await fetch(`${getBaseUrl()}/api/search/public?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || 'Verification search failed');
      }
      const data = await response.json();
      setResult(data.document);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const API_SERVER = getBaseUrl();

  return (
    <div className="mt-12 w-full max-w-xl relative">
      <form onSubmit={handleSearch} className="relative group">
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          <Search className="text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
        </div>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter Document ID or Hash to verify..." 
          className="w-full pl-14 pr-32 py-5 rounded-2xl border-2 border-slate-100 bg-white placeholder-slate-400 shadow-xl shadow-slate-200/50 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-slate-800 font-medium transition-all"
        />
        <div className="absolute inset-y-2 right-2">
          <Button type="submit" disabled={loading} className="h-full px-6 rounded-xl shadow-lg">
            {loading ? 'Scanning...' : 'Verify'}
          </Button>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <span className="text-sm font-bold text-rose-600">{error}</span>
          <button onClick={() => setError('')}><X size={16} className="text-rose-400" /></button>
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-full mt-4 left-0 right-0 bg-white border border-emerald-100 shadow-2xl p-6 rounded-3xl z-50 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500" />
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-xl tracking-tight">Authentic Document</h3>
                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Blockchain Verified</div>
                </div>
              </div>
              <button 
                onClick={() => setResult(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 font-mono text-[10px] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase tracking-widest">Document Title</span>
                <span className="text-slate-700 font-bold ml-4 truncate text-right">{result.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase tracking-widest">Issuer</span>
                <span className="text-slate-700 font-bold ml-4 truncate text-right">{result.issuingOrganization}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase tracking-widest">Blockchain Hash</span>
                <span className="text-brand-600 font-black ml-4 truncate text-right" title={result.sha256Hash}>
                  ...{result.sha256Hash?.slice(-16)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <a 
                href={`${API_SERVER}/api/documents/public/${result.id}/view`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 bg-white border-2 border-brand-100 hover:border-brand-500 text-brand-600 font-bold uppercase tracking-widest text-xs py-4 rounded-xl transition-all"
              >
                <FileText size={16} /> Read
              </a>
              <a 
                href={`${API_SERVER}/api/documents/public/${result.id}/download`}
                download
                className="flex items-center justify-center gap-2 bg-brand-50 hover:bg-brand-100 text-brand-600 font-bold uppercase tracking-widest text-xs py-4 rounded-xl transition-all"
              >
                Download
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
