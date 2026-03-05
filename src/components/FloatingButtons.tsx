import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Send, Phone, User, Mail, Heart } from 'lucide-react';
import { supabase } from '../supabase';
import { useApp } from '../context/AppContext';

interface Leader {
    id: string;
    name: string;
    phone: string;
    role: string;
    photo_url?: string;
}

export default function FloatingButtons() {
    const { lang } = useApp();

    // WhatsApp leaders state
    const [showLeaders, setShowLeaders] = useState(false);
    const [leaders, setLeaders] = useState<Leader[]>([]);
    const [hoverWhatsapp, setHoverWhatsapp] = useState(false);

    // Prayer request state
    const [showPrayer, setShowPrayer] = useState(false);
    const [hoverPrayer, setHoverPrayer] = useState(false);
    const [prayerSent, setPrayerSent] = useState(false);
    const [prayerLoading, setPrayerLoading] = useState(false);
    const [prayerForm, setPrayerForm] = useState({
        name: '',
        phone: '',
        email: '',
        message: ''
    });

    useEffect(() => {
        const fetchLeaders = async () => {
            // Try dedicated leaders table first, fall back to members with role=leader
            const { data: leadersData } = await supabase
                .from('members')
                .select('id, name, phone, role, photo_url')
                .eq('is_leader', true)
                .not('phone', 'is', null);

            if (leadersData && leadersData.length > 0) {
                setLeaders(leadersData);
            }
        };
        fetchLeaders();
    }, []);

    const handleWhatsappLeader = (leader: Leader) => {
        const phone = leader.phone.replace(/\D/g, '');
        const message = lang === 'pt'
            ? `Olá ${leader.name}, vim pelo site da igreja e gostaria de mais informações.`
            : `Hello ${leader.name}, I came through the church website and would like more information.`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handlePrayerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prayerForm.name || !prayerForm.phone) return;
        setPrayerLoading(true);
        try {
            // 1. Salva em prayer_requests (para admin)
            const { data: requestData, error: requestError } = await supabase.from('prayer_requests').insert([{
                name: prayerForm.name,
                phone: prayerForm.phone,
                email: prayerForm.email || null,
                message: prayerForm.message || null,
            }]).select().single();

            if (requestError) throw requestError;

            // 2. Insere também no prayer_wall (para membros interagirem)
            await supabase.from('prayer_wall').insert([{
                name: prayerForm.name,
                text: prayerForm.message
                    ? prayerForm.message
                    : (lang === 'pt'
                        ? '🙏 Pedido de oração anônimo — ore por esta pessoa!'
                        : '🙏 Anonymous prayer request — please pray for this person!'),
                prayers_count: 0,
                source: 'public',
                phone: prayerForm.phone,
                email: prayerForm.email || null,
                prayer_request_id: requestData?.id || null,
            }]);

            // 3. Notificação para admin
            await supabase.from('notifications').insert([{
                type: 'prayer_request',
                title: lang === 'pt' ? '🙏 Novo Pedido de Oração' : '🙏 New Prayer Request',
                message: `${prayerForm.name} (${prayerForm.phone}) enviou um pedido de oração${prayerForm.message ? ': ' + prayerForm.message : '.'}`,
                read: false,
                related_id: requestData?.id || null,
            }]);

            setPrayerSent(true);
        } catch (err) {
            console.error(err);
        } finally {
            setPrayerLoading(false);
        }
    };

    const resetPrayer = () => {
        setShowPrayer(false);
        setTimeout(() => {
            setPrayerSent(false);
            setPrayerForm({ name: '', phone: '', email: '', message: '' });
        }, 400);
    };

    return (
        <>
            {/* ---- WHATSAPP LEADERS BUTTON (bottom-right) ---- */}
            <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-3">
                {/* Leaders Panel */}
                <AnimatePresence>
                    {showLeaders && (
                        <motion.div
                            className="rounded-2xl shadow-2xl overflow-hidden w-72"
                            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                            initial={{ opacity: 0, scale: 0.85, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, y: 20 }}
                            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                        >
                            <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#25D366' }}>
                                <div className="flex items-center gap-2">
                                    <MessageCircle size={20} className="text-white" />
                                    <span className="text-white font-bold text-sm">
                                        {lang === 'pt' ? 'Falar com um Líder' : 'Talk to a Leader'}
                                    </span>
                                </div>
                                <button onClick={() => setShowLeaders(false)} className="text-white/80 hover:text-white">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-3 max-h-72 overflow-y-auto">
                                {leaders.length === 0 ? (
                                    <p className="text-center text-sm py-4 opacity-60" style={{ color: 'var(--text-secondary)' }}>
                                        {lang === 'pt' ? 'Nenhum líder disponível.' : 'No leaders available.'}
                                    </p>
                                ) : (
                                    leaders.map((leader) => (
                                        <motion.button
                                            key={leader.id}
                                            onClick={() => handleWhatsappLeader(leader)}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl mb-1 text-left cursor-pointer transition-all"
                                            style={{ backgroundColor: 'var(--bg-secondary)' }}
                                            whileHover={{ backgroundColor: 'var(--accent-light)', x: 4 }}
                                            whileTap={{ scale: 0.97 }}
                                        >
                                            {leader.photo_url ? (
                                                <img src={leader.photo_url} alt={leader.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
                                                    <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                                                        {leader.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{leader.name}</p>
                                                <p className="text-xs opacity-60 truncate" style={{ color: 'var(--text-secondary)' }}>{leader.role}</p>
                                            </div>
                                            <MessageCircle size={16} className="flex-shrink-0" style={{ color: '#25D366' }} />
                                        </motion.button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* WhatsApp 3D Button */}
                <div className="relative flex items-center gap-3">
                    <AnimatePresence>
                        {hoverWhatsapp && !showLeaders && (
                            <motion.span
                                className="text-xs font-bold text-white px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg"
                                style={{ backgroundColor: '#25D366' }}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                            >
                                {lang === 'pt' ? 'Falar com um de nossos Líderes' : 'Talk to one of our Leaders'}
                            </motion.span>
                        )}
                    </AnimatePresence>
                    <motion.button
                        onClick={() => setShowLeaders(v => !v)}
                        onHoverStart={() => setHoverWhatsapp(true)}
                        onHoverEnd={() => setHoverWhatsapp(false)}
                        className="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer"
                        style={{
                            background: 'linear-gradient(145deg, #2ecc71, #25D366)',
                            boxShadow: '4px 4px 10px rgba(0,0,0,0.3), -2px -2px 6px rgba(255,255,255,0.15), 0 0 20px rgba(37,211,102,0.4)',
                        }}
                        whileHover={{ scale: 1.12, rotate: [0, -10, 10, 0] }}
                        whileTap={{ scale: 0.92 }}
                        animate={{ boxShadow: ['4px 4px 10px rgba(0,0,0,0.3), 0 0 20px rgba(37,211,102,0.3)', '4px 4px 10px rgba(0,0,0,0.3), 0 0 30px rgba(37,211,102,0.6)', '4px 4px 10px rgba(0,0,0,0.3), 0 0 20px rgba(37,211,102,0.3)'] }}
                        transition={{ boxShadow: { duration: 2, repeat: Infinity }, rotate: { duration: 0.4 } }}
                    >
                        {/* WhatsApp SVG icon */}
                        <svg viewBox="0 0 32 32" width="28" height="28" fill="white" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16.004 2.667C8.64 2.667 2.667 8.639 2.667 16c0 2.352.643 4.588 1.755 6.527L2.667 29.333l6.987-1.726A13.29 13.29 0 0016.004 29.333c7.36 0 13.33-5.972 13.33-13.333S23.363 2.667 16.004 2.667zm0 24c-2.073 0-4.04-.583-5.726-1.592l-.41-.243-4.147 1.025 1.065-3.997-.267-.42A10.632 10.632 0 015.334 16c0-5.888 4.782-10.667 10.67-10.667S26.671 10.112 26.671 16 21.89 26.667 16.004 26.667zm5.83-8.01c-.32-.16-1.892-.932-2.186-1.038-.293-.107-.507-.16-.72.16-.214.32-.827 1.038-.987 1.225-.174.187-.347.213-.667.053A8.37 8.37 0 0115.04 17.9a8.93 8.93 0 01-1.614-2.124c-.16-.32-.017-.493.12-.652.12-.14.267-.36.4-.547.133-.186.173-.32.267-.533.093-.214.047-.4-.027-.56-.08-.16-.72-1.733-.987-2.373-.267-.627-.533-.534-.72-.547h-.627c-.213 0-.56.08-.853.4-.293.32-1.12 1.093-1.12 2.667 0 1.573 1.147 3.093 1.307 3.306.16.213 2.253 3.44 5.453 4.827.76.32 1.36.507 1.813.653.76.24 1.453.2 2 .12.614-.093 1.893-.773 2.16-1.52.267-.746.267-1.386.187-1.52-.08-.133-.293-.213-.613-.373z" />
                        </svg>
                    </motion.button>
                </div>
            </div>

            {/* ---- PRAYER REQUEST BUTTON (bottom-left) ---- */}
            <div className="fixed bottom-6 left-6 z-[150] flex flex-col items-start gap-3">
                {/* Prayer Form Panel */}
                <AnimatePresence>
                    {showPrayer && (
                        <motion.div
                            className="rounded-2xl shadow-2xl overflow-hidden w-80"
                            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                            initial={{ opacity: 0, scale: 0.85, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, y: 20 }}
                            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                        >
                            {/* Header */}
                            <div className="p-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}>
                                <div className="flex items-center gap-2">
                                    <Heart size={18} className="text-white" />
                                    <span className="text-white font-bold text-sm">
                                        {lang === 'pt' ? 'Pedir Oração' : 'Prayer Request'}
                                    </span>
                                </div>
                                <button onClick={resetPrayer} className="text-white/80 hover:text-white">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-4">
                                <AnimatePresence mode="wait">
                                    {prayerSent ? (
                                        <motion.div
                                            key="success"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="text-center py-6"
                                        >
                                            <div className="text-5xl mb-3">🙏</div>
                                            <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)' }}>
                                                {lang === 'pt' ? 'Pedido Enviado!' : 'Request Sent!'}
                                            </h3>
                                            <p className="text-sm opacity-70" style={{ color: 'var(--text-secondary)' }}>
                                                {lang === 'pt'
                                                    ? 'Estamos orando por você. Que Deus abençoe sua vida!'
                                                    : 'We are praying for you. May God bless your life!'}
                                            </p>
                                            <motion.button
                                                onClick={resetPrayer}
                                                className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
                                                style={{ backgroundColor: 'var(--accent)' }}
                                                whileHover={{ scale: 1.04 }}
                                                whileTap={{ scale: 0.97 }}
                                            >
                                                {lang === 'pt' ? 'Fechar' : 'Close'}
                                            </motion.button>
                                        </motion.div>
                                    ) : (
                                        <motion.form
                                            key="form"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            onSubmit={handlePrayerSubmit}
                                            className="space-y-3"
                                        >
                                            {/* Name */}
                                            <div className="relative">
                                                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-primary)' }} />
                                                <input
                                                    type="text"
                                                    value={prayerForm.name}
                                                    onChange={e => setPrayerForm(f => ({ ...f, name: e.target.value }))}
                                                    placeholder={lang === 'pt' ? 'Seu nome *' : 'Your name *'}
                                                    required
                                                    className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm outline-none"
                                                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                                                />
                                            </div>
                                            {/* Phone */}
                                            <div className="relative">
                                                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-primary)' }} />
                                                <input
                                                    type="tel"
                                                    value={prayerForm.phone}
                                                    onChange={e => setPrayerForm(f => ({ ...f, phone: e.target.value }))}
                                                    placeholder={lang === 'pt' ? 'Telemóvel *' : 'Phone *'}
                                                    required
                                                    className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm outline-none"
                                                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                                                />
                                            </div>
                                            {/* Email */}
                                            <div className="relative">
                                                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-primary)' }} />
                                                <input
                                                    type="email"
                                                    value={prayerForm.email}
                                                    onChange={e => setPrayerForm(f => ({ ...f, email: e.target.value }))}
                                                    placeholder={lang === 'pt' ? 'Email (opcional)' : 'Email (optional)'}
                                                    className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm outline-none"
                                                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                                                />
                                            </div>
                                            {/* Prayer message */}
                                            <textarea
                                                value={prayerForm.message}
                                                onChange={e => setPrayerForm(f => ({ ...f, message: e.target.value }))}
                                                placeholder={lang === 'pt' ? 'Escreva seu pedido de oração (opcional)...' : 'Write your prayer request (optional)...'}
                                                rows={3}
                                                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                                                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                                            />
                                            <motion.button
                                                type="submit"
                                                disabled={prayerLoading}
                                                className="w-full py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                                                style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.97 }}
                                            >
                                                <Send size={15} />
                                                {prayerLoading
                                                    ? (lang === 'pt' ? 'Enviando...' : 'Sending...')
                                                    : (lang === 'pt' ? 'Enviar Pedido' : 'Send Request')}
                                            </motion.button>
                                        </motion.form>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Prayer 3D Button */}
                <div className="relative flex items-center gap-3">
                    <motion.button
                        onClick={() => setShowPrayer(v => !v)}
                        onHoverStart={() => setHoverPrayer(true)}
                        onHoverEnd={() => setHoverPrayer(false)}
                        className="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer text-white text-2xl"
                        style={{
                            background: 'linear-gradient(145deg, var(--gradient-start), var(--gradient-end))',
                            boxShadow: '4px 4px 10px rgba(0,0,0,0.3), -2px -2px 6px rgba(255,255,255,0.12), 0 0 18px rgba(200,164,90,0.4)',
                        }}
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.92 }}
                        animate={{ boxShadow: ['4px 4px 10px rgba(0,0,0,0.3), 0 0 18px rgba(200,164,90,0.3)', '4px 4px 10px rgba(0,0,0,0.3), 0 0 28px rgba(200,164,90,0.6)', '4px 4px 10px rgba(0,0,0,0.3), 0 0 18px rgba(200,164,90,0.3)'] }}
                        transition={{ boxShadow: { duration: 2.5, repeat: Infinity, delay: 0.5 } }}
                    >
                        🙏
                    </motion.button>
                    <AnimatePresence>
                        {hoverPrayer && !showPrayer && (
                            <motion.span
                                className="text-xs font-bold text-white px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg"
                                style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                            >
                                {lang === 'pt' ? 'Pedir Oração' : 'Prayer Request'}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}
