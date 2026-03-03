import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

interface ImageLightboxProps {
    src: string;
    alt: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
    const [zoom, setZoom] = useState(1);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="absolute inset-0" onClick={onClose} />

                <div className="absolute top-4 right-4 z-[1001] flex items-center gap-3">
                    <motion.button
                        onClick={(e) => {
                            e.stopPropagation();
                            setZoom(prev => prev === 1 ? 1.5 : 1);
                        }}
                        className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        {zoom === 1 ? <ZoomIn size={24} /> : <ZoomOut size={24} />}
                    </motion.button>

                    <motion.button
                        onClick={onClose}
                        className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <X size={24} />
                    </motion.button>
                </div>

                <motion.div
                    className="relative max-w-full max-h-full flex items-center justify-center p-4 select-none"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: zoom, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                    <img
                        src={src}
                        alt={alt}
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl pointer-events-none"
                    />
                    <div className="absolute -bottom-10 left-0 right-0 text-center">
                        <p className="text-white/60 text-sm font-medium">{alt}</p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
