import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Calendar, MapPin, ZoomIn } from 'lucide-react';
import ImageLightbox from './ImageLightbox';
import { supabase } from '../supabase';

interface Event {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    image_url: string;
    type?: 'regular' | 'special';
    speaker?: string;
    singers?: string;
    theme?: string;
}

interface EventPopupProps {
    onNavigate?: (page: string) => void;
}

export default function EventPopup({ onNavigate }: EventPopupProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [event, setEvent] = useState<Event | null>(null);
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    useEffect(() => {
        async function fetchHighlightedEvent() {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .gte('date', today)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data && !error) {
                setEvent(data);
                // Show popup after a short delay
                const timer = setTimeout(() => setIsOpen(true), 1500);
                return () => clearTimeout(timer);
            }
        }

        fetchHighlightedEvent();
    }, []);

    useEffect(() => {
        if (!event) return;

        const calculateTimeLeft = () => {
            const eventDateTime = new Date(`${event.date}T${event.time}`);
            const now = new Date();
            const difference = eventDateTime.getTime() - now.getTime();

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                });
            } else {
                setTimeLeft(null);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [event]);

    if (!event || !isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[100] flex items-center justify-center px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <ImageLightbox
                    src={event.image_url}
                    alt={event.title}
                    isOpen={isLightboxOpen}
                    onClose={() => setIsLightboxOpen(false)}
                />

                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />

                {/* Popup Card */}
                <motion.div
                    className="relative w-full max-w-2xl overflow-hidden rounded-3xl shadow-2xl"
                    style={{ backgroundColor: 'var(--bg-card)' }}
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute right-4 top-4 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>

                    {/* Event Poster (Image) */}
                    <div
                        className="relative w-full flex items-center justify-center overflow-hidden cursor-zoom-in group"
                        style={{ backgroundColor: '#000', maxHeight: '60vh', minHeight: '30vh' }}
                        onClick={() => setIsLightboxOpen(true)}
                    >
                        {event.image_url ? (
                            <>
                                <div
                                    className="absolute inset-0 bg-cover bg-center opacity-50 blur-xl scale-110"
                                    style={{ backgroundImage: `url(${event.image_url})` }}
                                />
                                <img
                                    src={event.image_url}
                                    alt={event.title}
                                    className="relative w-full h-full object-contain max-h-[60vh] transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ZoomIn className="text-white w-12 h-12 drop-shadow-xl" />
                                </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white">
                                <Calendar size={64} className="opacity-20" />
                            </div>
                        )}

                        {event.type === 'special' && (
                            <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider" style={{ backgroundColor: 'var(--accent)' }}>
                                ★ Evento Especial
                            </div>
                        )}

                        {/* Countdown Overlay on Image Bottom */}
                        {timeLeft && (
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                <div className="flex justify-center gap-4 sm:gap-8">
                                    {[
                                        { label: 'Dias', value: timeLeft.days },
                                        { label: 'Horas', value: timeLeft.hours },
                                        { label: 'Min', value: timeLeft.minutes },
                                        { label: 'Seg', value: timeLeft.seconds },
                                    ].map((unit, i) => (
                                        <div key={i} className="text-center text-white">
                                            <div className="text-2xl sm:text-3xl font-bold font-serif leading-none">
                                                {String(unit.value).padStart(2, '0')}
                                            </div>
                                            <div className="text-[10px] sm:text-xs uppercase tracking-wider opacity-80 mt-1">
                                                {unit.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="p-6 sm:p-8">
                        <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                            {event.title}
                        </h2>

                        <div className="flex flex-wrap gap-4 mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <div className="flex items-center gap-1.5">
                                <Calendar size={16} className="text-[var(--accent)]" />
                                {new Date(event.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock size={16} className="text-[var(--accent)]" />
                                {event.time.slice(0, 5)}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <MapPin size={16} className="text-[var(--accent)]" />
                                {event.location}
                            </div>
                        </div>

                        {event.theme && (
                            <div className="mb-4 p-3 rounded-xl border-l-4 font-serif italic text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--accent)', color: 'var(--text-primary)' }}>
                                "{event.theme}"
                            </div>
                        )}

                        <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                            {event.description}
                        </p>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {event.speaker && (
                                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                                    <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest mb-1">Pregação</p>
                                    <p className="text-sm font-bold text-[var(--text-primary)]">📖 {event.speaker}</p>
                                </div>
                            )}
                            {event.singers && (
                                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                                    <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest mb-1">Louvor</p>
                                    <p className="text-sm font-bold text-[var(--text-primary)]">🎤 {event.singers}</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                setIsOpen(false);
                                if (onNavigate) onNavigate('events');
                            }}
                            className="w-full py-3.5 rounded-xl font-semibold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                            style={{ backgroundColor: 'var(--accent)', boxShadow: '0 8px 16px -4px var(--accent-hover)' }}
                        >
                            Ver mais detalhes
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
