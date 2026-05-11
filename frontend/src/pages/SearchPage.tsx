import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search as SearchIcon, 
  ShieldCheck, 
  FileText, 
  ChevronRight, 
  Hash, 
  Download, 
  QrCode, 
  Share2, 
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  Clock
} from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { VerificationDetailsModal } from '../components/VerificationDetailsModal';
import { api, getBaseUrl } from '../lib/api';
import { formatDate } from '../utils/helpers';
import { cn } from '../lib/utils';
import { DocumentRecord } from '../types';

interface SearchPageProps {
  token: string;
}

export const SearchPage: React.FC<SearchPageProps> = ({ token }) => {
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultsTitle, setResultsTitle] = useState('Recently Registered');
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, any>>({});
  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(new Set());
  const [selectedVerificationId, setSelectedVerificationId] = useState<string | null>(null);

  const handleSearch = async (q?: string) => {
    const searchTerm = q !== undefined ? q : query;
    setLoading(true);
    setVerificationStatuses({}); // Reset verification statuses on new search
    try {
      const endpoint = searchTerm.trim() 
        ? `/search/documents?q=${encodeURIComponent(searchTerm)}&limit=20`
        : `/search/documents?limit=10`;
      
      const res = await api.get(endpoint, token);
      const docs = res.items || [];
      setDocuments(docs);
      setResultsTitle(searchTerm.trim() ? `Search Results for "${searchTerm}"` : 'Recently Registered');
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const performManualVerification = async (docId: string) => {
    if (verifyingIds.has(docId)) return; // Prevent duplicate requests
    
    const newVerifyingIds = new Set(verifyingIds);
    newVerifyingIds.add(docId);
    setVerifyingIds(newVerifyingIds);
    
    try {
      const res = await api.get(`/verification/hash/${docId}`, token);
      setVerificationStatuses(prev => ({ ...prev, [docId]: res }));
      // Auto-open modal on successful verification
      setSelectedVerificationId(docId);
    } catch (err: any) {
      console.error(`Verification failed for ${docId}:`, err);
      setVerificationStatuses(prev => ({ ...prev, [docId]: { error: err.message } }));
    } finally {
      const newIds = new Set(verifyingIds);
      newIds.delete(docId);
      setVerifyingIds(newIds);
    }
  };

  const handleShare = (docId: string) => {
    const shareUrl = `${window.location.origin}/?tab=search&id=${docId}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Secure deep link copied to clipboard!');
  };

  const handleRead = (docId: string) => {
    window.open(`${getBaseUrl()}/api/documents/${docId}/view?token=${token}`, '_blank');
  };

  const handleDownload = (docId: string) => {
    window.open(`${getBaseUrl()}/api/documents/${docId}/download?token=${token}`, '_blank');
  };

  useEffect(() => {
    handleSearch();
    
    // Deep Link: Verify if ID is in URL (manual verification only)
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    if (idParam) {
      performManualVerification(idParam);
    }
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified': return <Badge variant="success" className="gap-1"><CheckCircle2 size={12}/> Verified</Badge>;
      case 'pending': return <Badge variant="warning">Pending</Badge>;
      case 'rejected': return <Badge variant="error">Rejected</Badge>;
      default: return <Badge variant="info">{status}</Badge>;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 relative">
      

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-lg shadow-sm"
            placeholder="Search documents by ID, title, owner, or hash..."
          />
        </div>
        <Button onClick={() => handleSearch()} disabled={loading} className="px-10 h-[60px] text-lg shadow-xl shadow-brand-500/20">
          {loading ? 'Analyzing...' : 'Execute Search'}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{resultsTitle}</h3>
           <span className="text-xs font-bold text-slate-400">{documents.length} secure records loaded</span>
        </div>

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white border border-slate-100 animate-pulse rounded-2xl" />)}
          </div>
        ) : documents.length === 0 ? (
          <Card className="text-center py-20 bg-slate-50/50 border-dashed border-2">
            <SearchIcon size={56} className="mx-auto text-slate-200 mb-6" />
            <h3 className="text-xl font-black text-slate-900 mb-2">Registry is Silent</h3>
            <p className="text-slate-500">No documents match your query in the blockchain records.</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:shadow-xl transition-all group border-slate-100 hover:border-brand-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-2">
                  <div className="flex items-start gap-5 flex-1 min-w-0">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-brand-600 group-hover:text-white transition-all duration-300">
                      <FileText size={28} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h4 className="font-black text-slate-900 text-lg truncate">{doc.title}</h4>
                        {getStatusBadge(doc.status || 'pending')}
                        {verificationStatuses[doc.id] && !verificationStatuses[doc.id].error && (
                          <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                            verificationStatuses[doc.id].isAuthentic ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          )}>
                             {verificationStatuses[doc.id].isAuthentic ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                             {verificationStatuses[doc.id].isAuthentic ? "Verified Authentic" : "Verification Failed"}
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-500 flex flex-wrap gap-x-6 gap-y-2 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand-500"/> {doc.issuingOrganization}</span>
                        <span className="flex items-center gap-1.5"><ChevronRight size={14}/> {doc.ownerName}</span>
                        <span className="flex items-center gap-1.5"><Clock size={14}/> {formatDate(doc.createdAt)}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                          <Hash size={12} className="text-brand-500" /> {doc.sha256Hash}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0 self-end lg:self-center flex-wrap">
                    {doc.status === "verified" && !verificationStatuses[doc.id] && (
                      <Button 
                        onClick={() => performManualVerification(doc.id)}
                        disabled={verifyingIds.has(doc.id)}
                        variant="brand" 
                        className="h-12 px-6 text-xs gap-2 shadow-lg shadow-brand-500/20"
                      >
                        <ShieldCheck size={16} /> {verifyingIds.has(doc.id) ? 'Verifying...' : 'Verify'}
                      </Button>
                    )}
                    {verificationStatuses[doc.id] && !verificationStatuses[doc.id].error && (
                      <>
                        <Button 
                          onClick={() => handleRead(doc.id)} 
                          variant="brand" 
                          className="h-12 px-6 text-xs gap-2 shadow-lg shadow-brand-500/20"
                        >
                          <Eye size={16} /> Read
                        </Button>
                        <Button 
                          onClick={() => handleDownload(doc.id)} 
                          variant="brand" 
                          className="h-12 px-6 text-xs gap-2 shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Download size={16} /> Download
                        </Button>
                      </>
                    )}
                    <Button onClick={() => handleShare(doc.id)} variant="outline" className="h-12 w-12 p-0 hover:bg-slate-50">
                      <Share2 size={18} />
                    </Button>
                    {verificationStatuses[doc.id] && !verificationStatuses[doc.id].error && (
                      <Button 
                        onClick={() => setSelectedVerificationId(doc.id)}
                        variant="ghost" 
                        className="h-12 px-6 text-xs font-black uppercase tracking-widest text-brand-600 hover:text-brand-700 gap-2"
                      >
                        Details <ExternalLink size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <VerificationDetailsModal
        isOpen={selectedVerificationId !== null}
        onClose={() => setSelectedVerificationId(null)}
        verification={selectedVerificationId ? verificationStatuses[selectedVerificationId] : null}
        onDownload={() => {
          if (selectedVerificationId) {
            handleDownload(selectedVerificationId);
          }
        }}
        onRead={() => {
          if (selectedVerificationId) {
            handleRead(selectedVerificationId);
          }
        }}
      />
    </motion.div>
  );
};
