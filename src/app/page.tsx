import { supabase } from '@/lib/supabase';
import JioShuffleGallery from '@/components/JioShuffleGallery';
import { Mail, Phone, MessageCircle } from 'lucide-react';

// Force dynamic rendering to ensure fresh data from Supabase on every request
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch properties and admin settings in parallel on the server
  const [propsRes, adminRes] = await Promise.all([
    supabase.from('properties').select('*').order('created_at', { ascending: false }),
    supabase.from('admin_settings').select('contact_email, contact_phone, contact_whatsapp').eq('id', 1).single()
  ]);

  const properties = propsRes.data || [];
  
  const contactInfo = {
    email: adminRes.data?.contact_email || '',
    phone: adminRes.data?.contact_phone || '',
    whatsapp: adminRes.data?.contact_whatsapp || ''
  };

  return (
    <main className="h-screen flex flex-col bg-ivory-100 text-charcoal-800 selection:bg-emerald-700/20 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 relative z-50 backdrop-blur-md bg-white/40 border-b border-white/30 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-semibold tracking-widest text-emerald-900 font-serif">
            QUILON GROUP
          </h1>
          
          {/* Contact Links */}
          <div className="flex items-center gap-6">
            {contactInfo.email && (
              <a href={`mailto:${contactInfo.email}`} className="text-charcoal-700 hover:text-emerald-700 hover:scale-110 transition-all" title="Email Us">
                <Mail className="w-5 h-5" />
              </a>
            )}
            {contactInfo.phone && (
              <a href={`tel:${contactInfo.phone}`} className="text-charcoal-700 hover:text-emerald-700 hover:scale-110 transition-all" title="Call Us">
                <Phone className="w-5 h-5" />
              </a>
            )}
            {contactInfo.whatsapp && (
              <a href={`https://wa.me/${contactInfo.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-charcoal-700 hover:text-emerald-700 hover:scale-110 transition-all" title="WhatsApp Us">
                <MessageCircle className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Featured Properties Section */}
      <section className="relative flex-1 flex flex-col justify-center px-4 md:px-6 w-full">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/60 via-ivory-100/50 to-transparent pointer-events-none" />
        
        <div className="container mx-auto relative z-10 w-full flex flex-col items-center h-full">
          <div className="text-center mb-4 md:mb-8 mt-8 hidden sm:block">
            <h2 className="text-xl md:text-2xl font-serif text-charcoal-800 drop-shadow-sm">
              Where Architecture Meets Ambition and <span className="font-semibold text-emerald-800">Technology Meets Hospitality.</span>
            </h2>
          </div>

          <div className="w-full h-full flex flex-col items-center justify-center">
            {properties.length === 0 ? (
              <p className="text-slate-400">No properties found.</p>
            ) : (
              <JioShuffleGallery initialItems={properties} mode="folders" />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
