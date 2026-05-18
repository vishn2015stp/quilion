import { supabase } from '@/lib/supabase';
import JioShuffleGallery from '@/components/JioShuffleGallery';
import EnquiryButton from '@/components/EnquiryButton';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MessageCircle } from 'lucide-react';

// Force dynamic rendering to ensure fresh data from Supabase
export const dynamic = 'force-dynamic';

export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Fetch property and gallery items in parallel
  const [propRes, galleryRes] = await Promise.all([
    supabase.from('properties').select('name, contact_email, contact_phone, contact_whatsapp').eq('slug', slug).single(),
    supabase.from('gallery_metadata').select('*').eq('property_type', slug).order('created_at', { ascending: false })
  ]);

  const propertyName = propRes.data ? propRes.data.name : 'Property Gallery';
  const items = galleryRes.data || [];

  return (
    <main className="h-screen flex flex-col bg-ivory-100 text-charcoal-800 selection:bg-emerald-700/20 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 relative z-50 backdrop-blur-md bg-white/40 border-b border-white/30 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link 
              href="/"
              className="p-2 rounded-full bg-charcoal-800/10 hover:bg-emerald-700 hover:text-white text-charcoal-800 transition-colors shadow-sm"
              title="Back to Properties"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl md:text-2xl font-semibold tracking-widest text-emerald-900 font-serif">
              {propertyName}
            </h1>
          </div>
          
          {/* Property Contact Info */}
          <div className="flex items-center gap-3">
            {propRes.data?.contact_email && (
              <a href={`mailto:${propRes.data.contact_email}`} className="p-2 rounded-full bg-white/60 border border-ivory-300 hover:border-emerald-500 text-emerald-900 hover:text-emerald-700 shadow-sm transition-all hover:-translate-y-1" title="Email">
                <Mail className="w-4 h-4" />
              </a>
            )}
            {propRes.data?.contact_phone && (
              <a href={`tel:${propRes.data.contact_phone}`} className="p-2 rounded-full bg-white/60 border border-ivory-300 hover:border-emerald-500 text-emerald-900 hover:text-emerald-700 shadow-sm transition-all hover:-translate-y-1" title="Call">
                <Phone className="w-4 h-4" />
              </a>
            )}
            {propRes.data?.contact_whatsapp && (
              <a href={`https://wa.me/${propRes.data.contact_whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/60 border border-ivory-300 hover:border-emerald-500 text-emerald-900 hover:text-emerald-700 shadow-sm transition-all hover:-translate-y-1" title="WhatsApp">
                <MessageCircle className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Gallery Section */}
      <section className="relative flex-1 flex flex-col justify-center px-4 md:px-6 w-full">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/60 via-ivory-100/50 to-transparent pointer-events-none" />
        
        <div className="container mx-auto relative z-10 w-full flex flex-col items-center h-full pt-8 pb-4">
          <div className="w-full h-full flex items-center justify-center">
            {items.length === 0 ? (
              <div className="text-charcoal-700 font-serif">
                No photos found
              </div>
            ) : (
              <JioShuffleGallery initialItems={items} mode="photos" />
            )}
          </div>
        </div>
      </section>
      <EnquiryButton />
    </main>
  );
}
