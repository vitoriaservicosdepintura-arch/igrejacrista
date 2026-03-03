import { useState } from 'react';
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface MediaUploadProps {
    onUploadSuccess: (url: string) => void;
    folder: 'logos' | 'leaders' | 'events' | 'gallery';
    currentUrl?: string;
    label?: string;
    accept?: string;
}

export default function MediaUpload({ onUploadSuccess, folder, currentUrl, label, accept = "image/*" }: MediaUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(currentUrl || null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = e.target.files?.[0];
            if (!file) return;

            setUploading(true);
            setError(null);

            // Generate a unique file name
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `${folder}/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);

            setPreview(publicUrl);
            onUploadSuccess(publicUrl);
        } catch (err: any) {
            console.error('Error uploading:', err);
            setError(err.message || 'Erro ao fazer upload');
        } finally {
            setUploading(false);
        }
    };

    const clear = () => {
        setPreview(null);
        onUploadSuccess('');
    };

    return (
        <div className="space-y-2">
            {label && <label className="block text-xs font-semibold uppercase opacity-60">{label}</label>}

            <div
                className="relative group rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden flex flex-col items-center justify-center p-6 text-center"
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: error ? 'var(--error)' : 'var(--border)',
                    minHeight: '160px'
                }}
            >
                <AnimatePresence mode="wait">
                    {preview ? (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-black/5"
                        >
                            {preview.match(/\.(mp4|webm|ogg)$/) ? (
                                <video src={preview} className="w-full h-full object-cover" controls />
                            ) : (
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            )}
                            <button
                                onClick={clear}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition"
                            >
                                <X size={16} />
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-2"
                        >
                            <div className="w-12 h-12 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)]">
                                {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold">{uploading ? 'Enviando...' : 'Clique para enviar'}</p>
                                <p className="text-xs opacity-50">Fotos ou Vídeos</p>
                            </div>
                            <input
                                type="file"
                                accept={accept}
                                onChange={handleUpload}
                                disabled={uploading}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex items-center gap-2 text-red-500 text-xs font-medium"
                    >
                        <AlertCircle size={14} />
                        {error}
                    </motion.div>
                )}
            </div>

            {preview && !uploading && (
                <div className="flex items-center gap-2 text-green-500 text-xs font-medium px-2">
                    <CheckCircle2 size={14} />
                    <span>Upload concluído!</span>
                </div>
            )}
        </div>
    );
}
