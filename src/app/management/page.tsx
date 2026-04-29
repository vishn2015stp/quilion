import Uploader from '@/components/Uploader';

export default function ManagementPage() {
  // In a real app, you would add authentication checks here.
  // For now, this is the simple management route.
  return (
    <div className="min-h-screen bg-slate-900 py-24 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-light text-white mb-4">Admin Portal</h1>
          <p className="text-slate-400">Upload new images to the Quilion Group gallery.</p>
        </div>
        
        <Uploader />
      </div>
    </div>
  );
}
