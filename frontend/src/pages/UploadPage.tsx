import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { FileUp, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';

interface UploadPageProps {
  token: string;
  onSuccess: () => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ token, onSuccess }) => {
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Upload New Document</h2>
          <p className="text-slate-500">Upload a document to generate a blockchain record</p>
        </div>
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1.5">Document Title</label>
              <input 
                type="text" 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" 
                placeholder="e.g. Degree Certificate" 
                required 
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1.5">Document Owner</label>
              <input 
                type="text" 
                value={formData.ownerName} 
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" 
                placeholder="Full Name" 
                required 
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1.5">Issuing Organization</label>
              <input 
                type="text" 
                value={formData.issuingOrganization} 
                onChange={(e) => setFormData({ ...formData, issuingOrganization: e.target.value })} 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" 
                placeholder="Organization Name" 
                required 
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1.5">Document Type</label>
              <select 
                value={formData.documentType} 
                onChange={(e) => setFormData({ ...formData, documentType: e.target.value })} 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none bg-white"
              >
                <option>Degree</option>
                <option>Contract</option>
                <option>Certificate</option>
                <option>License</option>
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
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button 
              className="w-full h-12 bg-brand-600 text-white hover:bg-brand-700 rounded-xl font-medium transition-all flex items-center justify-center disabled:opacity-50"
              disabled={loading || !file}
            >
              {loading ? 'Uploading...' : 'Register on Blockchain'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
