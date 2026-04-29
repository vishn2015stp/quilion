'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import JioShuffleGallery from '@/components/JioShuffleGallery';

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string;
  property_type: 'residency' | 'lake-inn';
};

export default function Home() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGallery() {
      const { data, error } = await supabase
        .from('gallery_metadata')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) setItems(data);
      setLoading(false);
    }
    fetchGallery();
  }, []);

  return (
    <main className="h-screen flex flex-col bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500/30 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 relative z-50 backdrop-blur-md bg-slate-900/60 border-b border-slate-700/50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-light tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-emerald-400">
            QUILION GROUP
          </h1>
        </div>
      </header>

      {/* Featured Properties Section */}
      <section className="relative flex-1 flex flex-col justify-center px-4 md:px-6 w-full">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-amber-900/10 via-transparent to-emerald-900/10 pointer-events-none" />
        
        <div className="container mx-auto relative z-10 w-full flex flex-col items-center">
          <div className="text-center mb-4 md:mb-8 hidden sm:block">
            <h2 className="text-3xl md:text-5xl font-extralight mb-2 text-white drop-shadow-sm">
              Discover <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-200">Excellence</span>
            </h2>
          </div>

          {loading ? (
            <div className="w-full flex items-center justify-center flex-1">
              <p className="text-slate-400 animate-pulse">Loading gallery...</p>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <JioShuffleGallery initialItems={items} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
