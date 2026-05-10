'use client';

import { useState, useEffect } from 'react';
import { UploadCloud, Loader2, CheckCircle2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabase';
import { PropertyItem } from './JioShuffleGallery';

interface UploaderProps {
  propertySlug?: string;
  onSuccess?: () => void;
}

export default function Uploader({ propertySlug, onSuccess }: UploaderProps = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [propertyType, setPropertyType] = useState<string>(propertySlug || '');

  useEffect(() => {
    if (propertySlug) {
      setPropertyType(propertySlug);
    }
  }, [propertySlug]);

  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    async function loadProperties() {
      const { data } = await supabase.from('properties').select('*').order('name');
      if (data && data.length > 0) {
        setProperties(data);
        if (!propertyType && !propertySlug) {
          setPropertyType(data[0].slug);
        }
      }
    }
    loadProperties();
  }, [propertyType, propertySlug]);

  const handleUpload = async () => {
    if (!file || !propertyType) return;
    setUploading(true);
    setStatus('idle');

    try {
      let uploadFile = file;
      const isVideo = file.type.startsWith('video/');

      if (!isVideo) {
        // 1. Compress Image (Target: < 1MB)
        const options = {
          maxSizeMB: 0.9,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        uploadFile = await imageCompression(file, options);
      }

      // 2. Upload to Supabase Storage
      const fileName = `${propertyType}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
      
      let publicUrl = '';
      
      // Try to upload to the single 'gallery' bucket
      const { data: storageData, error: storageError } = await supabase.storage
        .from('gallery')
        .upload(fileName, uploadFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) {
        console.warn("Upload to 'gallery' bucket failed, attempting legacy bucket upload.", storageError);
        // Fallback to old property-named bucket
        const legacyFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
        const { error: legacyError } = await supabase.storage
          .from(propertyType)
          .upload(legacyFileName, uploadFile, { cacheControl: '3600', upsert: false });
          
        if (legacyError) throw legacyError;
        
        const { data: { publicUrl: legacyUrl } } = supabase.storage.from(propertyType).getPublicUrl(legacyFileName);
        publicUrl = legacyUrl;
      } else {
        const { data: { publicUrl: newUrl } } = supabase.storage.from('gallery').getPublicUrl(fileName);
        publicUrl = newUrl;
      }

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
      
      if (onSuccess) onSuccess();

      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Upload Error:', error);
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-3xl backdrop-blur-xl bg-white border border-amber-100 shadow-xl shadow-amber-900/5">
      <h3 className="text-2xl font-serif text-slate-800 mb-6 flex items-center gap-2">
        <UploadCloud className="w-6 h-6 text-amber-500" />
        Upload Media
      </h3>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">Property</label>
          <select 
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 appearance-none"
          >
            {properties.map(prop => (
              <option key={prop.id} value={prop.slug}>{prop.name}</option>
            ))}
            {properties.length === 0 && <option value="">Loading properties...</option>}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">Media</label>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 transition-all cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">Caption</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="e.g., Lake view from the balcony..."
            className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 placeholder:text-slate-400"
          />
        </div>

        {status === 'error' && (
          <p className="text-red-500 text-sm">Error uploading. Please try again.</p>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading || !propertyType}
          className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-white font-medium hover:from-amber-400 hover:to-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20 flex justify-center items-center gap-2"
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
