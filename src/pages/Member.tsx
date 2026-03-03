import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, Church, Lock, Coins, Trophy, Download, Heart, Send, BookOpen, FileText, Settings, StickyNote, Trash2, Edit3, X, Save, Bell, CheckCircle2, Share2, MessageCircle, Copy, Image as ImageIcon, Palette, PenLine } from 'lucide-react';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabase';
import BiblePage from '../components/BiblePage';

function getLocalized(str: string, lang: string): string {
  const parts = str.split('|');
  for (const part of parts) {
    if (part.startsWith(`${lang}:`)) return part.substring(lang.length + 1);
  }
  return parts[0]?.split(':')[1] || str;
}

const DEFAULT_COLORS = [
  { value: '#fef3c7', label: 'Inspirador' },
  { value: '#dcfce7', label: 'Renovo' },
  { value: '#dbeafe', label: 'Esperança' },
  { value: '#fee2e2', label: 'Promessa' },
  { value: '#f3e8ff', label: 'Realeza' },
  { value: '#ffedd5', label: 'Aviso' },
  { value: '#fcd34d', label: 'Revelação' },
  { value: '#4ade80', label: 'Vida' },
  { value: '#60a5fa', label: 'Paz' },
  { value: '#fb7185', label: 'Amor' },
  { value: '#a78bfa', label: 'Espírito' },
  { value: '#fb923c', label: 'Fogo' },
  // Gradients
  { value: 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%)', label: 'Amanhecer' },
  { value: 'linear-gradient(135deg, #dcfce7 0%, #4ade80 100%)', label: 'Florescer' },
  { value: 'linear-gradient(135deg, #dbeafe 0%, #60a5fa 100%)', label: 'Oceano' },
  { value: 'linear-gradient(135deg, #fee2e2 0%, #fb7185 100%)', label: 'Paixão' },
  { value: 'linear-gradient(135deg, #f3e8ff 0%, #a78bfa 100%)', label: 'Gênese' },
  { value: 'linear-gradient(135deg, #ffedd5 0%, #fb923c 100%)', label: 'Glória' },
];

export default function Member() {
  const { t, lang, user, login, register } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', phone: '', church: '', password: '' });
  const [activeTab, setActiveTab] = useState('prayer');
  const [prayerText, setPrayerText] = useState('');
  const [prayers, setPrayers] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingPrayers, setLoadingPrayers] = useState(false);

  // Bible Annotations state
  const [bibleAnnotations, setBibleAnnotations] = useState<any[]>([]);
  const [palette, setPalette] = useState<any[]>([]);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editAnnotation, setEditAnnotation] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [paletteEditorOpen, setPaletteEditorOpen] = useState(false);
  const [editingPaletteItem, setEditingPaletteItem] = useState<any | null>(null);
  const [tempLabel, setTempLabel] = useState('');
  const [tempColor, setTempColor] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareItem, setShareItem] = useState<any | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const unreadCount = bibleAnnotations.filter(a => !a.is_read).length;

  const loadAnnotations = async (uid: string) => {
    const { data } = await supabase
      .from('bible_annotations')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (data) setBibleAnnotations(data);
  };

  const loadPalette = async (uid: string) => {
    try {
      // 1. Fetch user's custom palette
      const { data: userPalette, error } = await supabase
        .from('bible_marker_colors')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: true });

      if (userPalette && userPalette.length > 0) {
        setPalette(userPalette.map(d => ({ value: d.color, label: d.label, id: d.id })));
        return;
      }

      // 2. Fallback to Global Palette from Admin
      const { data: globalColors } = await supabase
        .from('global_palette')
        .select('*')
        .order('created_at', { ascending: true });

      if (globalColors && globalColors.length > 0) {
        // Clone global to user
        const rows = globalColors.map(c => ({
          user_id: uid,
          label: c.label,
          color: c.color
        }));
        const { data: inserted } = await supabase.from('bible_marker_colors').insert(rows).select();
        if (inserted) {
          setPalette(inserted.map(d => ({ value: d.color, label: d.label, id: d.id })));
        }
      } else {
        // 3. Fallback to hardcoded defaults
        const rows = DEFAULT_COLORS.map(c => ({
          user_id: uid,
          label: c.label,
          color: c.value
        }));
        const { data: inserted } = await supabase.from('bible_marker_colors').insert(rows).select();
        if (inserted) {
          setPalette(inserted.map(d => ({ value: d.color, label: d.label, id: d.id })));
        }
      }
    } catch (err) {
      console.error('Error loading palette:', err);
    }
  };

  useEffect(() => {
    if (user) {
      const fetchMemberData = async () => {
        const [pwRes, rkRes, matRes] = await Promise.all([
          supabase.from('prayer_wall').select('*').order('created_at', { ascending: false }).limit(20),
          supabase.from('quiz_players').select('*').order('score', { ascending: false }).limit(20),
          supabase.from('exclusive_materials').select('*').order('created_at', { ascending: false })
        ]);
        if (pwRes.data) setPrayers(pwRes.data);
        if (rkRes.data) setRanking(rkRes.data);
        if (matRes.data) setMaterials(matRes.data);
        await Promise.all([
          loadAnnotations(user.id),
          loadPalette(user.id)
        ]);
      };
      fetchMemberData();
    }
  }, [user]);

  // Mark as read when tab opens
  useEffect(() => {
    if (activeTab === 'materials' && user && unreadCount > 0) {
      supabase
        .from('bible_annotations')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .then(() => setBibleAnnotations(prev => prev.map(a => ({ ...a, is_read: true }))));
    }
  }, [activeTab, user]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      await login(form.email, form.password);
    } else {
      await register(form.name, form.email, form.phone, form.church, form.password);
    }
  };

  const handleShare = async (type: 'wa' | 'mail' | 'copy' | 'image', item: any) => {
    const text = `"${item.verse_text}" — ${item.book_name} ${item.chapter}:${item.verse}\n\n${item.annotation ? `Minha anotação: ${item.annotation}\n\n` : ''}Igreja Cristã: Vivendo a Palavra.`;
    const url = window.location.origin;
    const photoText = item.photo_url ? `\n🖼️ Veja a foto que anexei: ${item.photo_url}\n` : '';
    const fullText = `${text}${photoText}\n${url}`;

    if (type === 'wa') {
      window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, '_blank');
    } else if (type === 'mail') {
      window.open(`mailto:?subject=Versículo Bíblico&body=${encodeURIComponent(fullText)}`, '_self');
    } else if (type === 'copy') {
      await navigator.clipboard.writeText(fullText);
      alert('Copiado para a área de transferência!');
    } else if (type === 'image') {
      setShareItem(item);
      // Wait for React to render the hidden item
      setTimeout(async () => {
        if (!shareCardRef.current) return;
        setSharing(true);
        try {
          const dataUrl = await toPng(shareCardRef.current, { cacheBust: true, quality: 0.95, backgroundColor: 'white' });
          const link = document.createElement('a');
          link.download = `versiculo-${item.book_name}-${item.chapter}-${item.verse}.png`;
          link.href = dataUrl;
          link.click();
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch (err) {
          console.error('Falha ao gerar imagem', err);
        } finally {
          setSharing(false);
          setShareItem(null);
        }
      }, 100);
    }
  };

  const handleSendPrayer = async () => {
    if (!prayerText.trim() || !user) return;
    setLoadingPrayers(true);
    try {
      const newPrayer = {
        user_id: user.id || null,
        name: user.name,
        text: prayerText,
        prayers_count: 0
      };
      const { data, error } = await supabase.from('prayer_wall').insert([newPrayer]).select('*').single();
      if (!error && data) {
        setPrayers(prev => [data, ...prev]);
        setPrayerText('');
      } else if (error) console.error("Error inserting prayer_wall", error);
    } finally {
      setLoadingPrayers(false);
    }
  };

  const handlePray = async (id: string, currentCount: number) => {
    try {
      const { error } = await supabase.from('prayer_wall').update({ prayers_count: currentCount + 1 }).eq('id', id);
      if (!error) {
        setPrayers(prev => prev.map(p => p.id === id ? { ...p, prayers_count: currentCount + 1 } : p));
      }
    } catch (e) { console.error(e) }
  };

  const handleDeleteAnnotation = async (id: string) => {
    if (!confirm(lang === 'pt' ? 'Excluir esta anotação?' : 'Delete this annotation?')) return;

    // Find the item to get highlight_id
    const item = bibleAnnotations.find(a => a.id === id);

    const { error } = await supabase.from('bible_annotations').delete().eq('id', id);
    if (!error) {
      if (item?.highlight_id) {
        await supabase.from('bible_highlights').delete().eq('id', item.highlight_id);
      }
      setBibleAnnotations(prev => prev.filter(a => a.id !== id));
    }
  };

  const openEditModal = (item: any) => {
    setEditItem(item);
    setEditAnnotation(item.annotation || '');
    setEditColor(item.color || '#fde68a');
  };

  const handleUpdateAnnotation = async () => {
    if (!editItem) return;
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from('bible_annotations')
        .update({
          annotation: editAnnotation.trim(),
          color: editColor,
          updated_at: new Date().toISOString()
        })
        .eq('id', editItem.id);

      // Also update in bible_highlights to keep in sync
      if (editItem.highlight_id) {
        await supabase
          .from('bible_highlights')
          .update({
            annotation: editAnnotation.trim(),
            color: editColor
          })
          .eq('id', editItem.highlight_id);
      }

      if (!error) {
        setBibleAnnotations(prev => prev.map(a => a.id === editItem.id ? { ...a, annotation: editAnnotation.trim(), color: editColor } : a));
        setEditItem(null);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } finally {
      setEditSaving(false);
    }
  };

  const handleSavePaletteItem = async () => {
    if (!user || !editingPaletteItem) return;
    const { error } = await supabase
      .from('bible_marker_colors')
      .update({ label: tempLabel, color: tempColor })
      .eq('id', editingPaletteItem.id);

    if (!error) {
      await loadPalette(user.id);
      setEditingPaletteItem(null);
    } else {
      alert('Erro: ' + error.message);
    }
  };

  const handleResetPalette = async () => {
    if (!user || !confirm('Resetar paleta?')) return;
    await supabase.from('bible_marker_colors').delete().eq('user_id', user.id);
    await loadPalette(user.id);
    setPaletteEditorOpen(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-20" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <motion.div
          className="w-full max-w-md rounded-2xl p-8"
          style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 8px 40px var(--shadow)', border: '1px solid var(--border)' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <motion.div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
              whileHover={{ scale: 1.1, rotate: 10 }}
            >
              <BookOpen size={28} />
            </motion.div>
            <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {t('member.title')}
            </h2>
          </div>

          <div className="flex rounded-xl overflow-hidden mb-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <button
              onClick={() => setIsLogin(true)}
              className="flex-1 py-3 text-sm font-medium transition cursor-pointer"
              style={{
                backgroundColor: isLogin ? 'var(--accent)' : 'transparent',
                color: isLogin ? 'white' : 'var(--text-secondary)',
              }}
            >
              {t('member.login')}
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className="flex-1 py-3 text-sm font-medium transition cursor-pointer"
              style={{
                backgroundColor: !isLogin ? 'var(--accent)' : 'transparent',
                color: !isLogin ? 'white' : 'var(--text-secondary)',
              }}
            >
              {t('member.register')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                    <input
                      type="text"
                      placeholder={t('member.name')}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                  </div>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                    <input
                      type="tel"
                      placeholder={t('member.phone')}
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                  </div>
                  <div className="relative">
                    <Church size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                    <input
                      type="text"
                      placeholder={t('member.church')}
                      value={form.church}
                      onChange={(e) => setForm({ ...form, church: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder={t('member.email')}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                required
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
              <input
                type="password"
                placeholder={t('member.password')}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                required
              />
            </div>

            <motion.button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold text-white cursor-pointer"
              style={{ backgroundColor: 'var(--accent)' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLogin ? t('member.login') : t('member.register')}
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => {
                setForm({ ...form, email: 'admin', password: '123' });
                setIsLogin(true);
              }}
              className="w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              <Lock size={14} />
              {lang === 'pt' ? 'Entrar como Administrador' : 'Login as Administrator'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Logged in member area
  const tabs = [
    { key: 'prayer', label: t('member.prayer_wall'), icon: <Heart size={16} /> },
    { key: 'ranking', label: t('member.ranking'), icon: <Trophy size={16} /> },
    {
      key: 'materials',
      label: t('member.materials'),
      icon: (
        <div className="relative">
          <FileText size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-pulse">
              {unreadCount}
            </span>
          )}
        </div>
      )
    },
    { key: 'biblia', label: lang === 'pt' ? 'Bíblia Online' : 'Online Bible', icon: <BookOpen size={16} /> },
  ];

  if (user.role === 'admin') {
    tabs.push({ key: 'admin', label: lang === 'pt' ? 'Administração' : 'Management', icon: <User size={16} /> });
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header Banner */}
      <section
        className="py-16 px-4 text-white relative"
        style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-6">
          <motion.div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
            style={{ backgroundColor: 'var(--accent)' }}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            {user.name.charAt(0).toUpperCase()}
          </motion.div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">{user.name}</h1>
            <p className="opacity-80 text-sm">{user.email}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1 text-sm">
                <Coins size={16} className="text-yellow-300" />
                {user.coins} {t('member.coins')}
              </span>
              <span className="px-3 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                {user.role === 'admin' ? 'Admin' : user.role === 'leader' ? (lang === 'pt' ? 'Líder' : 'Leader') : (lang === 'pt' ? 'Membro' : 'Member')}
              </span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full"><path d="M0,30 C480,60 960,0 1440,30 L1440,60 L0,60Z" fill="var(--bg-primary)" /></svg>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map(tab => (
            <motion.button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
              style={{
                backgroundColor: activeTab === tab.key ? 'var(--accent)' : 'var(--bg-secondary)',
                color: activeTab === tab.key ? 'white' : 'var(--text-primary)',
                border: `1px solid ${activeTab === tab.key ? 'var(--accent)' : 'var(--border)'}`,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {tab.icon}
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Prayer Wall */}
        {activeTab === 'prayer' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Prayer Input */}
            <div
              className="rounded-2xl p-6 mb-6"
              style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}
            >
              <textarea
                value={prayerText}
                onChange={(e) => setPrayerText(e.target.value)}
                placeholder={t('member.prayer_placeholder')}
                className="w-full p-4 rounded-xl text-sm resize-none outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', minHeight: '100px' }}
              />
              <div className="flex justify-end mt-3">
                <motion.button
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)' }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendPrayer}
                  disabled={loadingPrayers}
                >
                  <Send size={14} /> {loadingPrayers ? (lang === 'pt' ? 'Enviando...' : 'Sending...') : t('member.prayer_send')}
                </motion.button>
              </div>
            </div>

            {/* Prayer Cards */}
            <div className="space-y-4">
              {prayers.map((prayer, i) => (
                <motion.div
                  key={prayer.id}
                  className="rounded-2xl p-5"
                  style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      {prayer.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{prayer.name}</span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>• {prayer.time}</span>
                      </div>
                      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                        {getLocalized(prayer.text, lang)}
                      </p>
                      <div className="flex items-center gap-3">
                        <motion.button
                          onClick={() => handlePray(prayer.id, prayer.prayers_count || 0)}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Heart size={12} /> {t('member.prayed')}
                        </motion.button>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {prayer.prayers_count || 0} {t('member.prayers_count')}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Ranking */}
        {activeTab === 'ranking' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}
            >
              {ranking.map((r, i) => (
                <motion.div
                  key={r.id || i}
                  className="flex items-center gap-4 px-6 py-4"
                  style={{ borderBottom: i < ranking.length - 1 ? '1px solid var(--border)' : 'none' }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      backgroundColor: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--bg-secondary)',
                      color: i < 3 ? 'white' : 'var(--text-primary)',
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xl">{r.avatar_url || '😇'}</span>
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-sm" style={{ color: 'var(--accent)' }}>
                    <Coins size={16} /> {r.score || 0}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
        {/* Bíblia Online */}
        {activeTab === 'biblia' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <BiblePage onMarkingSaved={() => {
              if (user) loadAnnotations(user.id);
              setActiveTab('materials');
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3000);
            }} />
          </motion.div>
        )}

        {/* Materials & Annotations */}
        {activeTab === 'materials' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* Bible Annotations Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <StickyNote size={20} className="text-[var(--accent)]" />
                  {lang === 'pt' ? 'Minhas Anotações Bíblicas' : 'My Bible Annotations'}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-[var(--accent-light)] text-[var(--accent)] font-bold">
                    {bibleAnnotations.length} {lang === 'pt' ? 'Salvas' : 'Saved'}
                  </span>
                  <button
                    onClick={() => setPaletteEditorOpen(true)}
                    className="p-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all shadow-sm flex items-center gap-2 text-[10px] font-bold"
                  >
                    <Palette size={14} /> {lang === 'pt' ? 'Editar Paleta' : 'Edit Palette'}
                  </button>
                </div>
              </div>

              {bibleAnnotations.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-[var(--border)] opacity-40">
                  <BookOpen size={48} className="mx-auto mb-3" />
                  <p className="text-sm font-medium">
                    {lang === 'pt' ? 'Ainda não há anotações. Use a Bíblia Online para marcar versículos!' : 'No annotations yet. Use the Online Bible to mark verses!'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {bibleAnnotations.map((ann, i) => (
                    <motion.div
                      key={ann.id}
                      className="rounded-2xl p-5 relative overflow-hidden group"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        boxShadow: '0 4px 20px var(--shadow)',
                        border: '1px solid var(--border)',
                      }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      {/* Color bar supports gradients */}
                      <div className="absolute top-0 left-0 w-1.5 h-full z-10" style={{ background: ann.color || 'var(--accent)' }} />

                      {/* Subtle gradient overlay for card background if it's a gradient */}
                      {(ann.color || '').includes('gradient') && (
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ background: ann.color }} />
                      )}

                      <div className="relative z-0 flex justify-between items-start mb-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider opacity-50 mb-1" style={{ color: 'var(--accent)' }}>
                            {ann.book_name} {ann.chapter}:{ann.verse}
                          </p>
                          <p className="text-sm font-serif italic italic opacity-80" style={{ color: 'var(--text-primary)' }}>
                            "{ann.verse_text}"
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(ann)}
                            className="p-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteAnnotation(ann.id)}
                            className="p-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--view-item-red, #ef4444)] hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {ann.photo_url && (
                        <div className="mb-3 rounded-xl overflow-hidden max-h-40 border border-[var(--border)]">
                          <img src={ann.photo_url} alt="Bible moment" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div className="p-3 rounded-xl bg-[var(--bg-secondary)] mb-3" style={{ border: '1px solid var(--border)' }}>
                        <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {ann.annotation || (lang === 'pt' ? 'Sem anotação pessoal.' : 'No personal annotation.')}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1 border-t border-[var(--border)] mt-2">
                        <button onClick={() => handleShare('wa', ann)} className="flex-1 py-1.5 rounded-lg border border-[var(--border)] text-[9px] font-bold flex items-center justify-center gap-1 hover:bg-[#25D366] hover:text-white transition-all">
                          <MessageCircle size={10} /> WhatsApp
                        </button>
                        <button onClick={() => handleShare('image', ann)} disabled={sharing} className="flex-1 py-1.5 rounded-lg border border-[var(--border)] text-[9px] font-bold flex items-center justify-center gap-1 hover:bg-black hover:text-white transition-all disabled:opacity-50">
                          {sharing && shareItem?.id === ann.id ? <div className="w-2.5 h-2.5 border border-white/30 border-t-white rounded-full animate-spin" /> : <><ImageIcon size={10} /> Imagem</>}
                        </button>
                        <button onClick={() => handleShare('copy', ann)} className="flex-1 py-1.5 rounded-lg border border-[var(--border)] text-[9px] font-bold flex items-center justify-center gap-1 hover:bg-gray-100 transition-all">
                          <Copy size={10} /> Copiar
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[10px] opacity-40 font-bold">
                        <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                        {!ann.is_read && (
                          <span className="flex items-center gap-1 text-red-500">
                            <Bell size={10} /> {lang === 'pt' ? 'Novo' : 'New'}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Exclusive Materials Section */}
            <div className="space-y-4 pt-4 border-t border-[var(--border)]">
              <h3 className="font-serif text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <FileText size={20} className="text-[var(--accent)]" />
                {lang === 'pt' ? 'Materiais de Estudo' : 'Study Materials'}
              </h3>

              {materials.length === 0 ? (
                <p className="text-sm opacity-40 italic">{lang === 'pt' ? 'Nenhum material disponível no momento.' : 'No materials available at the moment.'}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {materials.map((mat, i) => (
                    <motion.div
                      key={mat.id}
                      className="flex flex-col rounded-2xl overflow-hidden"
                      style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      whileHover={{ y: -5 }}
                    >
                      {mat.photo_url && (
                        <div className="w-full h-40 overflow-hidden">
                          <img src={mat.photo_url} alt={mat.title} className="w-full h-full object-cover transition-transform hover:scale-105" />
                        </div>
                      )}
                      <div className="p-5 flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                            <FileText size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{getLocalized(mat.title, lang)}</h4>
                            <p className="text-[10px] font-bold uppercase opacity-40" style={{ color: 'var(--text-secondary)' }}>{mat.type} • {mat.size}</p>
                          </div>
                        </div>
                        {mat.description && (
                          <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{getLocalized(mat.description, lang)}</p>
                        )}
                        <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                          <Share2
                            size={16}
                            className="opacity-20 hover:opacity-100 cursor-pointer transition-opacity"
                            onClick={() => {
                              const text = `Confira este material da Igreja Cristã: ${getLocalized(mat.title, lang)}\n${mat.url}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                          />
                          <motion.a
                            href={mat.url !== '#' ? mat.url : undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl cursor-pointer shadow-sm text-xs font-bold"
                            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Download size={14} /> {lang === 'pt' ? 'Baixar' : 'Download'}
                          </motion.a>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Admin Access Link */}
        {activeTab === 'admin' && user && user.role === 'admin' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div
              className="rounded-2xl p-8 text-center"
              style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 8px 40px var(--shadow)', border: '1px solid var(--border)' }}
            >
              <div className="w-16 h-16 rounded-2xl bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center mx-auto mb-4">
                <Settings size={32} />
              </div>
              <h3 className="font-serif text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {lang === 'pt' ? 'Área Administrativa' : 'Administrative Area'}
              </h3>
              <p className="text-sm opacity-60 mb-6 max-w-sm mx-auto">
                {lang === 'pt'
                  ? 'Você tem permissões de administrador. Clique no botão abaixo para gerenciar o conteúdo, membros e configurações da igreja.'
                  : 'You have administrative permissions. Click the button below to manage church content, members, and settings.'}
              </p>
              <motion.button
                onClick={() => window.location.hash = '#admin'}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white cursor-pointer"
                style={{ backgroundColor: 'var(--accent)' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Lock size={18} />
                {lang === 'pt' ? 'Acessar Painel Agora' : 'Access Panel Now'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Edit Annotation Modal */}
      <AnimatePresence>
        {editItem && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditItem(null)}
            />
            <motion.div
              className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
            >
              <div className="relative px-6 py-5 border-b border-[var(--border)] overflow-hidden">
                {editItem.color.includes('gradient') && (
                  <div className="absolute inset-0 opacity-[0.12] pointer-events-none" style={{ background: editItem.color }} />
                )}
                {!editItem.color.includes('gradient') && (
                  <div className="absolute inset-0 opacity-[0.12] pointer-events-none" style={{ background: editItem.color }} />
                )}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shadow-sm">
                      <Edit3 size={20} />
                    </div>
                    <div>
                      <h3 className="font-serif font-black text-lg" style={{ color: 'var(--text-primary)' }}>
                        {lang === 'pt' ? 'Editar Anotação' : 'Edit Annotation'}
                      </h3>
                      <p className="text-xs opacity-50 font-bold uppercase tracking-wider">{editItem.book_name} {editItem.chapter}:{editItem.verse}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditItem(null)} className="p-2 rounded-xl hover:bg-black/10 transition cursor-pointer">
                    <X size={20} style={{ color: 'var(--text-primary)' }} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="relative p-5 rounded-2xl bg-[var(--bg-secondary)] italic border border-[var(--border)] overflow-hidden">
                  {editItem.color.includes('gradient') && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: editItem.color }} />
                  )}
                  {!editItem.color.includes('gradient') && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: editItem.color }} />
                  )}
                  <p className="text-sm opacity-70 leading-relaxed font-serif pl-2" style={{ color: 'var(--text-primary)' }}>"{editItem.verse_text}"</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1 block mb-2">
                      {lang === 'pt' ? 'Mudar Cor / Categoria' : 'Change Color / Category'}
                    </label>
                    <div className="flex gap-2 flex-wrap bg-[var(--bg-secondary)] p-3 rounded-2xl border border-[var(--border)]">
                      {palette.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setEditColor(p.value)}
                          className="w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center"
                          style={{
                            background: p.value,
                            borderColor: editColor === p.value ? 'var(--accent)' : 'transparent',
                            transform: editColor === p.value ? 'scale(1.1)' : 'scale(1)'
                          }}
                          title={p.label}
                        >
                          {editColor === p.value && <div className="w-1.5 h-1.5 bg-white rounded-full shadow" />}
                        </button>
                      ))}
                    </div>
                    {palette.find(p => p.value === editColor) && (
                      <p className="text-[10px] text-center mt-2 font-bold opacity-40">{palette.find(p => p.value === editColor)?.label}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">
                      {lang === 'pt' ? 'Sua Reflexão' : 'Your Reflection'}
                    </label>
                    <textarea
                      value={editAnnotation}
                      onChange={(e) => setEditAnnotation(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-4 rounded-2xl text-sm outline-none resize-none focus:ring-2 focus:ring-[var(--accent)]/30 transition-all border border-[var(--border)]"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      placeholder={lang === 'pt' ? 'Escreva aqui o que Deus falou ao seu coração...' : 'Write here what God spoke to your heart...'}
                    />
                  </div>
                </div>

                {editItem.photo_url && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">
                      {lang === 'pt' ? 'Foto Registrada' : 'Captured Photo'}
                    </label>
                    <div className="rounded-2xl overflow-hidden h-32 border border-[var(--border)]">
                      <img src={editItem.photo_url} alt="Bible moment" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                <motion.button
                  onClick={handleUpdateAnnotation}
                  disabled={editSaving}
                  className="w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent-light)] cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {editSaving ? (
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Save size={20} /> {lang === 'pt' ? 'Atualizar na Bíblia' : 'Update in Bible'}</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[2000] px-6 py-3 rounded-full bg-green-500 text-white font-bold shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 size={18} />
            {lang === 'pt' ? 'Alteração salva com sucesso!' : 'Successfully updated!'}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Hidden element for image capture */}
      {shareItem && (
        <div className="fixed -left-[5000px] top-0 pointer-events-none">
          <div ref={shareCardRef} className="w-[400px] p-10 bg-white" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white text-xl">✝️</div>
              <div>
                <h4 className="font-bold text-lg text-gray-800">Igreja Cristã</h4>
                <p className="text-xs text-[var(--accent)] font-black uppercase tracking-widest">Vivendo a Palavra</p>
              </div>
            </div>
            <div className="relative mb-8 pl-6">
              {shareItem.color.includes('gradient') ? (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-full" style={{ background: shareItem.color }} />
              ) : (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-full" style={{ backgroundColor: shareItem.color }} />
              )}
              <p className="text-2xl leading-relaxed italic text-gray-700">"{shareItem.verse_text}"</p>
              <p className="mt-4 font-black text-gray-900 text-sm uppercase tracking-wider">{shareItem.book_name} {shareItem.chapter}:{shareItem.verse}</p>
            </div>
            {shareItem.annotation && (
              <div className="mb-8 p-5 bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-[10px] uppercase font-black opacity-30 mb-2">Reflexão Pessoal</p>
                <p className="text-sm text-gray-600 italic">"{shareItem.annotation}"</p>
              </div>
            )}
            {shareItem.photo_url && (
              <div className="mb-8 rounded-3xl overflow-hidden shadow-lg">
                <img src={shareItem.photo_url} alt="photo" className="w-full h-48 object-cover" />
              </div>
            )}
            <div className="pt-6 border-t border-gray-100 items-center justify-between flex">
              <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">igrejacrista.com.br</p>
              <p className="text-[10px] text-gray-300">{new Date(shareItem.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
      {/* Palette Editor Modal */}
      <AnimatePresence>
        {paletteEditorOpen && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (editingPaletteItem) setEditingPaletteItem(null);
                else setPaletteEditorOpen(false);
              }}
            />
            <motion.div
              className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <Palette size={18} className="text-[var(--accent)]" />
                  <h3 className="font-serif font-black text-base" style={{ color: 'var(--text-primary)' }}>Personalizar Paleta</h3>
                </div>
                <button onClick={() => setPaletteEditorOpen(false)} className="p-2 rounded-xl hover:bg-[var(--bg-secondary)] transition">
                  <X size={18} style={{ color: 'var(--text-primary)' }} />
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                {palette.map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center gap-3 p-3 rounded-2xl border border-[var(--border)] group hover:bg-[var(--bg-secondary)] transition-all">
                    <div className="w-10 h-10 rounded-xl shadow-inner shrink-0" style={{ background: item.value }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black truncate" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                      <p className="text-[10px] opacity-40 font-mono uppercase">{item.value.includes('gradient') ? 'Gradiente' : item.value}</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingPaletteItem(item);
                        setTempLabel(item.label);
                        setTempColor(item.value);
                      }}
                      className="p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--accent)] hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    >
                      <PenLine size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Edit Item Inner View */}
              <AnimatePresence>
                {editingPaletteItem && (
                  <motion.div
                    className="absolute inset-0 bg-[var(--bg-card)] z-10 p-8 flex flex-col"
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="font-black text-sm uppercase tracking-widest opacity-40">Editar Marcador</h4>
                      <button onClick={() => setEditingPaletteItem(null)} className="p-2 rounded-xl hover:bg-[var(--bg-secondary)]"><X size={20} /></button>
                    </div>

                    <div className="space-y-6 flex-1">
                      <div>
                        <label className="text-[10px] font-black uppercase opacity-40 block mb-2">Nome</label>
                        <input
                          value={tempLabel}
                          onChange={e => setTempLabel(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase opacity-40 block mb-2">Cor (Hex)</label>
                        <input
                          value={tempColor}
                          onChange={e => setTempColor(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] font-mono outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                        />
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'].map(c => (
                          <button key={c} onClick={() => setTempColor(c)} className="aspect-square rounded-lg" style={{ background: c }} />
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleSavePaletteItem}
                      className="w-full py-4 rounded-2xl bg-[var(--accent)] text-white font-bold shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      Salvar Marcador
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-6 border-t border-[var(--border)] flex justify-between">
                <button onClick={handleResetPalette} className="text-[10px] font-black text-red-500/60 uppercase hover:text-red-500 transition-colors">Resetar Padrão</button>
                <div className="flex items-center gap-1 opacity-20"><div className="w-1 h-1 bg-[var(--accent)] rounded-full" /><p className="text-[10px] font-bold">Igreja Cristã</p></div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
