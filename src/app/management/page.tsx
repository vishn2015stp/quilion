'use client';

import { useState, useEffect } from 'react';
import Uploader from '@/components/Uploader';
import { supabase } from '@/lib/supabase';
import { Lock, Plus, LogOut, Image as ImageIcon, Trash2, Edit2, Check, X, ArrowLeft, Settings, Loader2 } from 'lucide-react';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';
import { useRouter } from 'next/navigation';

type Property = {
  id: string;
  name: string;
  slug: string;
  cover_image_url?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_whatsapp?: string;
  location_url?: string;
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
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [editPhotoId, setEditPhotoId] = useState<string | null>(null);
  const [editPhotoCaption, setEditPhotoCaption] = useState('');
  
  const [newPropName, setNewPropName] = useState('');
  const [newPropSlug, setNewPropSlug] = useState('');
  const [contactLocationUrl, setContactLocationUrl] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  
  // New Contact Fields
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');

  // Editing Contact Fields
  const [editPropId, setEditPropId] = useState<string | null>(null);
  const [editPropName, setEditPropName] = useState('');
  const [editPropSlug, setEditPropSlug] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editContactWhatsapp, setEditContactWhatsapp] = useState('');
  const [editLocationUrl, setEditLocationUrl] = useState('');
  const [editCoverImageFile, setEditCoverImageFile] = useState<File | null>(null);
  const [isEditingCover, setIsEditingCover] = useState(false);

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

  const uploadCoverImage = async (file: File, slug: string) => {
    let uploadFile = file;
    const isVideoFile = file.type.startsWith('video/');

    if (!isVideoFile) {
      const options = { maxSizeMB: 0.9, maxWidthOrHeight: 1920, useWebWorker: true };
      uploadFile = await imageCompression(file, options);
    }
    const fileName = `${slug}/cover-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
    const { error: storageError } = await supabase.storage.from('gallery').upload(fileName, uploadFile, { cacheControl: '3600', upsert: false });
    if (storageError) throw storageError;
    const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(fileName);
    return publicUrl;
  };

  // Create Property
  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName || !newPropSlug) return;
    
    try {
      setIsUploadingCover(true);
      let uploadedCoverUrl = '';
      if (coverImageFile) {
        uploadedCoverUrl = await uploadCoverImage(coverImageFile, newPropSlug);
      }

      const { error } = await supabase.from('properties').insert([{
        name: newPropName,
        slug: newPropSlug,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        contact_whatsapp: contactWhatsapp,
        location_url: contactLocationUrl,
        ...(uploadedCoverUrl ? { cover_image_url: uploadedCoverUrl } : {})
      }]);
      if (error) throw error;
      
      setNewPropName('');
      setNewPropSlug('');
      setContactEmail('');
      setContactPhone('');
      setContactWhatsapp('');
      setContactLocationUrl('');
      setCoverImageFile(null);
      fetchProperties();
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Error creating property');
    } finally {
      setIsUploadingCover(false);
    }
  };

  // Delete Property
  const handleDeleteProperty = async (id: string, slug: string) => {
    try {
      // First check if there are any photos
      const { count, error: countError } = await supabase
        .from('gallery_metadata')
        .select('*', { count: 'exact', head: true })
        .eq('property_type', slug);
        
      if (countError) throw countError;
      
      if (count && count > 0) {
        alert('Cannot delete property: Please delete all media inside this property first.');
        return;
      }

      if (!confirm('Are you sure you want to delete this empty property?')) return;

      // Delete property
      await supabase.from('properties').delete().eq('id', id);
      fetchProperties();
      if (selectedProperty?.id === id) setSelectedProperty(null);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Error deleting property');
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
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePhotoCaption = async (id: string) => {
    try {
      // Optimistic UI update
      setPhotos(prev => prev.map(p => p.id === id ? { ...p, caption: editPhotoCaption } : p));
      setEditPhotoId(null);

      const { data, error } = await supabase.from('gallery_metadata').update({ caption: editPhotoCaption }).eq('id', id).select();
      if (error) throw error;
      
      if (data && data.length === 0) {
        alert('Update failed: No rows were changed. This usually means your Supabase RLS policies do not allow UPDATE operations. Please enable UPDATE for anon users on the gallery_metadata table.');
        // Revert optimistic update
        if (selectedProperty) fetchPhotos(selectedProperty.slug);
        return;
      }
      
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert('Error updating caption: ' + (err?.message || 'Unknown error'));
      // Revert if error occurs
      if (selectedProperty) fetchPhotos(selectedProperty.slug);
    }
  };

  // Save Edits
  const handleSaveEdits = async (id: string, slug: string) => {
    try {
      setIsEditingCover(true);
      let uploadedCoverUrl = '';
      if (editCoverImageFile) {
        uploadedCoverUrl = await uploadCoverImage(editCoverImageFile, slug);
      }

      const { data, error } = await supabase.from('properties').update({
        name: editPropName,
        slug: editPropSlug,
        contact_email: editContactEmail,
        contact_phone: editContactPhone,
        contact_whatsapp: editContactWhatsapp,
        location_url: editLocationUrl,
        ...(uploadedCoverUrl ? { cover_image_url: uploadedCoverUrl } : {})
      }).eq('id', id).select();
      
      if (error) throw error;

      if (data && data.length === 0) {
        alert('Update failed: No rows were changed. This usually means your Supabase RLS policies do not allow UPDATE operations. Please enable UPDATE for anon users on the properties table.');
        setIsEditingCover(false);
        return;
      }
      
      setEditPropId(null);
      setEditCoverImageFile(null);
      fetchProperties();
      router.refresh();
      if (selectedProperty?.id === id) {
        setSelectedProperty(prev => prev ? { ...prev, name: editPropName, slug: editPropSlug, contact_email: editContactEmail, contact_phone: editContactPhone, contact_whatsapp: editContactWhatsapp, location_url: editLocationUrl, ...(uploadedCoverUrl ? { cover_image_url: uploadedCoverUrl } : {}) } : null);
      }
    } catch (err) {
      console.error(err);
      alert('Error saving details');
    } finally {
      setIsEditingCover(false);
    }
  };

  const startEditing = (prop: Property) => {
    setEditPropId(prop.id);
    setEditPropName(prop.name || '');
    setEditPropSlug(prop.slug || '');
    setEditContactEmail(prop.contact_email || '');
    setEditContactPhone(prop.contact_phone || '');
    setEditContactWhatsapp(prop.contact_whatsapp || '');
    setEditLocationUrl(prop.location_url || '');
    setEditCoverImageFile(null);
  };

  const handleUpdateGlobalContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingGlobalContacts(true);
    setGlobalContactsMessage('');
    try {
      const { data, error } = await supabase.from('admin_settings').update({
        contact_email: globalEmail,
        contact_phone: globalPhone,
        contact_whatsapp: globalWhatsapp
      }).eq('id', 1).select();
      
      if (error) throw error;
      if (data && data.length === 0) {
        throw new Error('Update failed: No rows changed. Check your Supabase RLS policies for admin_settings table (enable UPDATE).');
      }
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
      const { data: updateData, error: updateError } = await supabase.from('admin_settings').update({ admin_password: newAdminPassword }).eq('id', 1).select();
      if (updateError) throw updateError;
      if (updateData && updateData.length === 0) {
        throw new Error('Password update failed: No rows changed. Check your Supabase RLS policies for admin_settings table (enable UPDATE).');
      }
      
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
      <div className="h-screen bg-ivory-50 flex items-center justify-center p-4">
        <div className="bg-white/80 shadow-sm p-8 rounded-3xl border border-amber-200/60 max-w-md w-full shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-amber-500/10 rounded-full text-amber-600 border border-amber-500/30">
              <Lock className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl text-center text-slate-800 font-light mb-8">Admin Portal</h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              type="password" 
              placeholder="Enter Admin Password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-amber-500/50"
            />
            {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-800 rounded-xl py-3 font-medium transition-colors">
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory-50 text-slate-800 p-4 md:p-8">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-amber-200/60">
        <h1 className="text-2xl font-light text-slate-800">Quilon Group Management</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-white border border-amber-200 shadow-sm hover:bg-amber-50 text-slate-600 hover:text-amber-600 rounded-lg transition-colors" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-white border border-amber-200 shadow-sm hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="max-w-6xl mx-auto mb-8 bg-white/80 shadow-sm rounded-2xl p-6 border border-amber-200/40">
          <h3 className="text-xl font-light text-slate-800 mb-4">Admin Settings</h3>
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-4 max-w-md">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Old Password</label>
              <input 
                type="password" 
                required 
                value={oldAdminPassword} 
                onChange={e => setOldAdminPassword(e.target.value)} 
                className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">New Password</label>
              <input 
                type="password" 
                required 
                value={newAdminPassword} 
                onChange={e => setNewAdminPassword(e.target.value)} 
                onPaste={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
                className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Confirm New Password</label>
              <input 
                type="password" 
                required 
                value={confirmAdminPassword} 
                onChange={e => setConfirmAdminPassword(e.target.value)} 
                onPaste={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
                className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
              />
            </div>
            {passwordChangeError && <p className="text-red-500 text-sm">{passwordChangeError}</p>}
            <button type="submit" disabled={isUpdatingPassword} className="bg-amber-500 hover:bg-amber-400 text-slate-800 rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50 mt-2">
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-amber-200/60">
            <h4 className="text-lg font-light text-slate-800 mb-4">Main Page Contact Details</h4>
            <form onSubmit={handleUpdateGlobalContacts} className="flex flex-col gap-4 max-w-md">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Main Email</label>
                <input 
                  type="email" 
                  value={globalEmail} 
                  onChange={e => setGlobalEmail(e.target.value)} 
                  className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Main Phone</label>
                <input 
                  type="tel" 
                  value={globalPhone} 
                  onChange={e => setGlobalPhone(e.target.value)} 
                  className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Main WhatsApp</label>
                <input 
                  type="tel" 
                  value={globalWhatsapp} 
                  onChange={e => setGlobalWhatsapp(e.target.value)} 
                  className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                />
              </div>
              {globalContactsMessage && <p className="text-sm text-amber-600">{globalContactsMessage}</p>}
              <button type="submit" disabled={isUpdatingGlobalContacts} className="bg-amber-500 hover:bg-amber-400 text-slate-800 rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50 mt-2">
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
              <button onClick={() => setSelectedProperty(null)} className="p-2 bg-white border border-amber-200 shadow-sm hover:bg-amber-50 rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-3xl font-light text-amber-600">{selectedProperty.name}</h2>
            </div>
          </div>
          
          <div className="bg-white/80 shadow-sm rounded-2xl p-6 border border-amber-200/40">
            <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-amber-600"/> Upload Media</h3>
            <Uploader propertySlug={selectedProperty.slug} onSuccess={() => { fetchPhotos(selectedProperty.slug); router.refresh(); }} />
          </div>

          <div className="bg-white/80 shadow-sm rounded-2xl p-6 border border-amber-200/40">
            <h3 className="text-lg font-medium text-slate-800 mb-4">Gallery Items</h3>
            {photos.length === 0 ? (
              <p className="text-slate-500">No photos in this property yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {photos.map(photo => (
                  <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square bg-ivory-50 border border-amber-200/60">
                    {isVideo(photo.image_url) ? (
                      <video src={photo.image_url} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <Image src={photo.image_url} alt="gallery" fill className="object-cover" sizes="200px" />
                    )}
                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={() => { setEditPhotoId(photo.id); setEditPhotoCaption(photo.caption || ''); }} className="p-2 bg-amber-500/90 hover:bg-amber-400 text-white rounded-full shadow-sm">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeletePhoto(photo.id, photo.bucket_path)} className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full shadow-sm">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {editPhotoId === photo.id ? (
                      <div className="absolute inset-0 bg-white/95 backdrop-blur-md shadow-lg border border-amber-100 p-3 flex flex-col justify-center gap-2 z-20">
                        <label className="text-xs text-slate-500">Edit Caption</label>
                        <textarea 
                          value={editPhotoCaption} 
                          onChange={e => setEditPhotoCaption(e.target.value)}
                          className="w-full bg-white border border-amber-200 shadow-sm rounded px-2 py-1 text-sm text-slate-800 resize-none h-20 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                        <div className="flex justify-end gap-2 mt-1">
                          <button onClick={() => setEditPhotoId(null)} className="p-1 hover:bg-amber-50 rounded text-slate-500"><X className="w-4 h-4"/></button>
                          <button onClick={() => handleSavePhotoCaption(photo.id)} className="p-1 hover:bg-amber-50 text-amber-600 rounded"><Check className="w-4 h-4"/></button>
                        </div>
                      </div>
                    ) : (
                      photo.caption && <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-8 text-xs text-white truncate pointer-events-none">{photo.caption}</div>
                    )}
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
            <div className="bg-white/80 shadow-sm rounded-2xl p-6 border border-amber-200/40 sticky top-8">
              <h3 className="text-xl font-light text-slate-800 mb-6 flex items-center gap-2"><Plus className="w-5 h-5 text-amber-600"/> Add Property</h3>
              <form onSubmit={handleCreateProperty} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Property Name</label>
                  <input required value={newPropName} onChange={e => { setNewPropName(e.target.value); setNewPropSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }} className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">URL Slug</label>
                  <input required value={newPropSlug} onChange={e => setNewPropSlug(e.target.value)} className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Contact Email (Optional)</label>
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Contact Phone (Optional)</label>
                  <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">WhatsApp Number (Optional)</label>
                  <input type="tel" value={contactWhatsapp} onChange={e => setContactWhatsapp(e.target.value)} className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Google Maps URL (Optional)</label>
                  <input type="url" value={contactLocationUrl} onChange={e => setContactLocationUrl(e.target.value)} className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Cover Image/Video (Optional)</label>
                  <input type="file" accept="image/*,video/*" onChange={e => setCoverImageFile(e.target.files?.[0] || null)} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-amber-500/10 file:text-amber-600 hover:file:bg-amber-500/20 transition-all cursor-pointer" />
                </div>
                <button type="submit" disabled={isUploadingCover} className="mt-2 w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-800 rounded-lg py-2 font-medium transition-colors flex items-center justify-center gap-2">
                  {isUploadingCover ? <><Loader2 className="w-4 h-4 animate-spin"/> Creating...</> : 'Create Property'}
                </button>
              </form>
            </div>
          </div>

          {/* Properties List */}
          <div className="md:col-span-2">
            <h3 className="text-xl font-light text-slate-800 mb-6">Manage Properties</h3>
            {properties.length === 0 ? (
              <p className="text-slate-500">No properties created yet.</p>
            ) : (
              <div className="space-y-4">
                {properties.map(prop => (
                  <div key={prop.id} className="bg-white/80 shadow-sm rounded-2xl p-4 border border-amber-200/40 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-lg font-medium text-slate-800">{prop.name}</h4>
                        <p className="text-xs text-slate-500 font-mono">/{prop.slug}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setSelectedProperty(prop); fetchPhotos(prop.slug); }} className="px-4 py-2 bg-white border border-amber-200 shadow-sm hover:bg-amber-50 text-amber-600 rounded-lg text-sm font-medium transition-colors">
                          Manage Gallery
                        </button>
                        <button onClick={() => handleDeleteProperty(prop.id, prop.slug)} className="p-2 bg-white border border-amber-200 shadow-sm hover:bg-red-50 text-red-500 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Edit Contact Details Section */}
                    {editPropId === prop.id ? (
                      <div className="pt-4 border-t border-amber-200/60 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input value={editPropName} onChange={e => setEditPropName(e.target.value)} placeholder="Property Name" className="bg-white border border-amber-200 rounded px-3 py-1 text-sm text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                        <input value={editPropSlug} onChange={e => setEditPropSlug(e.target.value)} placeholder="URL Slug" className="bg-white border border-amber-200 rounded px-3 py-1 text-sm text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                        <input value={editContactEmail} onChange={e => setEditContactEmail(e.target.value)} placeholder="Email" className="bg-white border border-amber-200 rounded px-3 py-1 text-sm text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                        <input value={editContactPhone} onChange={e => setEditContactPhone(e.target.value)} placeholder="Phone" className="bg-white border border-amber-200 rounded px-3 py-1 text-sm text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                        <input value={editContactWhatsapp} onChange={e => setEditContactWhatsapp(e.target.value)} placeholder="WhatsApp" className="bg-white border border-amber-200 rounded px-3 py-1 text-sm text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                        <input value={editLocationUrl} onChange={e => setEditLocationUrl(e.target.value)} placeholder="Google Maps URL" className="bg-white border border-amber-200 rounded px-3 py-1 text-sm text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                        <div className="md:col-span-2">
                          <label className="text-xs text-slate-500 mb-1 block">New Cover Media (Leave blank to keep current)</label>
                          <input type="file" accept="image/*,video/*" onChange={e => setEditCoverImageFile(e.target.files?.[0] || null)} className="w-full text-xs text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-amber-500/10 file:text-amber-600 hover:file:bg-amber-500/20 transition-all cursor-pointer" />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                          <button onClick={() => setEditPropId(null)} className="p-1 hover:bg-amber-50 rounded text-slate-500"><X className="w-4 h-4"/></button>
                          <button onClick={() => handleSaveEdits(prop.id, prop.slug)} disabled={isEditingCover} className="p-1 hover:bg-amber-50 text-amber-600 rounded disabled:opacity-50">{isEditingCover ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-4 border-t border-amber-200/60 flex flex-col md:flex-row items-start md:items-center justify-between text-sm text-slate-500 gap-2">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span>{prop.contact_email || 'No email'}</span>
                          <span className="hidden md:inline">•</span>
                          <span>{prop.contact_phone || 'No phone'}</span>
                          <span className="hidden md:inline">•</span>
                          <span>{prop.contact_whatsapp ? 'WhatsApp set' : 'No WA'}</span>
                          <span className="hidden md:inline">•</span>
                          <span>{prop.location_url ? 'Map set' : 'No Map'}</span>
                          <span className="hidden md:inline">•</span>
                          <span>{prop.cover_image_url ? 'Cover set' : 'No Cover'}</span>
                        </div>
                        <button onClick={() => startEditing(prop)} className="flex items-center gap-1 text-amber-600 hover:text-amber-500 text-xs whitespace-nowrap">
                          <Edit2 className="w-3 h-3" /> Edit Details
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
