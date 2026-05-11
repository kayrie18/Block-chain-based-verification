import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { FileUp, ShieldCheck, Copy, Check } from 'lucide-react';
import { api } from '../lib/api';

interface UploadPageProps {
  token: string;
  onSuccess: () => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ token, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedHash, setUploadedHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    ownerName: '',
    issuingOrganization: '',
    documentType: 'Degree',
  });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(uploadedHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setUploadSuccess(false);
    setUploadedHash('');
    setFile(null);
    setFormData({ title: '', ownerName: '', issuingOrganization: '', documentType: 'Degree' });
    onSuccess();
  };

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

      const res = await api.uploadForm('/documents/upload', data, token);
      setUploadedHash(res.document.sha256Hash);
      setUploadSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  if (uploadSuccess) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Upload Successful!</h2>
            <p className="text-slate-500">Your document has been registered on the blockchain.</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8">
            <div className="text-center mb-4">
              <h3 className="text-sm font-bold text-slate-700 mb-2">DOCUMENT HASH (SHA-256)</h3>
              <p className="text-xs text-slate-500 mb-4">Copy and share this hash for verification</p>
            </div>
            <div className="flex items-stretch gap-3">
              <input 
                type="text" 
                value={uploadedHash}
                readOnly
                className="flex-1 px-4 py-3 font-mono text-sm bg-white border border-emerald-200 rounded-xl focus:outline-none text-slate-700"
              />
              <button
                onClick={handleCopyHash}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-all flex items-center gap-2 whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check size={18} /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={18} /> Copy Hash
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3 text-center">
              Share this hash with verifiers or keep it safe for future reference
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 text-sm text-blue-700">
            <strong>Next Steps:</strong> Go to the Search page and use this hash to verify the document authenticity anytime.
          </div>

          <button
            onClick={handleReset}
            className="w-full h-12 bg-brand-600 text-white hover:bg-brand-700 rounded-xl font-medium transition-all"
          >
            Upload Another Document
          </button>
        </div>
      </motion.div>
    );
  }

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
              <div className="text-xs text-slate-500 mt-1">PDF, PNG, JPG, DOC, DOCX, PPT, PPTX up to 10MB</div>
              {file && <div className="text-xs text-emerald-600 mt-3 font-bold">✓ {file.name}</div>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button 
              className="w-full h-12 bg-brand-600 text-white hover:bg-brand-700 rounded-xl font-medium transition-all flex items-center justify-center disabled:opacity-50"
              disabled={loading || !file}
              type="submit"
            >
              {loading ? 'Uploading...' : 'Register on Blockchain'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
