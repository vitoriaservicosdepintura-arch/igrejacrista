import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Mail, Phone, Church, Lock, Coins, Trophy, Download, Heart, Send, BookOpen, FileText, Settings, StickyNote, Trash2, Edit3, X, Save, Bell, CheckCircle2, Share2, MessageCircle, Copy, Image as ImageIcon, Palette, PenLine, Camera, Play } from 'lucide-react';
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
  const { t, lang, user, login, register, setUser } = useApp();
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
  const [editMaterialItem, setEditMaterialItem] = useState<any | null>(null);
  const [editMaterialSaving, setEditMaterialSaving] = useState(false);
  const [paletteEditorOpen, setPaletteEditorOpen] = useState(false);
  const [editingPaletteItem, setEditingPaletteItem] = useState<any | null>(null);
  const [tempLabel, setTempLabel] = useState('');
  const [tempColor, setTempColor] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareItem, setShareItem] = useState<any | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [matSharing, setMatSharing] = useState(false);
  const [matShareItem, setMatShareItem] = useState<any | null>(null);
  const matShareCardRef = useRef<HTMLDivElement>(null);

  // Profile Editor state
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  // Church branding (now from AppContext)
  const { churchSettings } = useApp();
  const churchName = churchSettings.church_name;
  const churchLogoUrl = churchSettings.logo_url || 'https://tglyfpdmgbpcdygjksyr.supabase.co/storage/v1/object/public/images/logos/bhb4rqr4hd5-1772378575307.jpg';
  const churchInstagram = churchSettings.instagram;
  // Edit material photo upload
  const [editMatPhotoFile, setEditMatPhotoFile] = useState<File | null>(null);
  const [editMatPhotoPreview, setEditMatPhotoPreview] = useState<string | null>(null);
  const editMatPhotoRef = useRef<HTMLInputElement>(null);

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

  const loadMaterials = async (uid: string) => {
    const { data } = await supabase
      .from('exclusive_materials')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (data) setMaterials(data);
  };

  const loadProfile = async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
    if (data) {
      setUserProfile(data);
      setAvatarPreview(data.avatar_url);
    }
  };


  useEffect(() => {
    if (user) {
      const fetchMemberData = async () => {
        const [pwRes, rkRes] = await Promise.all([
          supabase.from('prayer_wall').select('*').order('created_at', { ascending: false }).limit(20),
          supabase.from('quiz_players').select('*').order('score', { ascending: false }).limit(20),
        ]);
        if (pwRes.data) setPrayers(pwRes.data);
        if (rkRes.data) setRanking(rkRes.data);
        await Promise.all([
          loadAnnotations(user.id),
          loadPalette(user.id),
          loadMaterials(user.id),
          loadProfile(user.id),
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

  const handleShareMaterial = async (type: 'wa' | 'fb' | 'ig' | 'copy' | 'image', mat: any) => {
    const verse = mat.book_name ? `${mat.book_name} ${mat.chapter}:${mat.verse}` : '';
    const desc = mat.description ? mat.description.replace(/\n/g, ' ').substring(0, 200) : '';
    const text = `✝️ ${mat.title}\n${verse ? verse + '\n' : ''}${desc ? desc + '\n' : ''}\n${churchName} – Vivendo a Palavra\n${window.location.origin}`;

    if (type === 'wa') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else if (type === 'fb') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(text)}`, '_blank');
    } else if (type === 'ig') {
      // Open user's Instagram profile if saved, otherwise church's or default
      const igUrl = userProfile?.social_instagram || churchInstagram || 'https://www.instagram.com';
      window.open(igUrl.startsWith('http') ? igUrl : `https://www.instagram.com/${igUrl.replace('@', '')}`, '_blank');
    } else if (type === 'copy') {
      await navigator.clipboard.writeText(text);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } else if (type === 'image') {
      setMatShareItem(mat);
      setTimeout(async () => {
        if (!matShareCardRef.current) return;
        setMatSharing(true);
        try {
          const dataUrl = await (await import('html-to-image')).toPng(matShareCardRef.current, { cacheBust: true, quality: 0.98, backgroundColor: 'white' });
          const link = document.createElement('a');
          link.download = `marcacao-${(mat.title || 'biblica').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
          link.href = dataUrl;
          link.click();
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch (err) {
          console.error('Erro ao gerar imagem', err);
        } finally {
          setMatSharing(false);
          setMatShareItem(null);
        }
      }, 120);
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

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm(lang === 'pt' ? 'Excluir esta marcação/material?' : 'Delete this marking/material?')) return;
    const { error } = await supabase.from('exclusive_materials').delete().eq('id', id);
    if (!error) {
      setMaterials(prev => prev.filter(m => m.id !== id));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } else {
      console.error('Falha ao excluir', error);
      alert('Erro ao excluir material.');
    }
  };

  const handleUpdateMaterial = async () => {
    if (!editMaterialItem || !user) return;
    setEditMaterialSaving(true);
    try {
      let photo_url = editMaterialItem.photo_url;

      // Upload new photo if selected
      if (editMatPhotoFile) {
        const ext = editMatPhotoFile.name.split('.').pop() || 'jpg';
        const path = `${user.id}/mat-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('bible-photos')
          .upload(path, editMatPhotoFile, { upsert: true });
        if (!upErr) {
          const { data: ud } = supabase.storage.from('bible-photos').getPublicUrl(path);
          photo_url = ud.publicUrl;
        } else {
          console.warn('Falha no upload da foto (continuando sem ela):', upErr);
        }
      }

      // Build only the columns that exist in the table
      const updatePayload: Record<string, any> = {
        title: editMaterialItem.title || '',
        description: editMaterialItem.description || '',
        photo_url: photo_url || null,
        updated_at: new Date().toISOString(),
      };

      const { error, data } = await supabase
        .from('exclusive_materials')
        .update(updatePayload)
        .eq('id', editMaterialItem.id)
        .eq('user_id', user.id);

      if (!error) {
        // Refresh materials list locally
        setMaterials(prev => prev.map(m => m.id === editMaterialItem.id ? { ...m, ...updatePayload } : m));
        setEditMaterialItem(null);
        setEditMatPhotoFile(null);
        setEditMatPhotoPreview(null);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        console.error('Erro ao atualizar material:', error);
        alert(`Erro ao salvar: ${error.message || 'Tente novamente.'}`);
      }
    } catch (err: any) {
      console.error('Catch error update material:', err);
      alert('Erro inesperado: ' + (err.message || 'Erro no servidor'));
    } finally {
      setEditMaterialSaving(false);
    }
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
      <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:py-20" style={{ backgroundColor: 'var(--bg-secondary)', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}>
        <motion.div
          className="w-full max-w-md rounded-3xl p-6 sm:p-8"
          style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 8px 40px var(--shadow)', border: '1px solid var(--border)' }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-center mb-6 sm:mb-8">
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
                    <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
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
    { key: 'profile', label: lang === 'pt' ? 'Meu Perfil' : 'My Profile', icon: <Settings size={16} /> },
  ];

  if (user.role === 'admin') {
    tabs.push({ key: 'admin', label: lang === 'pt' ? 'Administração' : 'Management', icon: <UserIcon size={16} /> });
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header Banner */}
      <section
        className="pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}
      >
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-[100px]" />
          <div className="absolute top-1/2 -right-24 w-64 h-64 bg-[var(--accent)] rounded-full blur-[80px]" />
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
            <motion.div
              onClick={() => setActiveTab('profile')}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center text-4xl font-black shrink-0 border-4 border-white/30 shadow-2xl bg-white/10 backdrop-blur-md overflow-hidden relative group cursor-pointer"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
            >
              {(userProfile?.avatar_url || avatarPreview) ? (
                <img
                  src={avatarPreview || userProfile?.avatar_url}
                  alt={userProfile?.name || user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="drop-shadow-lg">{(userProfile?.name || user.name).charAt(0).toUpperCase()}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Settings size={28} className="text-white" />
              </div>
            </motion.div>

            <div className="text-center md:text-left flex-1 min-w-0">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                  <h1 className="font-serif text-3xl sm:text-5xl font-black tracking-tight drop-shadow-md truncate">
                    {userProfile?.name || user.name}
                  </h1>
                  {user.role === 'admin' && (
                    <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg" title="Perfil Verificado">
                      <CheckCircle2 size={18} className="text-yellow-400" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 opacity-80 mb-6 flex-wrap justify-center md:justify-start">
                  <p className="text-sm font-medium tracking-wide flex items-center gap-2">
                    <Mail size={14} className="opacity-50" /> {userProfile?.email || user.email}
                  </p>
                  {userProfile?.phone && (
                    <>
                      <span className="hidden md:block opacity-30">•</span>
                      <p className="text-sm font-medium tracking-wide flex items-center gap-2">
                        <Phone size={14} className="opacity-50" /> {userProfile.phone}
                      </p>
                    </>
                  )}
                  <span className="hidden md:block opacity-30">•</span>
                  <div className="flex items-center gap-3">
                    {userProfile?.social_instagram && (
                      <a href={userProfile.social_instagram.startsWith('http') ? userProfile.social_instagram : `https://instagram.com/${userProfile.social_instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition-colors">
                        <ImageIcon size={16} />
                      </a>
                    )}
                    {userProfile?.social_facebook && (
                      <a href={userProfile.social_facebook.startsWith('http') ? userProfile.social_facebook : `https://facebook.com/${userProfile.social_facebook}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                        <MessageCircle size={16} />
                      </a>
                    )}
                    {userProfile?.social_youtube && (
                      <a href={userProfile.social_youtube.startsWith('http') ? userProfile.social_youtube : `https://youtube.com/${userProfile.social_youtube}`} target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition-colors">
                        <Play size={16} />
                      </a>
                    )}
                  </div>
                  <span className="hidden md:block opacity-30">•</span>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                    ID: {user.id.substring(0, 8)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <motion.div
                    className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[11px] font-black bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 shadow-inner"
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(250, 204, 21, 0.3)' }}
                  >
                    <Coins size={14} />
                    {userProfile?.coins ?? user.coins} {t('member.coins').toUpperCase()}
                  </motion.div>

                  <div
                    className="px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white/10 backdrop-blur-md border border-white/20 shadow-lg"
                  >
                    {user.role === 'admin' ? '🛡️ Administrador' : user.role === 'leader' ? (lang === 'pt' ? '🔥 Líder' : '🔥 Leader') : (lang === 'pt' ? '💎 Membro' : '💎 Member')}
                  </div>

                  <motion.button
                    onClick={() => setActiveTab('profile')}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/20 shadow-lg backdrop-blur-md cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Settings size={16} className="text-white" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{lang === 'pt' ? 'Configuração' : 'Settings'}</span>
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Dynamic bottom curve */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full h-auto translate-y-[2px]">
            <path d="M0,40 C320,80 420,-10 1440,40 L1440,80 L0,80Z" fill="var(--bg-primary)" />
          </svg>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {tabs.map(tab => (
            <motion.button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0"
              style={{
                backgroundColor: activeTab === tab.key ? 'var(--accent)' : 'var(--bg-card)',
                color: activeTab === tab.key ? 'white' : 'var(--text-primary)',
                border: `1px solid ${activeTab === tab.key ? 'var(--accent)' : 'var(--border)'}`,
                boxShadow: activeTab === tab.key ? '0 10px 20px -5px var(--accent-light)' : 'none',
              }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              {tab.icon}
              <span className="whitespace-nowrap">{tab.label}</span>
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

        {/* Profile Editor */}
        {activeTab === 'profile' && userProfile && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {lang === 'pt' ? 'Seu Perfil' : 'Your Profile'}
                </h1>
                <p className="text-xs opacity-50 font-medium">#{user.id?.slice(0, 8)}</p>
              </div>

              <div className="p-8 rounded-3xl" style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 8px 40px var(--shadow)', border: '1px solid var(--border)' }}>
                <div className="flex flex-col md:flex-row gap-10">
                  {/* Photo Upload Side */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-[var(--accent)] shadow-xl bg-[var(--bg-secondary)]">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl font-bold opacity-30">
                            {userProfile.name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute -bottom-2 -right-2 p-3 rounded-2xl bg-[var(--accent)] text-white shadow-lg hover:scale-110 transition cursor-pointer"
                      >
                        <Camera size={18} />
                      </button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewAvatarFile(file);
                            const reader = new FileReader();
                            reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center">
                      {lang === 'pt' ? 'Foto de Perfil' : 'Profile Photo'}
                    </p>
                  </div>

                  {/* Fields Side */}
                  <div className="flex-1 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">
                          {lang === 'pt' ? 'Nome' : 'Name'}
                        </label>
                        <div className="relative">
                          <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                          <input
                            type="text"
                            value={userProfile.name || ''}
                            onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none border border-[var(--border)] focus:ring-2 focus:ring-[var(--accent)]/30 transition-all shadow-sm"
                            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">
                          Email
                        </label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                          <input
                            type="email"
                            value={userProfile.email || user.email}
                            disabled
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none border border-[var(--border)] opacity-50 cursor-not-allowed"
                            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">
                          {lang === 'pt' ? 'Telefone' : 'Phone'}
                        </label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                          <input
                            type="tel"
                            value={userProfile.phone || ''}
                            onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none border border-[var(--border)] focus:ring-2 focus:ring-[var(--accent)]/30 transition-all shadow-sm"
                            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">
                          {lang === 'pt' ? 'Instagram (Link)' : 'Instagram (Link)'}
                        </label>
                        <div className="relative">
                          <ImageIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                          <input
                            type="text"
                            placeholder="https://instagram.com/..."
                            value={userProfile.social_instagram || ''}
                            onChange={(e) => setUserProfile({ ...userProfile, social_instagram: e.target.value })}
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none border border-[var(--border)] focus:ring-2 focus:ring-[var(--accent)]/30 transition-all shadow-sm"
                            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">
                          {lang === 'pt' ? 'Facebook (Link)' : 'Facebook (Link)'}
                        </label>
                        <div className="relative">
                          <MessageCircle size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                          <input
                            type="text"
                            placeholder="https://facebook.com/..."
                            value={userProfile.social_facebook || ''}
                            onChange={(e) => setUserProfile({ ...userProfile, social_facebook: e.target.value })}
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none border border-[var(--border)] focus:ring-2 focus:ring-[var(--accent)]/30 transition-all shadow-sm"
                            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">
                          {lang === 'pt' ? 'YouTube (Link)' : 'YouTube (Link)'}
                        </label>
                        <div className="relative">
                          <Play size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                          <input
                            type="text"
                            placeholder="https://youtube.com/..."
                            value={userProfile.social_youtube || ''}
                            onChange={(e) => setUserProfile({ ...userProfile, social_youtube: e.target.value })}
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none border border-[var(--border)] focus:ring-2 focus:ring-[var(--accent)]/30 transition-all shadow-sm"
                            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <motion.button
                        disabled={profileSaving}
                        onClick={async () => {
                          setProfileSaving(true);
                          try {
                            let avatarUrl = userProfile.avatar_url;

                            if (newAvatarFile) {
                              const ext = newAvatarFile.name.split('.').pop();
                              const filePath = `${user.id}-${Date.now()}.${ext}`;
                              const { error: uploadError } = await supabase.storage
                                .from('avatars')
                                .upload(filePath, newAvatarFile, { upsert: true });

                              if (uploadError) throw uploadError;

                              const { data: { publicUrl } } = supabase.storage
                                .from('avatars')
                                .getPublicUrl(filePath);
                              avatarUrl = publicUrl;
                            }

                            const { error } = await supabase
                              .from('profiles')
                              .update({
                                name: userProfile.name,
                                phone: userProfile.phone,
                                avatar_url: avatarUrl,
                                social_instagram: userProfile.social_instagram,
                                social_facebook: userProfile.social_facebook,
                                social_youtube: userProfile.social_youtube,
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', user.id);

                            if (error) throw error;

                            // Update global app state for consistency
                            setUser({ ...user, name: userProfile.name });

                            alert(lang === 'pt' ? 'Perfil atualizado com sucesso!' : 'Profile updated successfully!');
                            setUserProfile({ ...userProfile, avatar_url: avatarUrl });
                            setNewAvatarFile(null);
                          } catch (err: any) {
                            console.error(err);
                            alert('Erro ao salvar: ' + err.message);
                          } finally {
                            setProfileSaving(false);
                          }
                        }}
                        className="w-full py-4 rounded-2xl font-black text-white shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                        style={{ backgroundColor: 'var(--accent)' }}
                        whileHover={{ scale: 1.02, boxShadow: '0 8px 30px var(--accent-light)' }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {profileSaving ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <><Save size={18} /> {lang === 'pt' ? 'Salvar Meu Perfil' : 'Save My Profile'}</>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
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
              if (user) {
                loadAnnotations(user.id);
                loadMaterials(user.id);
              }
              setActiveTab('materials');
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3000);
            }} />
          </motion.div>
        )}

        {/* Materials & Annotations */}
        {activeTab === 'materials' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

            {/* Minhas Anotações Bíblicas (Exclusive Materials) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <StickyNote size={20} className="text-[var(--accent)]" />
                  {lang === 'pt' ? 'Minhas Anotações Bíblicas' : 'My Bible Annotations'}
                </h3>
                <span className="text-xs px-2 py-1 rounded-full bg-[var(--accent-light)] text-[var(--accent)] font-bold">
                  {materials.length} {lang === 'pt' ? 'Salvas' : 'Saved'}
                </span>
              </div>

              {materials.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-[var(--border)] opacity-40">
                  <BookOpen size={48} className="mx-auto mb-3" />
                  <p className="text-sm font-medium">
                    {lang === 'pt' ? 'Nenhuma marcação salva ainda. Use a Bíblia Online para marcar versículos!' : 'No markings saved yet. Use the Online Bible to mark verses!'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {materials.map((mat, i) => (
                    <motion.div
                      key={mat.id}
                      className="rounded-2xl overflow-hidden relative"
                      style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.07 }}
                    >
                      {/* Color bar */}
                      <div className="absolute top-0 left-0 w-1.5 h-full z-10" style={{ background: mat.color || 'var(--accent)' }} />

                      {/* Photo */}
                      {mat.photo_url && (
                        <div className="w-full h-44 overflow-hidden">
                          <img src={mat.photo_url} alt={mat.title} className="w-full h-full object-cover transition-transform hover:scale-105" />
                        </div>
                      )}

                      <div className="p-5 pl-6 flex flex-col gap-3 relative">
                        {/* Church Watermark in Card */}
                        <div className="absolute top-4 right-4 w-10 h-10 opacity-20 group-hover:opacity-100 transition-opacity">
                          <img src={churchLogoUrl} alt="logo" className="w-full h-full object-contain filter grayscale" />
                        </div>

                        {/* Verse reference */}
                        {mat.book_name && (
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--accent)' }}>
                            {mat.book_name} {mat.chapter}:{mat.verse}
                          </p>
                        )}

                        {/* Title */}
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-bold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>{mat.title}</h4>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => setEditMaterialItem(mat)}
                              className="p-1.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteMaterial(mat.id)}
                              className="p-1.5 rounded-lg bg-[var(--bg-secondary)] text-red-400 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Description / annotation */}
                        {mat.description && (
                          <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                              {mat.description.substring(0, 240)}{mat.description.length > 240 ? '...' : ''}
                            </p>
                          </div>
                        )}

                        {/* Date */}
                        <p className="text-[10px] opacity-40 font-bold">{new Date(mat.created_at).toLocaleDateString()}</p>

                        {/* Share buttons - 5 cols */}
                        <div className="grid grid-cols-5 gap-1.5 pt-1 border-t border-[var(--border)]">
                          <button
                            onClick={() => handleShareMaterial('wa', mat)}
                            className="py-2 rounded-xl border border-[var(--border)] text-[9px] font-bold flex flex-col items-center justify-center gap-1 hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-all cursor-pointer"
                          >
                            <MessageCircle size={13} />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => handleShareMaterial('fb', mat)}
                            className="py-2 rounded-xl border border-[var(--border)] text-[9px] font-bold flex flex-col items-center justify-center gap-1 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-all cursor-pointer"
                          >
                            <Share2 size={13} />
                            <span>Facebook</span>
                          </button>
                          <button
                            onClick={() => handleShareMaterial('ig', mat)}
                            disabled={matSharing && matShareItem?.id === mat.id}
                            className="py-2 rounded-xl border border-[var(--border)] text-[9px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                            style={{ background: 'none' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', e.currentTarget.style.color = 'white', e.currentTarget.style.borderColor = 'transparent')}
                            onMouseLeave={e => (e.currentTarget.style.background = '', e.currentTarget.style.color = '', e.currentTarget.style.borderColor = '')}
                          >
                            <ImageIcon size={13} />
                            <span>Instagram</span>
                          </button>
                          <button
                            onClick={() => handleShareMaterial('copy', mat)}
                            className="py-2 rounded-xl border border-[var(--border)] text-[9px] font-bold flex flex-col items-center justify-center gap-1 hover:bg-[var(--bg-secondary)] transition-all cursor-pointer"
                          >
                            <Copy size={13} />
                            <span>Copiar</span>
                          </button>
                          <button
                            onClick={() => handleShareMaterial('image', mat)}
                            disabled={matSharing && matShareItem?.id === mat.id}
                            className="py-2 rounded-xl border border-[var(--border)] text-[9px] font-bold flex flex-col items-center justify-center gap-1 hover:bg-black hover:text-white hover:border-black transition-all cursor-pointer disabled:opacity-50"
                          >
                            {matSharing && matShareItem?.id === mat.id
                              ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                              : <Download size={13} />}
                            <span>Baixar</span>
                          </button>
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

      {/* Edit Material Modal */}
      <AnimatePresence>
        {editMaterialItem && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditMaterialItem(null)}
            />
            <motion.div
              className="relative w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '90vh' }}
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
            >
              {/* Header */}
              <div className="relative px-6 py-5 border-b border-[var(--border)] overflow-hidden shrink-0">
                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ background: editMaterialItem.color || 'var(--accent)' }} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shadow-sm">
                      <Edit3 size={20} />
                    </div>
                    <div>
                      <h3 className="font-serif font-black text-base" style={{ color: 'var(--text-primary)' }}>
                        {lang === 'pt' ? 'Editar Marcação' : 'Edit Marking'}
                      </h3>
                      {editMaterialItem.book_name && (
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--accent)' }}>
                          {editMaterialItem.book_name} {editMaterialItem.chapter}:{editMaterialItem.verse}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-[var(--border)] bg-white shrink-0">
                      <img src={churchLogoUrl} alt="church logo" className="w-full h-full object-contain" />
                    </div>
                    <button onClick={() => setEditMaterialItem(null)} className="p-2 rounded-xl hover:bg-black/10 transition cursor-pointer">
                      <X size={20} style={{ color: 'var(--text-primary)' }} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 p-6 space-y-5" style={{ scrollbarWidth: 'thin' }}>

                {/* Photo saved + Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1 block">
                    📸 {lang === 'pt' ? 'Foto da Marcação' : 'Marking Photo'}
                  </label>
                  {/* Current photo preview */}
                  {(editMatPhotoPreview || editMaterialItem.photo_url) && (
                    <div className="rounded-2xl overflow-hidden h-44 border border-[var(--border)] shadow-md relative">
                      <img
                        src={editMatPhotoPreview || editMaterialItem.photo_url}
                        alt="foto"
                        className="w-full h-full object-cover"
                      />
                      {editMatPhotoPreview && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-black px-2 py-1 rounded-full">
                          {lang === 'pt' ? 'Nova foto selecionada' : 'New photo selected'}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Upload button */}
                  <input
                    ref={editMatPhotoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setEditMatPhotoFile(f);
                      const reader = new FileReader();
                      reader.onload = ev => setEditMatPhotoPreview(ev.target?.result as string);
                      reader.readAsDataURL(f);
                    }}
                  />
                  <button
                    onClick={() => editMatPhotoRef.current?.click()}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-[var(--border)] text-[11px] font-bold flex items-center justify-center gap-2 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Camera size={16} />
                    {editMatPhotoFile
                      ? (lang === 'pt' ? 'Trocar foto novamente' : 'Change photo again')
                      : (lang === 'pt' ? 'Alterar / Adicionar Foto' : 'Change / Add Photo')}
                  </button>
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1 block">
                    {lang === 'pt' ? 'Título' : 'Title'}
                  </label>
                  <input
                    value={editMaterialItem.title || ''}
                    onChange={(e) => setEditMaterialItem({ ...editMaterialItem, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all border border-[var(--border)] focus:ring-2 focus:ring-[var(--accent)]/30"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  />
                </div>

                {/* Description / Annotation */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1 block">
                    ✏️ {lang === 'pt' ? 'Sua Reflexão / Anotação' : 'Your Reflection / Annotation'}
                  </label>
                  <textarea
                    value={editMaterialItem.description || ''}
                    onChange={(e) => setEditMaterialItem({ ...editMaterialItem, description: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-4 rounded-2xl text-sm outline-none resize-none focus:ring-2 focus:ring-[var(--accent)]/30 transition-all border border-[var(--border)]"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    placeholder={lang === 'pt' ? 'Escreva aqui o que Deus falou ao seu coração...' : 'Write here what God spoke to your heart...'}
                  />
                </div>

                {/* Sharing section - 5 buttons */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1 block">
                    {lang === 'pt' ? 'Compartilhar' : 'Share'}
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    <button
                      onClick={() => handleShareMaterial('wa', editMaterialItem)}
                      className="py-3 rounded-2xl border border-[var(--border)] text-[9px] font-bold flex flex-col items-center gap-1.5 hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-all cursor-pointer"
                    >
                      <MessageCircle size={17} />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => handleShareMaterial('fb', editMaterialItem)}
                      className="py-3 rounded-2xl border border-[var(--border)] text-[9px] font-bold flex flex-col items-center gap-1.5 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-all cursor-pointer"
                    >
                      <Share2 size={17} />
                      <span>Facebook</span>
                    </button>
                    <button
                      onClick={() => handleShareMaterial('ig', editMaterialItem)}
                      disabled={matSharing}
                      className="py-3 rounded-2xl border border-[var(--border)] text-[9px] font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      style={{ background: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', e.currentTarget.style.color = 'white', e.currentTarget.style.borderColor = 'transparent')}
                      onMouseLeave={e => (e.currentTarget.style.background = '', e.currentTarget.style.color = '', e.currentTarget.style.borderColor = '')}
                    >
                      <ImageIcon size={17} />
                      <span>Instagram</span>
                    </button>
                    <button
                      onClick={() => handleShareMaterial('copy', editMaterialItem)}
                      className="py-3 rounded-2xl border border-[var(--border)] text-[9px] font-bold flex flex-col items-center gap-1.5 hover:bg-[var(--bg-secondary)] transition-all cursor-pointer"
                    >
                      <Copy size={17} />
                      <span>Copiar</span>
                    </button>
                    <button
                      onClick={() => handleShareMaterial('image', editMaterialItem)}
                      disabled={matSharing}
                      className="py-3 rounded-2xl border border-[var(--border)] text-[9px] font-bold flex flex-col items-center gap-1.5 hover:bg-black hover:text-white hover:border-black transition-all cursor-pointer disabled:opacity-50"
                    >
                      {matSharing ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Download size={17} />}
                      <span>{lang === 'pt' ? 'Baixar' : 'Download'}</span>
                    </button>
                  </div>
                  <p className="text-[9px] opacity-30 text-center mt-1">
                    📸 {lang === 'pt' ? 'Instagram: baixe a foto e publique pelo aplicativo' : 'Instagram: download image and post via the app'}
                  </p>
                </div>

                <motion.button
                  onClick={handleUpdateMaterial}
                  disabled={editMaterialSaving}
                  className="w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {editMaterialSaving
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Save size={18} /> {lang === 'pt' ? 'Salvar Alterações' : 'Save Changes'}</>
                  }
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
      {/* Hidden share card for Material (Bible marking) - Full detail download image */}
      {matShareItem && (
        <div className="fixed -left-[9999px] top-0 pointer-events-none">
          <div
            ref={matShareCardRef}
            className="bg-white"
            style={{
              width: '540px',
              fontFamily: "'Georgia', 'Times New Roman', serif",
              boxShadow: '0 0 0 1px #e5e7eb',
            }}
          >
            {/* Color header stripe */}
            <div style={{ height: '8px', width: '100%', background: matShareItem.color || '#f59e0b' }} />

            {/* Church Header - Premium Style */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '24px 32px 20px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '20px', overflow: 'hidden', border: '3px solid #6366f1', flexShrink: 0, background: '#fff', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)' }}>
                <img
                  src={churchLogoUrl}
                  alt={churchName}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: '26px', color: '#111827', lineHeight: 1, letterSpacing: '-0.03em', fontFamily: 'serif' }}>{churchName}</div>
                <div style={{ fontWeight: 900, fontSize: '10px', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '6px', opacity: 1 }}>Igreja Cristã • Vivendo a Palavra</div>
              </div>
              {/* Instagram handle top right */}
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 900, textTransform: 'uppercase', opacity: 0.6 }}>Conecte-se</div>
                <div style={{ fontSize: '11px', color: '#111827', fontWeight: 800 }}>
                  {churchInstagram ? '@' + churchInstagram.replace(/.*instagram\.com\/([^?/]+).*/, '$1') : ''}
                </div>
              </div>
            </div>

            {/* Bible reference badge */}
            {matShareItem.book_name && (
              <div style={{ padding: '12px 28px 0' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: '#fffbeb', border: '1px solid #fde68a',
                  borderRadius: '999px', padding: '4px 12px'
                }}>
                  <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    ✝ {matShareItem.book_name} {matShareItem.chapter}:{matShareItem.verse}
                  </span>
                </div>
              </div>
            )}

            {/* Title */}
            <div style={{ padding: '14px 28px 10px' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#111827', lineHeight: 1.35 }}>
                {matShareItem.title}
              </div>
            </div>

            {/* Annotation / Description */}
            {matShareItem.description && (
              <div style={{ margin: '0 28px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '14px', padding: '14px 18px' }}>
                <div style={{ fontSize: '8px', fontWeight: 900, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>✏️ Reflexão Pessoal</div>
                <div style={{ fontSize: '13px', color: '#374151', fontStyle: 'italic', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                  &ldquo;{matShareItem.description}&rdquo;
                </div>
              </div>
            )}

            {/* Full original photo - no crop, full size */}
            {matShareItem.photo_url && (
              <div style={{ margin: '0 28px 20px', borderRadius: '14px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                <img
                  src={matShareItem.photo_url}
                  alt="foto da marcação"
                  style={{ width: '100%', display: 'block', objectFit: 'contain' }}
                />
              </div>
            )}

            {/* Color label strip */}
            <div style={{ margin: '0 28px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: matShareItem.color || '#f59e0b', border: '2px solid #e5e7eb', flexShrink: 0 }} />
              <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Marcação Bíblica Pessoal</div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 28px 18px', borderTop: '1px solid #f3f4f6'
            }}>
              <div style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Área de Membros • {churchName}
              </div>
              <div style={{ fontSize: '9px', color: '#9ca3af' }}>
                {new Date(matShareItem.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            </div>

            {/* Bottom color stripe */}
            <div style={{ height: '5px', width: '100%', background: matShareItem.color || '#f59e0b' }} />
          </div>
        </div>
      )}

      {/* Hidden element for image capture */}
      {shareItem && (
        <div className="fixed -left-[5000px] top-0 pointer-events-none">
          <div ref={shareCardRef} className="w-[400px] p-10 bg-white" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
            <div className="flex items-center gap-6 mb-8 border-b pb-8 border-gray-100 bg-gray-50/50 -mx-10 -mt-10 p-10">
              <div className="w-20 h-20 rounded-3xl overflow-hidden border-4 border-white flex-shrink-0 bg-white shadow-xl">
                <img src={churchLogoUrl} alt={churchName} className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="font-black text-2xl text-gray-900 leading-tight" style={{ fontFamily: 'serif' }}>{churchName}</h4>
                <p className="text-xs text-[#6366f1] font-black uppercase tracking-[0.2em] mt-2">Igreja Cristã • Vivendo a Palavra</p>
                <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  {churchInstagram ? '@' + churchInstagram.replace(/.*instagram\.com\/([^?/]+).*/, '$1') : 'Anotação Bíblica'}
                </div>
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
              <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Área de Membros • {churchName}</p>
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
