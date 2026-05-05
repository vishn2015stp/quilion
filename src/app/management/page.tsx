'use client';

import { useState, useEffect } from 'react';
import Uploader from '@/components/Uploader';
import { supabase } from '@/lib/supabase';
import { Lock, Plus, LogOut, Image as ImageIcon, Trash2, Edit2, Check, X, ArrowLeft, Settings } from 'lucide-react';
import Image from 'next/image';

type Property = {
  id: string;
  name: string;
  slug: string;
  cover_image_url?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_whatsapp?: string;
};

type Photo = {
  id: string;
  image_url: string;
  caption: string;
  property_type: string;
  bucket_path: string;
};

const isVideo = (url?: string) => url?.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);

export default function ManagementPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  
  const [newPropName, setNewPropName] = useState('');
  const [newPropSlug, setNewPropSlug] = useState('');
  
  // New Contact Fields
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');

  // Editing Contact Fields
  const [editPropId, setEditPropId] = useState<string | null>(null);
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editContactWhatsapp, setEditContactWhatsapp] = useState('');

  // Global Contact Settings
  const [globalEmail, setGlobalEmail] = useState('');
  const [globalPhone, setGlobalPhone] = useState('');
  const [globalWhatsapp, setGlobalWhatsapp] = useState('');
  const [isUpdatingGlobalContacts, setIsUpdatingGlobalContacts] = useState(false);
  const [globalContactsMessage, setGlobalContactsMessage] = useState('');

  // Password Change
  const [showSettings, setShowSettings] = useState(false);
  const [oldAdminPassword, setOldAdminPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');

  // Authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    try {
      const { data, error } = await supabase.from('admin_settings').select('admin_password').eq('id', 1).maybeSingle();
      
      if (error) {
        // Table doesn't exist or other error, fallback to default password silently so user isn't locked out
        console.log('Using default auth fallback');
      }
      
      const expectedPassword = data?.admin_password || 'admin123';
      
      if (expectedPassword === passwordInput) {
        setIsAuthenticated(true);
        fetchProperties();
        fetchAdminSettings();
      } else {
        setAuthError('Incorrect password');
      }
    } catch (err) {
      console.error('Catch error:', err);
      setAuthError(err instanceof Error ? err.message : 'Error authenticating');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
    setSelectedProperty(null);
  };

  // Fetch Data
  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProperties(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminSettings = async () => {
    try {
      const { data, error } = await supabase.from('admin_settings').select('contact_email, contact_phone, contact_whatsapp').eq('id', 1).maybeSingle();
      if (data) {
        setGlobalEmail(data.contact_email || '');
        setGlobalPhone(data.contact_phone || '');
        setGlobalWhatsapp(data.contact_whatsapp || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPhotos = async (slug: string) => {
    try {
      const { data, error } = await supabase.from('gallery_metadata').select('*').eq('property_type', slug).order('created_at', { ascending: false });
      if (error) throw error;
      setPhotos(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Create Property
  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName || !newPropSlug) return;
    
    try {
      const { error } = await supabase.from('properties').insert([{
        name: newPropName,
        slug: newPropSlug,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        contact_whatsapp: contactWhatsapp
      }]);
      if (error) throw error;
      
      setNewPropName('');
      setNewPropSlug('');
      setContactEmail('');
      setContactPhone('');
      setContactWhatsapp('');
      fetchProperties();
    } catch (err) {
      console.error(err);
      alert('Error creating property');
    }
  };

  // Delete Property
  const handleDeleteProperty = async (id: string, slug: string) => {
    if (!confirm('Are you sure you want to delete this property and all its photos?')) return;
    
    try {
      // Delete photos from DB
      await supabase.from('gallery_metadata').delete().eq('property_type', slug);
      // Delete property
      await supabase.from('properties').delete().eq('id', id);
      fetchProperties();
      if (selectedProperty?.id === id) setSelectedProperty(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Photo
  const handleDeletePhoto = async (id: string, bucketPath: string) => {
    if (!confirm('Delete this photo?')) return;
    
    try {
      if (bucketPath) {
        await supabase.storage.from('gallery').remove([bucketPath]);
      }
      await supabase.from('gallery_metadata').delete().eq('id', id);
      if (selectedProperty) fetchPhotos(selectedProperty.slug);
    } catch (err) {
      console.error(err);
    }
  };

  // Save Edits
  const handleSaveEdits = async (id: string) => {
    try {
      const { error } = await supabase.from('properties').update({
        contact_email: editContactEmail,
        contact_phone: editContactPhone,
        contact_whatsapp: editContactWhatsapp
      }).eq('id', id);
      if (error) throw error;
      
      setEditPropId(null);
      fetchProperties();
    } catch (err) {
      console.error(err);
      alert('Error saving details');
    }
  };

  const startEditing = (prop: Property) => {
    setEditPropId(prop.id);
    setEditContactEmail(prop.contact_email || '');
    setEditContactPhone(prop.contact_phone || '');
    setEditContactWhatsapp(prop.contact_whatsapp || '');
  };

  const handleUpdateGlobalContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingGlobalContacts(true);
    setGlobalContactsMessage('');
    try {
      const { error } = await supabase.from('admin_settings').update({
        contact_email: globalEmail,
        contact_phone: globalPhone,
        contact_whatsapp: globalWhatsapp
      }).eq('id', 1);
      
      if (error) throw error;
      setGlobalContactsMessage('Contact details updated successfully!');
      setTimeout(() => setGlobalContactsMessage(''), 3000);
    } catch (err: any) {
      setGlobalContactsMessage(err?.message || 'Failed to update contact details');
    } finally {
      setIsUpdatingGlobalContacts(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');
    if (!oldAdminPassword || !newAdminPassword || !confirmAdminPassword) {
      setPasswordChangeError('All fields are required');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      setPasswordChangeError('New passwords do not match');
      return;
    }
    
    setIsUpdatingPassword(true);
    try {
      // First verify old password
      const { data: currentData, error: fetchError } = await supabase.from('admin_settings').select('admin_password').eq('id', 1).maybeSingle();
      
      const currentPassword = currentData?.admin_password || 'admin123';
      if (currentPassword !== oldAdminPassword) {
        throw new Error('Incorrect old password');
      }

      // Update to new password
      const { error: updateError } = await supabase.from('admin_settings').update({ admin_password: newAdminPassword }).eq('id', 1);
      if (updateError) throw updateError;
      
      alert('Password updated successfully!');
      setShowSettings(false);
      setOldAdminPassword('');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
    } catch (err: any) {
      setPasswordChangeError(err?.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 p-8 rounded-3xl border border-white/10 max-w-md w-full shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-400 border border-emerald-500/20">
              <Lock className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl text-center text-white font-light mb-8">Admin Portal</h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              type="password" 
              placeholder="Enter Admin Password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
            />
            {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-medium transition-colors">
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
        <h1 className="text-2xl font-light text-white">Quilon Group Management</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 rounded-lg transition-colors" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="max-w-6xl mx-auto mb-8 bg-slate-800/50 rounded-2xl p-6 border border-white/5">
          <h3 className="text-xl font-light text-white mb-4">Admin Settings</h3>
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-4 max-w-md">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Old Password</label>
              <input 
                type="password" 
                required 
                value={oldAdminPassword} 
                onChange={e => setOldAdminPassword(e.target.value)} 
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" 
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">New Password</label>
              <input 
                type="password" 
                required 
                value={newAdminPassword} 
                onChange={e => setNewAdminPassword(e.target.value)} 
                onPaste={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" 
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Confirm New Password</label>
              <input 
                type="password" 
                required 
                value={confirmAdminPassword} 
                onChange={e => setConfirmAdminPassword(e.target.value)} 
                onPaste={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" 
              />
            </div>
            {passwordChangeError && <p className="text-red-400 text-sm">{passwordChangeError}</p>}
            <button type="submit" disabled={isUpdatingPassword} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50 mt-2">
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10">
            <h4 className="text-lg font-light text-white mb-4">Main Page Contact Details</h4>
            <form onSubmit={handleUpdateGlobalContacts} className="flex flex-col gap-4 max-w-md">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Main Email</label>
                <input 
                  type="email" 
                  value={globalEmail} 
                  onChange={e => setGlobalEmail(e.target.value)} 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" 
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Main Phone</label>
                <input 
                  type="tel" 
                  value={globalPhone} 
                  onChange={e => setGlobalPhone(e.target.value)} 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" 
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Main WhatsApp</label>
                <input 
                  type="tel" 
                  value={globalWhatsapp} 
                  onChange={e => setGlobalWhatsapp(e.target.value)} 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" 
                />
              </div>
              {globalContactsMessage && <p className="text-sm text-emerald-400">{globalContactsMessage}</p>}
              <button type="submit" disabled={isUpdatingGlobalContacts} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50 mt-2">
                {isUpdatingGlobalContacts ? 'Saving...' : 'Save Contact Details'}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedProperty ? (
        <div className="space-y-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedProperty(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-3xl font-light text-emerald-400">{selectedProperty.name}</h2>
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/5">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-emerald-400"/> Upload Media</h3>
            <Uploader propertySlug={selectedProperty.slug} onSuccess={() => fetchPhotos(selectedProperty.slug)} />
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/5">
            <h3 className="text-lg font-medium text-white mb-4">Gallery Items</h3>
            {photos.length === 0 ? (
              <p className="text-slate-400">No photos in this property yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {photos.map(photo => (
                  <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-900 border border-white/10">
                    {isVideo(photo.image_url) ? (
                      <video src={photo.image_url} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <Image src={photo.image_url} alt="gallery" fill className="object-cover" sizes="200px" />
                    )}
                    <button onClick={() => handleDeletePhoto(photo.id, photo.bucket_path)} className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Create Property Form */}
          <div className="md:col-span-1">
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/5 sticky top-8">
              <h3 className="text-xl font-light text-white mb-6 flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-400"/> Add Property</h3>
              <form onSubmit={handleCreateProperty} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Property Name</label>
                  <input required value={newPropName} onChange={e => { setNewPropName(e.target.value); setNewPropSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">URL Slug</label>
                  <input required value={newPropSlug} onChange={e => setNewPropSlug(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Contact Email (Optional)</label>
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Contact Phone (Optional)</label>
                  <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">WhatsApp Number (Optional)</label>
                  <input type="tel" value={contactWhatsapp} onChange={e => setContactWhatsapp(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <button type="submit" className="mt-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2 font-medium transition-colors">
                  Create Property
                </button>
              </form>
            </div>
          </div>

          {/* Properties List */}
          <div className="md:col-span-2">
            <h3 className="text-xl font-light text-white mb-6">Manage Properties</h3>
            {properties.length === 0 ? (
              <p className="text-slate-400">No properties created yet.</p>
            ) : (
              <div className="space-y-4">
                {properties.map(prop => (
                  <div key={prop.id} className="bg-slate-800/50 rounded-2xl p-4 border border-white/5 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-lg font-medium text-white">{prop.name}</h4>
                        <p className="text-xs text-slate-400 font-mono">/{prop.slug}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setSelectedProperty(prop); fetchPhotos(prop.slug); }} className="px-4 py-2 bg-white/5 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium transition-colors">
                          Manage Gallery
                        </button>
                        <button onClick={() => handleDeleteProperty(prop.id, prop.slug)} className="p-2 bg-white/5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Edit Contact Details Section */}
                    {editPropId === prop.id ? (
                      <div className="pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input value={editContactEmail} onChange={e => setEditContactEmail(e.target.value)} placeholder="Email" className="bg-slate-900/50 border border-slate-700 rounded px-3 py-1 text-sm text-white focus:border-emerald-500" />
                        <input value={editContactPhone} onChange={e => setEditContactPhone(e.target.value)} placeholder="Phone" className="bg-slate-900/50 border border-slate-700 rounded px-3 py-1 text-sm text-white focus:border-emerald-500" />
                        <input value={editContactWhatsapp} onChange={e => setEditContactWhatsapp(e.target.value)} placeholder="WhatsApp" className="bg-slate-900/50 border border-slate-700 rounded px-3 py-1 text-sm text-white focus:border-emerald-500" />
                        <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                          <button onClick={() => setEditPropId(null)} className="p-1 hover:bg-white/10 rounded text-slate-400"><X className="w-4 h-4"/></button>
                          <button onClick={() => handleSaveEdits(prop.id)} className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded"><Check className="w-4 h-4"/></button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-4 border-t border-white/10 flex items-center justify-between text-sm text-slate-400">
                        <div className="flex gap-4">
                          <span>{prop.contact_email || 'No email'}</span>
                          <span>•</span>
                          <span>{prop.contact_phone || 'No phone'}</span>
                          <span>•</span>
                          <span>{prop.contact_whatsapp ? 'WhatsApp set' : 'No WA'}</span>
                        </div>
                        <button onClick={() => startEditing(prop)} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs">
                          <Edit2 className="w-3 h-3" /> Edit Contacts
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
