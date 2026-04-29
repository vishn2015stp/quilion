'use client';

import { useState } from 'react';
import { UploadCloud, Loader2, CheckCircle2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabase';

export default function Uploader() {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [propertyType, setPropertyType] = useState<'residency' | 'lake-inn'>('residency');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus('idle');

    try {
      // 1. Compress Image (Target: < 1MB)
      const options = {
        maxSizeMB: 0.9,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);

      // 2. Upload to Supabase Storage
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from(propertyType)
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) throw storageError;

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from(propertyType)
        .getPublicUrl(fileName);

      // 4. Insert into Metadata Database
      const { error: dbError } = await supabase
        .from('gallery_metadata')
        .insert({
          image_url: publicUrl,
          caption,
          property_type: propertyType,
          bucket_path: fileName,
        });

      if (dbError) throw dbError;

      setStatus('success');
      setFile(null);
      setCaption('');
    } catch (error) {
      console.error('Upload Error:', error);
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-3xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl shadow-black/50">
      <h3 className="text-2xl font-light text-white mb-6 flex items-center gap-2">
        <UploadCloud className="w-6 h-6 text-emerald-400" />
        Upload Image
      </h3>

      <div className="space-y-5">
        <div>
          <label className="block text-sm text-slate-300 mb-2">Property</label>
          <select 
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value as any)}
            className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
          >
            <option value="residency">Quilion Residency</option>
            <option value="lake-inn">Quilion Lake Inn</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-2">Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-400 file:mr-4 file:py-3 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 transition-all cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-2">Caption</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="e.g., Lake view from the balcony..."
            className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-500"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium hover:from-emerald-500 hover:to-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-900/50 flex justify-center items-center gap-2"
        >
          {uploading ? (
             <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</>
          ) : status === 'success' ? (
             <><CheckCircle2 className="w-5 h-5" /> Uploaded</>
          ) : (
             'Upload to Gallery'
          )}
        </button>
      </div>
    </div>
  );
}
