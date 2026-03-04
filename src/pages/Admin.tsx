import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, Calendar, Image, HelpCircle, UserCog, Settings, Plus, Edit, Trash2, Save, TrendingUp, Heart, Lock, Coins, LogOut, Bell, CheckCheck, X, Phone, MessageCircle, User as UserIcon, Clock, MapPin, Play, Mail, Image as ImageIcon, Star, Palette, CheckCircle2, ScanLine } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabase';
import MediaUpload from '../components/MediaUpload';

type AdminTab = 'dashboard' | 'members' | 'events' | 'gallery' | 'quiz' | 'leaders' | 'settings' | 'notifications' | 'my_profile';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  join_date: string;
  created_at?: string;
}

interface AdminProps {
  onNavigate: (page: any) => void;
}

export default function Admin({ onNavigate }: AdminProps) {
  const { t, lang, user, logout, login } = useApp();

  const handleGenerateRandomQuiz = () => {
    const randomBank = [
      { q: "Qual foi o primeiro milagre de Jesus?", o: ["Transformar água em vinho", "Cura do cego", "Multiplicação", "Andar nas águas"], c: "A", d: "Fácil" },
      { q: "Quem foi lançado na cova dos leões?", o: ["Elias", "Daniel", "Davi", "José"], c: "B", d: "Fácil" },
      { q: "Quantos dias choveu no dilúvio?", o: ["7", "12", "40", "100"], c: "C", d: "Médio" },
      { q: "Quem batizou Jesus?", o: ["Pedro", "João Batista", "Moisés", "Paulo"], c: "B", d: "Fácil" },
      { q: "Qual o livro mais antigo da Bíblia (cronologicamente)?", o: ["Gênesis", "Jó", "Salmos", "Apocalipse"], c: "B", d: "Difícil" },
      { q: "Quem era o pai de Salomão?", o: ["Saul", "Davi", "Abraão", "Jacó"], c: "B", d: "Fácil" },
      { q: "Onde Jesus nasceu?", o: ["Nazaré", "Jerusalém", "Belém", "Cafarnaum"], c: "C", d: "Fácil" },
      { q: "Quem escreveu a maior parte do Novo Testamento?", o: ["Pedro", "João", "Mateus", "Paulo"], c: "D", d: "Médio" },
      { q: "Por quantas moedas Judas traiu Jesus?", o: ["10", "20", "30", "40"], c: "C", d: "Médio" }
    ];
    const picked = randomBank[Math.floor(Math.random() * randomBank.length)];
    setQuizData({
      question: picked.q,
      options: picked.o,
      correct_answer: picked.c,
      difficulty: picked.d
    });
  };

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showEventForm, setShowEventForm] = useState(false);
  const [showParticipationForm, setShowParticipationForm] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [showGalleryForm, setShowGalleryForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [whatsappMsg, setWhatsappMsg] = useState('');
  const [notifFilter, setNotifFilter] = useState<'all' | 'event_participation' | 'prayer_request' | 'new_member' | 'comment'>('all');

  const [stats, setStats] = useState({
    totalMembers: 0,
    nextEvents: 0,
    prayerRequests: 0,
    quizQuestions: 0,
    totalDonations: 0
  });
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    location: 'Sede da Igreja',
    image_url: '',
    youtube_url: '',
    type: 'regular' as 'regular' | 'special',
    category: 'cultos' as any,
    is_live: false,
    speaker: '',
    singers: '',
    theme: '',
    speaker_bio: '',
    speaker_photo_url: '',
    singer_bio: '',
    singer_photo_url: ''
  });

  const [participationData, setParticipationData] = useState({
    event_id: '',
    name: '',
    email: '',
    phone: ''
  });

  const [quizData, setQuizData] = useState({
    question: '',
    options: ['', '', '', ''],
    correct_answer: 'A',
    difficulty: 'Fácil'
  });

  const [galleryData, setGalleryData] = useState({
    title: '',
    image_url: '',
    video_url: '',
    category: 'geral',
    media_type: 'image' as 'image' | 'video',
    thumbnail_url: ''
  });

  const [leaderData, setLeaderData] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    bio: '',
    photo_url: ''
  });

  const [churchSettings, setChurchSettings] = useState({
    church_name: 'Igreja Cristã',
    address: 'Rua da Paz, 123 - Centro',
    instagram: '@igrejacrista',
    youtube: 'youtube.com/igrejacrista',
    logo_url: '',
    about_us_pt: '',
    about_us_en: '',
    about_us_es: '',
    facebook: 'facebook.com/igrejacrista',
    hero_title: 'Bem-vindo à Assembleia de Deus Bereana',
    hero_subtitle: 'Conectando vidas através da fé, amor e esperança',
    daily_verse_content: '',
    daily_verse_reference: '',
    hero_bg_type: 'color' as 'color' | 'gradient',
    hero_bg_color: '#1a1a1a',
    hero_bg_gradient: 'linear-gradient(135deg, #1a1a1a, #4a3e1a, #1a1a1a)',
    donation_pix_key: '',
    donation_pix_qrcode_url: '',
    donation_mbway_key: '',
    donation_bank_transfer: ''
  });


  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [heroVerses, setHeroVerses] = useState<any[]>([]);
  const [showVerseForm, setShowVerseForm] = useState(false);
  const [newVerse, setNewVerse] = useState({ content: '', reference: '' });
  const [editingVerseId, setEditingVerseId] = useState<string | null>(null);

  // Profile Editor state
  const [profileData, setProfileData] = useState<any>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const handleSaveEvent = async () => {
    try {
      if (!eventData.title || !eventData.date || !eventData.time || !eventData.location) {
        alert(lang === 'pt' ? 'Preencha os campos obrigatórios' : 'Please fill required fields');
        return;
      }

      if (editingEventId) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEventId);
        if (error) throw error;
        alert(lang === 'pt' ? 'Evento atualizado com sucesso!' : 'Event updated successfully!');
      } else {
        const { error } = await supabase
          .from('events')
          .insert([eventData]);
        if (error) throw error;
        alert(lang === 'pt' ? 'Evento salvo com sucesso!' : 'Event saved successfully!');
      }

      setShowEventForm(false);
      setEditingEventId(null);
      setEventData({
        title: '',
        date: new Date().toISOString().split('T')[0],
        time: '19:00',
        youtube_url: '',
        image_url: '',
        description: '',
        type: 'regular',
        location: 'Sede da Igreja',
        category: 'cultos',
        is_live: false,
        speaker: '',
        singers: '',
        theme: '',
        speaker_bio: '',
        speaker_photo_url: '',
        singer_bio: '',
        singer_photo_url: ''
      });
      fetchDashboardData();
    } catch (error: any) {
      console.error('Error saving event:', error);
      alert(lang === 'pt' ? 'Erro ao salvar evento' : 'Error saving event');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm(lang === 'pt' ? 'Tem certeza que deseja remover este evento?' : 'Are you sure you want to remove this event?')) return;

    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      setAllEvents(allEvents.filter(e => e.id !== id));
      alert(lang === 'pt' ? 'Evento removido!' : 'Event removed!');
    } catch (error) {
      alert(lang === 'pt' ? 'Erro ao deletar evento' : 'Error deleting event');
    }
  };

  const handleSaveParticipation = async () => {
    try {
      if (!participationData.name || !participationData.event_id || !participationData.phone) {
        alert(lang === 'pt' ? 'Preencha os campos obrigatórios' : 'Please fill required fields');
        return;
      }

      // Save to event_confirmations
      const { data: confData, error: confError } = await supabase
        .from('event_confirmations')
        .insert([participationData])
        .select()
        .single();

      if (confError) throw confError;

      // Create notification
      const selectedEvent = allEvents.find(e => e.id === participationData.event_id);
      await supabase.from('notifications').insert([{
        type: 'event_participation',
        title: lang === 'pt' ? '🙌 Nova Participação (Manual)' : '🙌 New Participation (Manual)',
        message: lang === 'pt'
          ? `O administrador cadastrou ${participationData.name} para o evento "${selectedEvent?.title}"`
          : `Admin registered ${participationData.name} for event "${selectedEvent?.title}"`,
        related_id: confData.id,
        read: false
      }]);

      alert(lang === 'pt' ? 'Participação salva com sucesso!' : 'Participation saved successfully!');


      setShowParticipationForm(false);
      setParticipationData({
        event_id: '',
        name: '',
        email: '',
        phone: ''
      });
      fetchDashboardData();
    } catch (error: any) {
      console.error('Error saving participation:', error);
      alert(lang === 'pt' ? 'Erro ao salvar participação' : 'Error saving participation');
    }
  };
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSaveHeroSlide = async (url: string, index: number) => {
    try {
      const existing = heroSlides.find(s => s.sort_order === index);
      const slideData = {
        image_url: url,
        sort_order: index,
        title: existing?.title || '',
        active: true
      };

      if (existing) {
        const { error } = await supabase.from('hero_slides').update(slideData).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hero_slides').insert([slideData]);
        if (error) throw error;
      }
      fetchDashboardData();
    } catch (error) {
      console.error('Error saving slide:', error);
    }
  };

  const handleDeleteHeroSlide = async (id: string) => {
    try {
      const { error } = await supabase.from('hero_slides').delete().eq('id', id);
      if (error) throw error;
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting slide:', error);
    }
  };

  const handleSaveVerse = async () => {
    try {
      if (!newVerse.content || !newVerse.reference) {
        alert(lang === 'pt' ? 'Preencha o versículo e a referência' : 'Fill verse and reference');
        return;
      }

      if (editingVerseId) {
        const { error } = await supabase.from('hero_verses').update(newVerse).eq('id', editingVerseId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hero_verses').insert([newVerse]);
        if (error) throw error;
      }

      setShowVerseForm(false);
      setEditingVerseId(null);
      setNewVerse({ content: '', reference: '' });
      fetchDashboardData();
    } catch (error) {
      console.error('Error saving verse:', error);
    }
  };

  const handleDeleteVerse = async (id: string) => {
    if (!confirm(lang === 'pt' ? 'Excluir este versículo?' : 'Delete this verse?')) return;
    try {
      const { error } = await supabase.from('hero_verses').delete().eq('id', id);
      if (error) throw error;
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting verse:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [
        { count: memberCount },
        { count: eventCount },
        { count: prayerCount },
        { count: quizCount },
        { data: memberList },
        { data: quizList },
        { data: galleryList },
        { data: leaderList },
        { data: commentList },
        { data: prayerList },
        { data: donationList },
        { data: settingsList },
        { data: allEventsData },
        { data: heroSlidesData },
        { data: heroVersesData }
      ] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }).gte('date', new Date().toISOString().split('T')[0]),
        supabase.from('prayer_requests').select('*', { count: 'exact', head: true }),
        supabase.from('quiz_questions').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('quiz_questions').select('*'),
        supabase.from('gallery_images').select('*').order('created_at', { ascending: false }),
        supabase.from('members').select('*').eq('is_leader', true),
        supabase.from('comments').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('prayer_requests').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('donations').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('church_settings').select('*'),
        supabase.from('events').select('*').order('date', { ascending: false }),
        supabase.from('hero_slides').select('*').order('sort_order', { ascending: true }),
        supabase.from('hero_verses').select('*').order('created_at', { ascending: false })
      ]);

      setStats({
        totalMembers: memberCount || 0,
        nextEvents: eventCount || 0,
        prayerRequests: prayerCount || 0,
        quizQuestions: quizCount || 0,
        totalDonations: donationList?.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0) || 0
      });

      if (memberList) setMembers(memberList);
      if (quizList) setQuizQuestions(quizList);
      if (galleryList) setGalleryImages(galleryList);
      if (leaderList) setLeaders(leaderList);
      if (commentList) setComments(commentList);
      if (prayerList) setPrayerRequests(prayerList);
      if (donationList) setDonations(donationList);
      if (allEventsData) setAllEvents(allEventsData);
      if (heroSlidesData) setHeroSlides(heroSlidesData);
      if (heroVersesData) setHeroVerses(heroVersesData);

      // Fetch notifications
      const { data: notifList } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (notifList) setNotifications(notifList);

      if (settingsList && Array.isArray(settingsList)) {
        const settingsObj = settingsList.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {});
        setChurchSettings(prev => ({ ...prev, ...settingsObj }));
      }

      // Fetch admin profile
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (prof) {
          setProfileData(prof);
          setAvatarPreview(prof.avatar_url);
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm(lang === 'pt' ? 'Tem certeza que deseja remover este membro?' : 'Are you sure you want to remove this member?')) return;

    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
      setMembers(members.filter(m => m.id !== id));
    } catch (error) {
      alert(lang === 'pt' ? 'Erro ao deletar membro' : 'Error deleting member');
    }
  };

  const handleSaveQuiz = async () => {
    try {
      if (!quizData.question || quizData.options.some(opt => !opt)) {
        alert(lang === 'pt' ? 'Preencha a pergunta e todas as alternativas' : 'Fill question and all options');
        return;
      }

      const { error } = await supabase.from('quiz_questions').insert([quizData]);
      if (error) throw error;

      alert(lang === 'pt' ? 'Pergunta salva!' : 'Question saved!');
      setShowQuizForm(false);
      setQuizData({ question: '', options: ['', '', '', ''], correct_answer: 'A', difficulty: 'Fácil' });
      fetchDashboardData();
    } catch (error) {
      alert('Erro ao salvar pergunta');
    }
  };

  const handleSaveGallery = async () => {
    try {
      if (!galleryData.image_url && !galleryData.video_url) {
        alert(lang === 'pt' ? 'Adicione uma imagem ou vídeo' : 'Add an image or video');
        return;
      }

      if (editingGalleryId) {
        const { error } = await supabase
          .from('gallery_images')
          .update(galleryData)
          .eq('id', editingGalleryId);
        if (error) throw error;
        alert(lang === 'pt' ? 'Mídia atualizada!' : 'Media updated!');
      } else {
        const { error } = await supabase
          .from('gallery_images')
          .insert([galleryData]);
        if (error) throw error;
        alert(lang === 'pt' ? 'Mídia adicionada!' : 'Media added!');
      }

      setShowGalleryForm(false);
      setEditingGalleryId(null);
      setGalleryData({
        title: '',
        image_url: '',
        video_url: '',
        category: 'geral',
        media_type: 'image',
        thumbnail_url: ''
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error saving media:', error);
      alert(lang === 'pt' ? 'Erro ao salvar mídia' : 'Error saving media');
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm(lang === 'pt' ? 'Tem certeza que deseja remover esta pergunta?' : 'Are you sure you want to remove this question?')) return;

    try {
      const { error } = await supabase.from('quiz_questions').delete().eq('id', id);
      if (error) throw error;
      setQuizQuestions(quizQuestions.filter(q => q.id !== id));
      alert(lang === 'pt' ? 'Pergunta removida!' : 'Question removed!');
    } catch (error) {
      console.error('Error deleting quiz question:', error);
      alert(lang === 'pt' ? 'Erro ao deletar pergunta' : 'Error deleting question');
    }
  };

  const handleDeleteGallery = async (id: string) => {
    if (!confirm(lang === 'pt' ? 'Tem certeza que deseja remover esta mídia?' : 'Are you sure you want to remove this media?')) return;

    try {
      const { error } = await supabase.from('gallery_images').delete().eq('id', id);
      if (error) throw error;
      setGalleryImages(galleryImages.filter(g => g.id !== id));
      alert(lang === 'pt' ? 'Mídia removida!' : 'Media removed!');
    } catch (error) {
      console.error('Error deleting gallery item:', error);
      alert(lang === 'pt' ? 'Erro ao deletar mídia' : 'Error deleting media');
    }
  };

  const handleSaveLeader = async () => {
    try {
      if (!leaderData.name || !leaderData.role) {
        alert(lang === 'pt' ? 'Nome e cargo são obrigatórios' : 'Name and role are required');
        return;
      }
      // We store leaders in the members table with is_leader flag
      const { error } = await supabase.from('members').insert([{
        ...leaderData,
        is_leader: true,
        join_date: new Date().toISOString().split('T')[0]
      }]);
      if (error) throw error;

      alert(lang === 'pt' ? 'Líder adicionado!' : 'Leader added!');
      setLeaderData({ name: '', role: '', email: '', phone: '', bio: '', photo_url: '' });
      fetchDashboardData();
    } catch (error) {
      console.error('Error saving leader:', error);
      alert('Erro ao salvar líder');
    }
  };

  const handleDeleteLeader = async (id: string) => {
    if (!confirm(lang === 'pt' ? 'Tem certeza que deseja remover este líder?' : 'Are you sure you want to remove this leader?')) return;

    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
      setLeaders(leaders.filter(l => l.id !== id));
    } catch (error) {
      alert(lang === 'pt' ? 'Erro ao deletar líder' : 'Error deleting leader');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const keys = Object.keys(churchSettings);
      const updates = keys.map(key => ({
        key,
        value: (churchSettings as any)[key]
      }));

      const { error } = await supabase.from('church_settings').upsert(updates);
      if (error) throw error;

      alert(lang === 'pt' ? 'Configurações salvas com sucesso!' : 'Settings saved successfully!');

      // Update global context by forcing a refresh or just fetching here
      await fetchDashboardData();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações');
    }
  };




  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      const success = await login(loginEmail, loginPassword);
      if (!success || loginEmail !== 'admin') {
        alert(lang === 'pt' ? 'Acesso negado. Use as credenciais de admin.' : 'Access denied. Use admin credentials.');
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <motion.div
          className="text-center p-8 rounded-2xl max-w-md w-full"
          style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
            <Lock size={28} />
          </div>
          <h2 className="font-serif text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {lang === 'pt' ? 'Ativar Painel Admin' : lang === 'en' ? 'Activate Admin Panel' : 'Activar Panel Admin'}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'pt' ? 'Insira as credenciais administrativas para gerenciar a igreja.' : 'Enter administrative credentials to manage the church.'}
          </p>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>Login</label>
              <input
                type="text"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'pt' ? 'Senha' : 'Password'}</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="123"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
            </div>
            <motion.button
              type="submit"
              className="w-full py-3 rounded-xl font-bold text-white cursor-pointer mt-2"
              style={{ backgroundColor: 'var(--accent)' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {lang === 'pt' ? 'Ativar Agora' : 'Activate Now'}
            </motion.button>
          </form>

          <p className="mt-6 text-xs opacity-50">
            {lang === 'pt' ? 'Dica: use admin / 123' : 'Hint: use admin / 123'}
          </p>

          <button
            onClick={() => onNavigate('home')}
            className="mt-6 text-xs font-medium underline opacity-50 hover:opacity-100 cursor-pointer"
          >
            {lang === 'pt' ? 'Voltar para o Site' : 'Back to Website'}
          </button>
        </motion.div>
      </div>
    );
  }

  const sidebarItems: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: t('admin.dashboard'), icon: <LayoutDashboard size={18} /> },
    { key: 'members', label: t('admin.members'), icon: <Users size={18} /> },
    { key: 'events', label: t('admin.events_manage'), icon: <Calendar size={18} /> },
    { key: 'gallery', label: t('admin.gallery_manage'), icon: <Image size={18} /> },
    { key: 'quiz', label: t('admin.quiz_manage'), icon: <HelpCircle size={18} /> },
    { key: 'leaders', label: t('admin.leaders_manage'), icon: <UserCog size={18} /> },
    { key: 'settings', label: t('admin.settings'), icon: <Settings size={18} /> },
    {
      key: 'notifications',
      label: lang === 'pt' ? 'Notificações' : 'Notifications',
      icon: (
        <div className="relative">
          <Bell size={18} />
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {notifications.filter(n => !n.read).length}
            </span>
          )}
        </div>
      )
    },
    { key: 'my_profile', label: lang === 'pt' ? 'Meu Perfil' : 'My Profile', icon: <UserIcon size={18} /> },
  ];

  const statCards = [
    { label: t('admin.total_members'), value: stats.totalMembers.toString(), icon: <Users size={24} />, trend: '', color: '#5A9AD4' },
    { label: t('admin.next_events'), value: stats.nextEvents.toString(), icon: <Calendar size={24} />, trend: '', color: '#7A8B4A' },
    { label: t('admin.prayer_requests'), value: stats.prayerRequests.toString(), icon: <Heart size={24} />, trend: '', color: '#D4764E' },
    { label: lang === 'pt' ? 'Total Doações' : 'Total Donations', value: `R$ ${stats.totalDonations}`, icon: <Coins size={24} />, trend: '', color: '#F1C40F' },
  ];

  return (
    <div className="min-h-screen transition-all duration-1000" style={{
      background: churchSettings.hero_bg_type === 'gradient'
        ? churchSettings.hero_bg_gradient
        : churchSettings.hero_bg_color,
      backgroundColor: 'var(--bg-primary)'
    }}>
      <div className="min-h-screen bg-black/40 backdrop-blur-[2px] flex">
        {/* Sidebar */}
        <motion.div
          initial={{ x: -280 }}
          animate={{ x: 0 }}
          className="w-72 border-r border-white/10 flex flex-col sticky top-0 h-screen z-50 backdrop-blur-xl bg-black/60"
        >
          <div className="p-6 h-full flex flex-col">
            <h2 className="font-serif text-lg font-bold mb-6 text-white">
              {t('admin.title')}
            </h2>
            <nav className="space-y-1">
              {sidebarItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition cursor-pointer"
                  style={{
                    backgroundColor: activeTab === item.key ? 'var(--accent)' : 'transparent',
                    color: activeTab === item.key ? 'white' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-white/10">
              <button
                onClick={() => {
                  logout();
                  onNavigate('home');
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition cursor-pointer text-red-400 hover:bg-red-400/10"
              >
                <LogOut size={18} />
                {lang === 'pt' ? 'Sair' : 'Logout'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Mobile Nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 overflow-x-auto bg-black/80 backdrop-blur-xl border-t border-white/10">
          <div className="flex min-w-max px-2 py-2">
            {sidebarItems.map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className="flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium cursor-pointer transition"
                style={{
                  color: activeTab === item.key ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
                }}
              >
                {item.icon}
                <span className="truncate max-w-[60px]">{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => {
                logout();
                onNavigate('home');
              }}
              className="flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium cursor-pointer transition text-red-400"
            >
              <LogOut size={18} />
              <span>{lang === 'pt' ? 'Sair' : 'Logout'}</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-8 pb-24 lg:pb-8 overflow-y-auto">
          {/* Dashboard */}
          {
            activeTab === 'dashboard' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>
                  {t('admin.dashboard')}
                </h1>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {statCards.map((stat, i) => (
                    <motion.div
                      key={i}
                      className="rounded-2xl p-5"
                      style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ y: -3 }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-xl" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                          {stat.icon}
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                          <TrendingUp size={12} /> {stat.trend}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Integrated Dashboard Lists */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* New Members */}
                  <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}>
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <Users size={20} className="text-[var(--accent)]" /> {lang === 'pt' ? 'Novos Membros' : 'New Members'}
                    </h3>
                    <div className="space-y-3">
                      {members.slice(0, 5).map((m, i) => (
                        <div key={i} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: 'var(--accent)' }}>
                            {m.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(m.created_at || m.join_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}>
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <HelpCircle size={20} className="text-[var(--accent)]" /> {lang === 'pt' ? 'Comentários' : 'Comments'}
                    </h3>
                    <div className="space-y-3">
                      {comments.length > 0 ? comments.map((c, i) => (
                        <div key={i} className="py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.author_name}</span>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>"{c.content}"</p>
                        </div>
                      )) : <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>Sem comentários recentes</p>}
                    </div>
                  </div>

                  {/* Prayer Requests */}
                  <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}>
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <Heart size={20} className="text-[var(--accent)]" /> {lang === 'pt' ? 'Pedidos de Oração' : 'Prayer Requests'}
                    </h3>
                    <div className="space-y-3">
                      {prayerRequests.length > 0 ? prayerRequests.map((p, i) => (
                        <div key={i} className="py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.name || 'Anônimo'}</p>
                          <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{p.message || p.request}</p>
                        </div>
                      )) : <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>Sem pedidos pendentes</p>}
                    </div>
                  </div>

                  {/* Donations */}
                  <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}>
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <Coins size={20} className="text-[var(--accent)]" /> {lang === 'pt' ? 'Doações Recentes' : 'Recent Donations'}
                    </h3>
                    <div className="space-y-3">
                      {donations.length > 0 ? donations.map((d, i) => (
                        <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>R$ {d.amount}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{d.type === 'tithe' ? 'Dízimo' : 'Oferta'} • {d.payment_method}</p>
                          </div>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: d.status === 'completed' ? '#E8EDD6' : '#FADBD8', color: d.status === 'completed' ? '#7A8B4A' : '#C0392B' }}>
                            {d.status}
                          </span>
                        </div>
                      )) : <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>Sem doações registradas</p>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          }

          {/* Members */}
          {
            activeTab === 'members' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-8">
                  <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('admin.members')}</h1>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <th className="text-left px-6 py-3 text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>{t('member.name')}</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>{t('member.email')}</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold uppercase hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>Role</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold uppercase hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Data</th>
                          <th className="px-6 py-3 text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((member) => (
                          <tr key={member.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: 'var(--accent)' }}>
                                  {member.name.charAt(0)}
                                </div>
                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{member.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{member.email}</td>
                            <td className="px-6 py-4 hidden sm:table-cell">
                              <span
                                className="px-2.5 py-1 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: member.role === 'leader' ? '#E8EDD6' : 'var(--accent-light)',
                                  color: member.role === 'leader' ? '#7A8B4A' : 'var(--accent)',
                                }}
                              >
                                {member.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>{new Date(member.join_date).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button className="p-1.5 rounded-lg cursor-pointer hover:opacity-70" style={{ color: 'var(--accent)' }}><Edit size={14} /></button>
                                <button
                                  onClick={() => handleDeleteMember(member.id)}
                                  className="p-1.5 rounded-lg cursor-pointer hover:opacity-70"
                                  style={{ color: 'var(--error)' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )
          }

          {/* Events Management */}
          {
            activeTab === 'events' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-8">
                  <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('admin.events_manage')}</h1>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => {
                        setEditingEventId(null);
                        setEventData({
                          title: '',
                          description: '',
                          date: new Date().toISOString().split('T')[0],
                          time: '19:00',
                          location: 'Sede da Igreja',
                          image_url: '',
                          youtube_url: '',
                          type: 'regular',
                          category: 'cultos',
                          is_live: false,
                          speaker: '',
                          singers: '',
                          theme: '',
                          speaker_bio: '',
                          speaker_photo_url: '',
                          singer_bio: '',
                          singer_photo_url: ''
                        });
                        setShowEventForm(!showEventForm);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer"
                      style={{ backgroundColor: 'var(--accent)' }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Plus size={16} /> {lang === 'pt' ? 'Novo Evento' : lang === 'en' ? 'New Event' : 'Nuevo Evento'}
                    </motion.button>
                    <motion.button
                      onClick={() => setShowParticipationForm(true)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-[var(--accent)] cursor-pointer"
                      style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Plus size={16} /> {lang === 'pt' ? 'Nova Participação' : 'New Participation'}
                    </motion.button>
                  </div>
                </div>

                {showEventForm && (
                  <motion.div
                    className="rounded-2xl p-6 mb-6"
                    style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                      {editingEventId
                        ? (lang === 'pt' ? 'Editar Evento' : 'Edit Event')
                        : (lang === 'pt' ? 'Cadastrar Evento' : 'Register Event')}
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'pt' ? 'Título' : 'Title'}</label>
                        <input
                          type="text"
                          value={eventData.title}
                          onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'pt' ? 'Local' : 'Location'}</label>
                        <input
                          type="text"
                          value={eventData.location}
                          onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'pt' ? 'Tema / Versículo Base' : 'Theme / Base Verse'}</label>
                        <input
                          type="text"
                          placeholder={lang === 'pt' ? 'Ex: Expandindo o Reino com Amor' : 'Ex: Expanding the Kingdom with Love'}
                          value={eventData.theme}
                          onChange={(e) => setEventData({ ...eventData, theme: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'pt' ? 'Data' : 'Date'}</label>
                        <input
                          type="date"
                          value={eventData.date}
                          onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'pt' ? 'Hora' : 'Time'}</label>
                        <input
                          type="time"
                          value={eventData.time}
                          onChange={(e) => setEventData({ ...eventData, time: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <MediaUpload
                          label={lang === 'pt' ? 'Imagem do Evento' : 'Event Image'}
                          folder="events"
                          currentUrl={eventData.image_url}
                          onUploadSuccess={(url) => setEventData({ ...eventData, image_url: url })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>YouTube URL</label>
                        <input
                          type="url"
                          value={eventData.youtube_url}
                          onChange={(e) => setEventData({ ...eventData, youtube_url: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                          {lang === 'pt' ? 'Tipo de Evento' : 'Event Type'}
                        </label>
                        <select
                          value={eventData.type}
                          onChange={(e) => setEventData({ ...eventData, type: e.target.value as any })}
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        >
                          <option value="regular">Regular</option>
                          <option value="special">{lang === 'pt' ? 'Especial (Popup com Countdown)' : 'Special (Popup with Countdown)'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                          {lang === 'pt' ? 'Categoria' : 'Category'}
                        </label>
                        <select
                          value={eventData.category}
                          onChange={(e) => setEventData({ ...eventData, category: e.target.value as any })}
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        >
                          <option value="cultos">Cultos</option>
                          <option value="batismo">Batismo</option>
                          <option value="estudos">Estudos</option>
                          <option value="eventos">Eventos</option>
                          <option value="social">Social</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                          {lang === 'pt' ? 'Quem Administra a Palavra' : 'Speaker / Minister'}
                        </label>
                        <input
                          type="text"
                          placeholder={lang === 'pt' ? 'Ex: Pastor João Silva' : 'Ex: Pastor John Smith'}
                          value={eventData.speaker}
                          onChange={(e) => setEventData({ ...eventData, speaker: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                          {lang === 'pt' ? 'Cantores da Noite' : 'Singers of the Night'}
                        </label>
                        <input
                          type="text"
                          placeholder={lang === 'pt' ? 'Ex: Grupo Louvor & Adoração, Irmã Maria' : 'Ex: Praise & Worship Team, Sister Mary'}
                          value={eventData.singers}
                          onChange={(e) => setEventData({ ...eventData, singers: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>

                      {/* Detalhes do Preletor */}
                      <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4 p-4 rounded-2xl border border-dashed border-[var(--border)]">
                        <div className="sm:col-span-2 font-bold text-xs uppercase tracking-widest opacity-50 mb-2">Detalhes do Preletor</div>
                        <div>
                          <MediaUpload
                            label={lang === 'pt' ? 'Foto do Preletor' : 'Speaker Photo'}
                            folder="events"
                            currentUrl={eventData.speaker_photo_url}
                            onUploadSuccess={(url) => setEventData({ ...eventData, speaker_photo_url: url })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Biografia curta</label>
                          <textarea
                            value={eventData.speaker_bio}
                            onChange={(e) => setEventData({ ...eventData, speaker_bio: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                            rows={3}
                            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                          />
                        </div>
                      </div>

                      {/* Detalhes do Cantor */}
                      <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4 p-4 rounded-2xl border border-dashed border-[var(--border)]">
                        <div className="sm:col-span-2 font-bold text-xs uppercase tracking-widest opacity-50 mb-2">Detalhes do Cantor</div>
                        <div>
                          <MediaUpload
                            label={lang === 'pt' ? 'Foto do Cantor' : 'Singer Photo'}
                            folder="events"
                            currentUrl={eventData.singer_photo_url}
                            onUploadSuccess={(url) => setEventData({ ...eventData, singer_photo_url: url })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Biografia curta</label>
                          <textarea
                            value={eventData.singer_bio}
                            onChange={(e) => setEventData({ ...eventData, singer_bio: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                            rows={3}
                            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                          {lang === 'pt' ? 'Descrição' : lang === 'en' ? 'Description' : 'Descripción'}
                        </label>
                        <textarea
                          value={eventData.description}
                          onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                          rows={3}
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {lang === 'pt' ? 'Marcar como AO VIVO' : 'Mark as LIVE'}
                        </label>
                        <input
                          type="checkbox"
                          checked={eventData.is_live}
                          onChange={(e) => setEventData({ ...eventData, is_live: e.target.checked })}
                          className="w-5 h-5 accent-[var(--accent)]"
                        />
                      </div>
                      <motion.button
                        onClick={handleSaveEvent}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer"
                        style={{ backgroundColor: 'var(--accent)' }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <Save size={14} /> {lang === 'pt' ? 'Salvar' : 'Save'}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allEvents.map(event => (
                    <motion.div
                      key={event.id}
                      className="rounded-2xl overflow-hidden group"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 15px var(--shadow)' }}
                      layout
                    >
                      <div className="relative aspect-video">
                        <img src={event.image_url || 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80'} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            onClick={() => {
                              setEventData({
                                title: event.title,
                                description: event.description || '',
                                date: event.date,
                                time: event.time,
                                location: event.location,
                                image_url: event.image_url || '',
                                youtube_url: event.youtube_url || '',
                                type: event.type,
                                category: event.category,
                                is_live: event.is_live || false,
                                speaker: event.speaker || '',
                                singers: event.singers || '',
                                theme: event.theme || '',
                                speaker_bio: event.speaker_bio || '',
                                speaker_photo_url: event.speaker_photo_url || '',
                                singer_bio: event.singer_bio || '',
                                singer_photo_url: event.singer_photo_url || ''
                              });
                              setEditingEventId(event.id);
                              setShowEventForm(true);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-3 bg-white text-[var(--accent)] rounded-full hover:scale-110 transition cursor-pointer"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="p-3 bg-white text-red-500 rounded-full hover:scale-110 transition cursor-pointer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="p-4 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent)]">
                            {event.category}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                            <Clock size={10} />
                            {new Date(`${event.date}T${event.time}`).toLocaleString()}
                          </div>
                        </div>
                        <h4 className="font-bold text-sm mb-1 line-clamp-1" style={{ color: 'var(--text-primary)' }}>{event.title}</h4>
                        <p className="text-xs line-clamp-2 opacity-60 mb-4" style={{ color: 'var(--text-secondary)' }}>{event.description}</p>

                        {/* Action Buttons - Always Visible for better UX */}
                        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => {
                              setEventData({
                                title: event.title,
                                description: event.description || '',
                                date: event.date,
                                time: event.time,
                                location: event.location,
                                image_url: event.image_url || '',
                                youtube_url: event.youtube_url || '',
                                type: event.type,
                                category: event.category,
                                is_live: event.is_live || false,
                                speaker: event.speaker || '',
                                singers: event.singers || '',
                                theme: event.theme || '',
                                speaker_bio: event.speaker_bio || '',
                                speaker_photo_url: event.speaker_photo_url || '',
                                singer_bio: event.singer_bio || '',
                                singer_photo_url: event.singer_photo_url || ''
                              });
                              setEditingEventId(event.id);
                              setShowEventForm(true);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-[var(--accent-light)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer"
                          >
                            <Edit size={14} /> {lang === 'pt' ? 'Editar' : 'Edit'}
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                          >
                            <Trash2 size={14} /> {lang === 'pt' ? 'Excluir' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {allEvents.length === 0 && (
                  <div className="text-center py-20 opacity-40">
                    <Calendar size={48} className="mx-auto mb-4" />
                    <p>Nenhum evento cadastrado.</p>
                  </div>
                )}
              </motion.div>
            )
          }

          {/* Gallery Management */}
          {
            activeTab === 'gallery' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-8">
                  <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('admin.gallery_manage')}</h1>
                  <motion.button
                    onClick={() => {
                      setEditingGalleryId(null);
                      setGalleryData({ title: '', image_url: '', video_url: '', category: 'geral', media_type: 'image', thumbnail_url: '' });
                      setShowGalleryForm(!showGalleryForm);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer"
                    style={{ backgroundColor: 'var(--accent)' }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Plus size={16} /> {editingGalleryId ? (lang === 'pt' ? 'Editando...' : 'Editing...') : (lang === 'pt' ? 'Adicionar Mídia' : 'Add Media')}
                  </motion.button>
                </div>

                {showGalleryForm && (
                  <motion.div
                    className="rounded-2xl p-6 mb-6"
                    style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex flex-col gap-4">
                      <input
                        type="text"
                        placeholder={lang === 'pt' ? 'Título / Legenda da Foto' : 'Photo Title / Caption'}
                        value={galleryData.title}
                        onChange={(e) => setGalleryData({ ...galleryData, title: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                      <div className="flex rounded-xl overflow-hidden mb-2" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <button
                          onClick={() => setGalleryData({ ...galleryData, media_type: 'image' })}
                          className="flex-1 py-2 text-xs font-medium transition"
                          style={{ backgroundColor: galleryData.media_type === 'image' ? 'var(--accent)' : 'transparent', color: galleryData.media_type === 'image' ? 'white' : 'var(--text-secondary)' }}
                        >
                          Foto
                        </button>
                        <button
                          onClick={() => setGalleryData({ ...galleryData, media_type: 'video' })}
                          className="flex-1 py-2 text-xs font-medium transition"
                          style={{ backgroundColor: galleryData.media_type === 'video' ? 'var(--accent)' : 'transparent', color: galleryData.media_type === 'video' ? 'white' : 'var(--text-secondary)' }}
                        >
                          Vídeo
                        </button>
                      </div>
                      {galleryData.media_type === 'image' ? (
                        <MediaUpload
                          label={lang === 'pt' ? 'Upload de Foto' : 'Photo Upload'}
                          folder="gallery"
                          currentUrl={galleryData.image_url}
                          onUploadSuccess={(url) => setGalleryData({ ...galleryData, image_url: url })}
                        />
                      ) : (
                        <div className="space-y-4">
                          <MediaUpload
                            label={lang === 'pt' ? 'Upload de Vídeo' : 'Video Upload'}
                            folder="gallery"
                            accept="video/*"
                            currentUrl={galleryData.video_url}
                            onUploadSuccess={(url) => setGalleryData({ ...galleryData, video_url: url, media_type: 'video' })}
                          />
                          <div className="text-center opacity-50 text-xs">-- OU --</div>
                          <input
                            type="url"
                            placeholder="Link do YouTube (opcional se fez upload)"
                            value={galleryData.video_url}
                            onChange={(e) => setGalleryData({ ...galleryData, video_url: e.target.value, media_type: 'video' })}
                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                          />
                        </div>
                      )}
                      <select
                        value={galleryData.category}
                        onChange={(e) => setGalleryData({ ...galleryData, category: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      >
                        <option value="geral">Geral</option>
                        <option value="worship">{lang === 'pt' ? 'Culto / Louvor' : 'Worship'}</option>
                        <option value="events">{lang === 'pt' ? 'Eventos' : 'Events'}</option>
                        <option value="community">{lang === 'pt' ? 'Comunidade / Social' : 'Community'}</option>
                        <option value="batismo">Batismo</option>
                      </select>
                      <button
                        onClick={handleSaveGallery}
                        className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white font-medium cursor-pointer"
                      >
                        Salvar
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {galleryImages.map(img => {
                    const isVideo = img.media_type === 'video' || (img.video_url && (img.video_url.includes('youtube.com') || img.video_url.includes('youtu.be')));
                    const isYT = img.video_url && (img.video_url.includes('youtube.com') || img.video_url.includes('youtu.be'));
                    const ytId = isYT ? getYouTubeId(img.video_url) : null;
                    const thumb = isYT ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : (img.thumbnail_url || img.image_url);

                    return (
                      <motion.div
                        key={img.id}
                        className="flex flex-col rounded-2xl overflow-hidden group border border-[var(--border)]"
                        style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 15px var(--shadow)' }}
                        layout
                      >
                        <div className="relative aspect-video overflow-hidden">
                          {isVideo && !thumb ? (
                            <video src={`${img.video_url}#t=0.5`} className="w-full h-full object-cover" preload="metadata" />
                          ) : (
                            <img
                              src={thumb || 'https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&q=80'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              alt="gallery item"
                            />
                          )}
                          {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Play size={24} className="text-white fill-white" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg bg-black/50 text-white backdrop-blur-sm">
                              {img.category}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 flex flex-col gap-3">
                          <p className="text-xs font-semibold line-clamp-1" style={{ color: 'var(--text-primary)' }}>
                            {img.title || (lang === 'pt' ? 'Sem título' : 'Untitled')}
                          </p>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setGalleryData({
                                  title: img.title || '',
                                  image_url: img.image_url || '',
                                  video_url: img.video_url || '',
                                  category: img.category || 'geral',
                                  media_type: img.media_type || 'image',
                                  thumbnail_url: img.thumbnail_url || ''
                                });
                                setEditingGalleryId(img.id);
                                setShowGalleryForm(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-[var(--accent-light)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer"
                            >
                              <Edit size={14} /> {lang === 'pt' ? 'Editar' : 'Edit'}
                            </button>
                            <button
                              onClick={() => handleDeleteGallery(img.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                            >
                              <Trash2 size={14} /> {lang === 'pt' ? 'Excluir' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {galleryImages.length === 0 && (
                  <div
                    className="rounded-2xl p-12 text-center border-2 border-dashed"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}
                  >
                    <Image size={48} className="mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Sem imagens cadastradas</p>
                  </div>
                )}
              </motion.div>
            )
          }

          {/* Quiz Management */}
          {
            activeTab === 'quiz' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-8">
                  <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('admin.quiz_manage')}</h1>
                  <div className="flex items-center gap-3">
                    {showQuizForm && (
                      <motion.button
                        onClick={handleGenerateRandomQuiz}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--accent-light)] text-[var(--accent)] cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                      >
                        🎲 Sortear Aleatório
                      </motion.button>
                    )}
                    <motion.button
                      onClick={() => setShowQuizForm(!showQuizForm)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer"
                      style={{ backgroundColor: 'var(--accent)' }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Plus size={16} /> {lang === 'pt' ? 'Nova Pergunta' : lang === 'en' ? 'New Question' : 'Nueva Pregunta'}
                    </motion.button>
                  </div>
                </div>

                {showQuizForm && (
                  <motion.div
                    className="rounded-2xl p-6 mb-6"
                    style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                          {t('quiz.question')}
                        </label>
                        <input
                          type="text"
                          value={quizData.question}
                          onChange={(e) => setQuizData({ ...quizData, question: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {['A', 'B', 'C', 'D'].map((opt, idx) => (
                          <div key={opt}>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                              {lang === 'pt' ? `Alternativa ${opt}` : `Option ${opt}`}
                            </label>
                            <input
                              type="text"
                              value={quizData.options[idx]}
                              onChange={(e) => {
                                const newOptions = [...quizData.options];
                                newOptions[idx] = e.target.value;
                                setQuizData({ ...quizData, options: newOptions });
                              }}
                              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                            {lang === 'pt' ? 'Resposta Correta' : 'Correct Answer'}
                          </label>
                          <select
                            value={quizData.correct_answer}
                            onChange={(e) => setQuizData({ ...quizData, correct_answer: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                          >
                            {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                            {lang === 'pt' ? 'Dificuldade' : 'Difficulty'}
                          </label>
                          <select
                            value={quizData.difficulty}
                            onChange={(e) => setQuizData({ ...quizData, difficulty: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                          >
                            <option value="Fácil">{lang === 'pt' ? 'Fácil' : 'Easy'}</option>
                            <option value="Médio">{lang === 'pt' ? 'Médio' : 'Medium'}</option>
                            <option value="Difícil">{lang === 'pt' ? 'Difícil' : 'Hard'}</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <motion.button
                          onClick={handleSaveQuiz}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer"
                          style={{ backgroundColor: 'var(--accent)' }}
                          whileHover={{ scale: 1.05 }}
                        >
                          <Save size={14} /> {lang === 'pt' ? 'Salvar' : 'Save'}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-4">
                  {quizQuestions.map(q => (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl flex items-center justify-between"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{q.question}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {q.difficulty} • {lang === 'pt' ? 'Resposta:' : 'Answer:'} {q.correct_answer}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteQuiz(q.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          }

          {/* Leaders Management */}
          {
            activeTab === 'leaders' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-8">
                  <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('admin.leaders_manage')}</h1>
                </div>
                <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'pt' ? 'Nome' : 'Name'}</label>
                      <input
                        type="text"
                        value={leaderData.name}
                        onChange={(e) => setLeaderData({ ...leaderData, name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'pt' ? 'Cargo' : 'Role'}</label>
                      <input
                        type="text"
                        placeholder="Ex: Pastor, Administrador"
                        value={leaderData.role}
                        onChange={(e) => setLeaderData({ ...leaderData, role: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
                        <input
                          type="email"
                          value={leaderData.email}
                          onChange={(e) => setLeaderData({ ...leaderData, email: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'pt' ? 'Telefone / WhatsApp' : 'Phone / WhatsApp'}</label>
                        <input
                          type="tel"
                          value={leaderData.phone}
                          onChange={(e) => setLeaderData({ ...leaderData, phone: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Bio</label>
                      <textarea
                        value={leaderData.bio}
                        onChange={(e) => setLeaderData({ ...leaderData, bio: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                        rows={3}
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <MediaUpload
                        label={lang === 'pt' ? 'Foto do Líder' : 'Leader Photo'}
                        folder="leaders"
                        currentUrl={leaderData.photo_url}
                        onUploadSuccess={(url) => setLeaderData({ ...leaderData, photo_url: url })}
                      />
                    </div>
                    <button
                      onClick={handleSaveLeader}
                      className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-semibold cursor-pointer"
                    >
                      {lang === 'pt' ? 'Salvar Líder' : 'Save Leader'}
                    </button>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leaders.map(leader => (
                    <div key={leader.id} className="p-4 rounded-2xl flex items-center gap-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <img src={leader.photo_url || 'https://via.placeholder.com/150'} className="w-12 h-12 rounded-full object-cover" />
                      <div className="flex-1">
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{leader.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{leader.role}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteLeader(leader.id)}
                        className="p-2 rounded-lg opacity-40 hover:opacity-100 transition-opacity cursor-pointer text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          }

          {/* Settings */}
          {
            activeTab === 'settings' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="font-serif text-2xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>{t('admin.settings')}</h1>
                <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}>
                  <h3 className="font-semibold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Edit size={20} className="text-[var(--accent)]" /> {lang === 'pt' ? 'Editor do Site' : 'Site Editor'}
                  </h3>

                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>{lang === 'pt' ? 'Nome da Igreja' : 'Church Name'}</label>
                        <input
                          type="text"
                          value={churchSettings.church_name}
                          onChange={(e) => setChurchSettings({ ...churchSettings, church_name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none font-medium"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <MediaUpload
                          label="Logo da Igreja"
                          folder="logos"
                          currentUrl={churchSettings.logo_url}
                          onUploadSuccess={(url) => setChurchSettings({ ...churchSettings, logo_url: url })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>{lang === 'pt' ? 'Endereço Completo' : 'Full Address'}</label>
                      <input
                        type="text"
                        value={churchSettings.address}
                        onChange={(e) => setChurchSettings({ ...churchSettings, address: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>Instagram URL</label>
                        <input
                          type="text"
                          value={churchSettings.instagram}
                          onChange={(e) => setChurchSettings({ ...churchSettings, instagram: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>YouTube Channel URL</label>
                        <input
                          type="text"
                          value={churchSettings.youtube}
                          onChange={(e) => setChurchSettings({ ...churchSettings, youtube: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>Facebook Page URL</label>
                        <input
                          type="text"
                          value={churchSettings.facebook}
                          onChange={(e) => setChurchSettings({ ...churchSettings, facebook: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold pt-4" style={{ color: 'var(--text-primary)', borderTop: '1px solid var(--border)' }}>
                        {lang === 'pt' ? 'Seção "Quem Somos"' : '"About Us" Section'}
                      </h4>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Português</label>
                        <textarea
                          value={churchSettings.about_us_pt}
                          onChange={(e) => setChurchSettings({ ...churchSettings, about_us_pt: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                          rows={4}
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>English</label>
                        <textarea
                          value={churchSettings.about_us_en}
                          onChange={(e) => setChurchSettings({ ...churchSettings, about_us_en: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                          rows={4}
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Español</label>
                        <textarea
                          value={churchSettings.about_us_es}
                          onChange={(e) => setChurchSettings({ ...churchSettings, about_us_es: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                          rows={4}
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                    </div>

                    <div className="space-y-6 pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
                      <h3 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <LayoutDashboard size={20} className="text-[var(--accent)]" /> {lang === 'pt' ? 'Configuração da Home' : 'Home Configuration'}
                      </h3>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>
                            {lang === 'pt' ? 'Título de Boas-vindas' : 'Welcome Title'}
                          </label>
                          <input
                            type="text"
                            value={churchSettings.hero_title}
                            onChange={(e) => setChurchSettings({ ...churchSettings, hero_title: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl text-sm outline-none font-medium"
                            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>
                            {lang === 'pt' ? 'Subtítulo' : 'Subtitle'}
                          </label>
                          <input
                            type="text"
                            value={churchSettings.hero_subtitle}
                            onChange={(e) => setChurchSettings({ ...churchSettings, hero_subtitle: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase mb-4" style={{ color: 'var(--text-secondary)' }}>
                          {lang === 'pt' ? 'Slides do Background (Máx 5)' : 'Background Slides (Max 5)'}
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                          {Array.from({ length: 5 }).map((_, i) => {
                            const slide = heroSlides.find(s => s.sort_order === i);
                            return (
                              <div key={i} className="space-y-2">
                                <MediaUpload
                                  label={`Slide ${i + 1}`}
                                  folder="hero"
                                  accept="image/*,video/*"
                                  currentUrl={slide?.image_url || ''}
                                  onUploadSuccess={(url) => handleSaveHeroSlide(url, i)}
                                />
                                {slide && (
                                  <button
                                    onClick={() => handleDeleteHeroSlide(slide.id)}
                                    className="w-full mt-1.5 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-[10px] font-bold uppercase transition hover:bg-red-500/20"
                                  >
                                    {lang === 'pt' ? 'Remover' : 'Remove'}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>
                            {lang === 'pt' ? 'Banco de Versículos' : 'Verse Bank'}
                          </label>
                          <button
                            onClick={() => { setShowVerseForm(true); setEditingVerseId(null); setNewVerse({ content: '', reference: '' }); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-bold"
                          >
                            <Plus size={14} /> {lang === 'pt' ? 'Novo Versículo' : 'New Verse'}
                          </button>
                        </div>

                        <AnimatePresence>
                          {showVerseForm && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="p-4 rounded-2xl space-y-4 bg-[var(--bg-secondary)] border border-[var(--border)] overflow-hidden"
                            >
                              <div>
                                <label className="block text-[10px] font-bold uppercase mb-1 opacity-50">{lang === 'pt' ? 'Texto do Versículo' : 'Verse Text'}</label>
                                <textarea
                                  value={newVerse.content}
                                  onChange={e => setNewVerse({ ...newVerse, content: e.target.value })}
                                  rows={2}
                                  className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                                  style={{ border: '1px solid var(--border)' }}
                                  placeholder='"O Senhor é meu pastor..."'
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold uppercase mb-1 opacity-50">{lang === 'pt' ? 'Referência' : 'Reference'}</label>
                                  <input
                                    type="text"
                                    value={newVerse.reference}
                                    onChange={e => setNewVerse({ ...newVerse, reference: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                                    style={{ border: '1px solid var(--border)' }}
                                    placeholder="Salmos 23:1"
                                  />
                                </div>
                                <div className="flex items-end gap-2">
                                  <button onClick={handleSaveVerse} className="flex-1 py-2 rounded-xl bg-[var(--accent)] text-white font-bold text-xs uppercase shadow-lg shadow-yellow-500/20">
                                    {lang === 'pt' ? 'Salvar' : 'Save'}
                                  </button>
                                  <button onClick={() => setShowVerseForm(false)} className="px-4 py-2 rounded-xl font-bold text-xs uppercase opacity-40">
                                    {lang === 'pt' ? 'Cancelar' : 'Cancel'}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="grid sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                          {heroVerses.map(v => (
                            <div key={v.id} className="p-4 rounded-2xl group relative" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                              <p className="text-sm font-serif italic mb-2 line-clamp-2" style={{ color: 'var(--text-primary)' }}>"{v.content}"</p>
                              <p className="text-xs font-bold opacity-50" style={{ color: 'var(--accent)' }}>{v.reference}</p>
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <button
                                  onClick={() => { setEditingVerseId(v.id); setNewVerse({ content: v.content, reference: v.reference }); setShowVerseForm(true); }}
                                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-blue-500"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeleteVerse(v.id)}
                                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-red-500"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-6 rounded-3xl space-y-4" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
                        <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                          <Star size={14} /> {lang === 'pt' ? 'Versículo do Dia (Principal)' : 'Verse of the Day (Featured)'}
                        </h4>
                        <div className="grid gap-4">
                          <textarea
                            value={churchSettings.daily_verse_content}
                            onChange={(e) => setChurchSettings({ ...churchSettings, daily_verse_content: e.target.value })}
                            className="w-full px-4 py-3 rounded-2xl text-sm italic font-serif outline-none border border-transparent focus:border-[var(--accent)] transition-all resize-none"
                            rows={3}
                            placeholder={lang === 'pt' ? 'Texto do versículo que aparece no destaque...' : 'Text of the verse that appears in the spotlight...'}
                          />
                          <input
                            type="text"
                            value={churchSettings.daily_verse_reference}
                            onChange={(e) => setChurchSettings({ ...churchSettings, daily_verse_reference: e.target.value })}
                            className="w-full px-4 py-3 rounded-2xl text-sm font-bold outline-none border border-transparent focus:border-[var(--accent)] transition-all"
                            placeholder={lang === 'pt' ? 'Referência (Ex: João 3:16)' : 'Reference (Ex: John 3:16)'}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-3xl space-y-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4" style={{ color: 'var(--accent)' }}>
                        <Coins size={14} /> {lang === 'pt' ? 'Configurações de Doação' : 'Donation Settings'}
                      </h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase mb-1 opacity-50">{lang === 'pt' ? 'Chave PIX' : 'PIX Key'}</label>
                          <input
                            type="text"
                            value={churchSettings.donation_pix_key}
                            onChange={(e) => setChurchSettings({ ...churchSettings, donation_pix_key: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                            style={{ border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-primary)' }}
                            placeholder="Ex: 12.345.678/0001-90"
                          />

                          <div className="mt-4">
                            <label className="block text-[10px] font-bold uppercase mb-2 opacity-50">{lang === 'pt' ? 'Upload QR Code PIX (Opcional)' : 'Upload PIX QR Code (Optional)'}</label>
                            <MediaUpload
                              bucketName="images"
                              folderPath="church_assets"
                              currentUrl={churchSettings.donation_pix_qrcode_url}
                              onUploadSuccess={(url) => setChurchSettings({ ...churchSettings, donation_pix_qrcode_url: url })}
                              label={lang === 'pt' ? 'QR Code do PIX' : 'PIX QR Code'}
                              maxSizeMB={2}
                              acceptedFormats="image/jpeg,image/png,image/webp"
                            />
                            {churchSettings.donation_pix_qrcode_url && (
                              <button
                                onClick={() => setChurchSettings({ ...churchSettings, donation_pix_qrcode_url: '' })}
                                className="mt-2 text-[10px] uppercase text-red-500 font-bold hover:underline"
                              >
                                {lang === 'pt' ? 'Remover QR Code' : 'Remove QR Code'}
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase mb-1 opacity-50">{lang === 'pt' ? 'Número MBWay' : 'MBWay Number'}</label>
                          <input
                            type="text"
                            value={churchSettings.donation_mbway_key}
                            onChange={(e) => setChurchSettings({ ...churchSettings, donation_mbway_key: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                            style={{ border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-primary)' }}
                            placeholder="Ex: +351 912 345 678"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase mb-1 opacity-50">{lang === 'pt' ? 'Transferência Bancária (IBAN)' : 'Bank Transfer (IBAN)'}</label>
                          <input
                            type="text"
                            value={churchSettings.donation_bank_transfer}
                            onChange={(e) => setChurchSettings({ ...churchSettings, donation_bank_transfer: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                            style={{ border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-primary)' }}
                            placeholder="Ex: PT50 1234..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <motion.button
                        onClick={handleSaveSettings}
                        className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white cursor-pointer"
                        style={{ backgroundColor: 'var(--accent)', boxShadow: '0 4px 15px var(--accent-light)' }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Save size={18} /> {lang === 'pt' ? 'Salvar Configurações' : 'Save Settings'}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          }

          {/* Notifications Tab */}
          {
            activeTab === 'notifications' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                    <Bell className="text-[var(--accent)]" size={28} />
                    {lang === 'pt' ? 'Notificações' : 'Notifications'}
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-sm font-bold text-white bg-red-500">
                        {notifications.filter(n => !n.read).length} {lang === 'pt' ? 'novas' : 'new'}
                      </span>
                    )}
                  </h1>
                  {notifications.some(n => !n.read) && (
                    <motion.button
                      onClick={async () => {
                        await supabase.from('notifications').update({ read: true }).eq('read', false);
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <CheckCheck size={16} />
                      {lang === 'pt' ? 'Marcar todas como lidas' : 'Mark all as read'}
                    </motion.button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {([
                    { key: 'all', label: lang === 'pt' ? 'Todos' : 'All', icon: '🔔' },
                    { key: 'event_participation', label: lang === 'pt' ? 'Participações' : 'Participations', icon: '🙌' },
                    { key: 'prayer_request', label: lang === 'pt' ? 'Orações' : 'Prayers', icon: '🙏' },
                    { key: 'new_member', label: lang === 'pt' ? 'Membros' : 'Members', icon: '👤' },
                    { key: 'comment', label: lang === 'pt' ? 'Comentários' : 'Comments', icon: '💬' },
                  ] as const).map(f => {
                    const count = f.key === 'all'
                      ? notifications.length
                      : notifications.filter(n => n.type === f.key).length;
                    const active = notifFilter === f.key;
                    return (
                      <motion.button
                        key={f.key}
                        onClick={() => setNotifFilter(f.key)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                        style={{
                          backgroundColor: active ? 'var(--accent)' : 'var(--bg-card)',
                          color: active ? 'white' : 'var(--text-secondary)',
                          border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                        }}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span>{f.icon}</span>
                        {f.label}
                        <span
                          className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : 'var(--bg-secondary)', color: active ? 'white' : 'var(--text-secondary)' }}
                        >
                          {count}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <div className={`transition-all duration-300 ${selectedNotification ? 'lg:mr-[440px]' : ''}`}>
                  {(() => {
                    const filtered = notifFilter === 'all'
                      ? notifications
                      : notifications.filter(n => n.type === notifFilter);
                    return filtered.length === 0 ? (
                      <div className="text-center py-20 opacity-40">
                        <Bell size={48} className="mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>{lang === 'pt' ? 'Nenhuma notificação encontrada.' : 'No notifications found.'}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filtered.map((notif, i) => {
                          const isSelected = selectedNotification?.id === notif.id;
                          return (
                            <motion.div
                              key={notif.id}
                              className="rounded-2xl p-5 flex items-start gap-4 cursor-pointer transition-all"
                              style={{
                                backgroundColor: isSelected ? 'var(--accent-light)' : notif.read ? 'var(--bg-card)' : 'var(--accent-light)',
                                border: isSelected ? '2px solid var(--accent)' : notif.read ? '1px solid var(--border)' : '1px solid var(--accent)',
                                boxShadow: '0 2px 10px var(--shadow)',
                              }}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                            >
                              {/* Clickable area: icon + text */}
                              <div
                                className="flex items-start gap-4 flex-1 min-w-0 cursor-pointer"
                                onClick={async () => {
                                  if (!notif.read) {
                                    await supabase.from('notifications').update({ read: true }).eq('id', notif.id);
                                    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                  }
                                  if (isSelected) { setSelectedNotification(null); return; }

                                  // Load the exact confirmation linked to this notification
                                  let conf = null;
                                  if (notif.type === 'prayer_request') {
                                    // Load from prayer_requests table
                                    if (notif.related_id) {
                                      const { data } = await supabase
                                        .from('prayer_requests')
                                        .select('*')
                                        .eq('id', notif.related_id)
                                        .maybeSingle();
                                      conf = data;
                                    } else {
                                      // Fall back: parse name/phone from the message body
                                      const msgText = notif.message || '';
                                      const nameMatch = msgText.match(/^([^(]+)/);
                                      const phoneMatch = msgText.match(/\(([^)]+)\)/);
                                      const prayerMatch = msgText.match(/oração: (.+)$/);
                                      conf = {
                                        name: nameMatch?.[1]?.trim() || '—',
                                        phone: phoneMatch?.[1]?.trim() || '—',
                                        message: prayerMatch?.[1]?.trim() || null,
                                      };
                                    }
                                    const enriched = { ...notif, confirmation: conf };
                                    setSelectedNotification(enriched);
                                    const pName = conf?.name || '';
                                    setWhatsappMsg(
                                      lang === 'pt'
                                        ? `Olá ${pName}! 🙏 Recebemos o seu pedido de oração e estamos intercedendo por você junto a Deus. Que o Senhor traga paz, cura e bênçãos para a sua vida. A Igreja Cristã está aqui por você! ❤️`
                                        : `Hello ${pName}! 🙏 We received your prayer request and we are interceding for you before God. May the Lord bring peace, healing and blessings to your life. The Church is here for you! ❤️`
                                    );
                                  } else if (notif.type === 'quiz_registration') {
                                    // Parse name from message: e.g. "😇 João começou a jogar..."
                                    const msgText = notif.message || '';
                                    const nameMatch = msgText.match(/^(?:.*?) (.+?) começou a jogar/);
                                    conf = { name: nameMatch?.[1]?.trim() || 'Desbravador' };
                                    const enriched = { ...notif, confirmation: conf };
                                    setSelectedNotification(enriched);
                                    setWhatsappMsg(
                                      lang === 'pt'
                                        ? `Olá ${conf.name}! 🎮🏆 Que alegria ver você se divertindo e aprendendo no nosso Quiz Bíblico! Esperamos que sua experiência fortaleça o seu conhecimento da Palavra de Deus de maneira descontraída e abençoada. Boa sorte nas próximas rodadas! ✨`
                                        : `Hello ${conf.name}! 🎮🏆 What a joy to see you having fun and learning in our Bible Quiz! We hope your experience strengthens your knowledge of God's Word in a relaxed and blessed way. Good luck on the next rounds! ✨`
                                    );
                                  } else if (notif.type === 'comment') {
                                    const msgText = notif.message || '';
                                    const nameMatch = msgText.match(/^(.+?) comentou/);
                                    conf = { name: nameMatch?.[1]?.trim() || 'Usuário' };
                                    const enriched = { ...notif, confirmation: conf };
                                    setSelectedNotification(enriched);
                                    setWhatsappMsg(
                                      lang === 'pt'
                                        ? `Olá ${conf.name}! ❤️ Agradecemos por interagir na nossa galeria! Ficamos muito felizes com o seu comentário. Que Deus continue te abençoando abundantemente! 🙏✨`
                                        : `Hello ${conf.name}! ❤️ Thank you for interacting in our gallery! We are very happy with your comment. May God continue to bless you abundantly! 🙏✨`
                                    );
                                  } else if (notif.type === 'quiz_achievement') {
                                    const msgText = notif.message || '';
                                    const nameMatch = msgText.match(/^(?:.*?) (.+?) finalizou o quiz/);
                                    conf = { name: nameMatch?.[1]?.trim() || 'Desbravador' };
                                    const enriched = { ...notif, confirmation: conf };
                                    setSelectedNotification(enriched);
                                    setWhatsappMsg(
                                      lang === 'pt'
                                        ? `Sensacional, ${conf.name}! 🏆 Vimos sua nova pontuação no Quiz Bíblico lá no ranking. Que Deus continue te dando muita sabedoria e graça! Glória a Deus por sua vida!`
                                        : `Awesome, ${conf.name}! 🏆 We saw your new Bible Quiz score on the ranking. May God continue to give you wisdom and grace! Glory to God for your life!`
                                    );
                                  } else {
                                    // event_participation
                                    if (notif.related_id) {
                                      const { data } = await supabase
                                        .from('event_confirmations')
                                        .select('*, events(title, date, time, location)')
                                        .eq('id', notif.related_id)
                                        .maybeSingle();
                                      conf = data;
                                    }
                                    const enriched = { ...notif, confirmation: conf };
                                    setSelectedNotification(enriched);
                                    const pName = conf?.name || '';
                                    const evTitle = conf?.events?.title || '';
                                    const evDate = conf?.events?.date ? new Date(`${conf.events.date}T00:00:00`).toLocaleDateString() : '';
                                    setWhatsappMsg(
                                      lang === 'pt'
                                        ? `Olá ${pName}! 🙌 Ficamos muito felizes com a sua confirmação de presença no evento "${evTitle}" no dia ${evDate}. Seja bem-vindo(a)! A Igreja Cristã agradece e aguarda você com muito amor. Deus abençoe! 🕊️`
                                        : `Hello ${pName}! 🙌 We're so glad you confirmed your attendance at "${evTitle}" on ${evDate}. You are welcome! God bless! 🕊️`
                                    );
                                  }
                                }}>
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                                  style={{ backgroundColor: notif.read && !isSelected ? 'var(--bg-secondary)' : 'var(--accent)', color: notif.read && !isSelected ? 'var(--text-secondary)' : 'white' }}
                                >
                                  {notif.type === 'event_participation' ? '🙌' : notif.type === 'new_member' ? '👤' : notif.type === 'prayer_request' ? '🙏' : notif.type === 'quiz_registration' ? '🎮' : notif.type === 'quiz_achievement' ? '🏆' : '🔔'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{notif.title}</p>
                                    <span className="text-xs shrink-0 opacity-50" style={{ color: 'var(--text-secondary)' }}>
                                      {notif.created_at ? new Date(notif.created_at).toLocaleString() : ''}
                                    </span>
                                  </div>
                                  <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{notif.message}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                {!notif.read && <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />}
                                <motion.button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await supabase.from('notifications').delete().eq('id', notif.id);
                                    setNotifications(prev => prev.filter(n => n.id !== notif.id));
                                    if (selectedNotification?.id === notif.id) setSelectedNotification(null);
                                  }}
                                  className="p-1.5 rounded-lg cursor-pointer opacity-40 hover:opacity-100 transition-opacity"
                                  style={{ color: '#ef4444' }}
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.9 }}
                                  title={lang === 'pt' ? 'Remover' : 'Remove'}
                                >
                                  <Trash2 size={14} />
                                </motion.button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  })()
                  }
                </div>

                {/* ── Detail Side Panel ── */}
                <AnimatePresence>
                  {selectedNotification && (
                    <motion.div
                      key="notif-panel"
                      className="fixed top-0 right-0 h-full w-full max-w-[420px] z-[150] flex flex-col overflow-y-auto"
                      style={{ backgroundColor: 'var(--bg-card)', boxShadow: '-8px 0 40px var(--shadow)', borderLeft: '1px solid var(--border)' }}
                      initial={{ x: '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '100%' }}
                      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between p-6 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
                        <h2 className="font-serif font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                          {selectedNotification.type === 'prayer_request'
                            ? (lang === 'pt' ? 'Pedido de Oração' : 'Prayer Request')
                            : (lang === 'pt' ? 'Perfil do Participante' : 'Participant Profile')}
                        </h2>
                        <button
                          onClick={() => setSelectedNotification(null)}
                          className="p-2 rounded-xl cursor-pointer transition hover:opacity-70"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="p-6 space-y-5 flex-1">
                        {/* Avatar + Name */}
                        <div className="flex flex-col items-center text-center gap-3 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                          <div
                            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg"
                            style={{ backgroundColor: selectedNotification.type === 'prayer_request' ? '#7c3aed' : 'var(--accent)' }}
                          >
                            {selectedNotification.type === 'prayer_request' ? '🙏' : (selectedNotification.confirmation?.name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-xl font-serif" style={{ color: 'var(--text-primary)' }}>
                              {selectedNotification.confirmation?.name || '—'}
                            </p>
                            <span className="text-xs px-3 py-1 rounded-full font-semibold mt-1 inline-block"
                              style={{
                                backgroundColor: selectedNotification.type === 'prayer_request' ? '#ede9fe' : 'var(--accent-light)',
                                color: selectedNotification.type === 'prayer_request' ? '#7c3aed' : 'var(--accent)'
                              }}>
                              {selectedNotification.type === 'prayer_request'
                                ? (lang === 'pt' ? '🙏 Pediu Oração' : '🙏 Requested Prayer')
                                : (lang === 'pt' ? '🙌 Confirmou Presença' : '🙌 Confirmed Attendance')}
                            </span>
                          </div>
                        </div>

                        {/* Info fields */}
                        <div className="space-y-3">
                          <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                            <Phone size={18} style={{ color: 'var(--accent)' }} />
                            <div>
                              <p className="text-xs opacity-50 mb-0.5" style={{ color: 'var(--text-secondary)' }}>WhatsApp / Telemovel</p>
                              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                {selectedNotification.confirmation?.phone || '—'}
                              </p>
                            </div>
                          </div>

                          {selectedNotification.confirmation?.email && (
                            <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                              <UserIcon size={18} style={{ color: 'var(--accent)' }} />
                              <div>
                                <p className="text-xs opacity-50 mb-0.5" style={{ color: 'var(--text-secondary)' }}>Email</p>
                                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                  {selectedNotification.confirmation.email}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Prayer-specific: show the prayer message */}
                          {selectedNotification.type === 'prayer_request' && selectedNotification.confirmation?.message && (
                            <div className="rounded-xl p-4" style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                              <p className="text-xs opacity-70 mb-1.5 font-semibold" style={{ color: '#7c3aed' }}>
                                {lang === 'pt' ? '🙏 Pedido de Oração' : '🙏 Prayer Request'}
                              </p>
                              <p className="text-sm leading-relaxed italic" style={{ color: '#4c1d95' }}>
                                &ldquo;{selectedNotification.confirmation.message}&rdquo;
                              </p>
                            </div>
                          )}

                          {/* Event participation: show event details */}
                          {selectedNotification.type !== 'prayer_request' && selectedNotification.confirmation?.events && (
                            <>
                              <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                                <Bell size={18} style={{ color: 'var(--accent)' }} />
                                <div>
                                  <p className="text-xs opacity-50 mb-0.5" style={{ color: 'var(--text-secondary)' }}>{lang === 'pt' ? 'Evento' : 'Event'}</p>
                                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                    {selectedNotification.confirmation.events.title}
                                  </p>
                                </div>
                              </div>
                              <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                                <Clock size={18} style={{ color: 'var(--accent)' }} />
                                <div>
                                  <p className="text-xs opacity-50 mb-0.5" style={{ color: 'var(--text-secondary)' }}>{lang === 'pt' ? 'Data e Hora' : 'Date & Time'}</p>
                                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                    {new Date(`${selectedNotification.confirmation.events.date}T00:00:00`).toLocaleDateString()} · {selectedNotification.confirmation.events.time?.slice(0, 5)}
                                  </p>
                                </div>
                              </div>
                              <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                                <MapPin size={18} style={{ color: 'var(--accent)' }} />
                                <div>
                                  <p className="text-xs opacity-50 mb-0.5" style={{ color: 'var(--text-secondary)' }}>{lang === 'pt' ? 'Local' : 'Location'}</p>
                                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                    {selectedNotification.confirmation.events.location || '—'}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}

                          <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                            <CheckCheck size={18} style={{ color: 'var(--accent)' }} />
                            <div>
                              <p className="text-xs opacity-50 mb-0.5" style={{ color: 'var(--text-secondary)' }}>{lang === 'pt' ? 'Recebido em' : 'Received at'}</p>
                              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                {selectedNotification.created_at ? new Date(selectedNotification.created_at).toLocaleString() : '—'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* WhatsApp message section */}
                        <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                          <div className="flex items-center gap-2">
                            <MessageCircle size={18} className="text-green-500" />
                            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                              {lang === 'pt' ? 'Mensagem de Agradecimento' : 'Thank You Message'}
                            </p>
                          </div>
                          <textarea
                            value={whatsappMsg}
                            onChange={e => setWhatsappMsg(e.target.value)}
                            rows={6}
                            className="w-full text-sm rounded-xl px-4 py-3 outline-none resize-none"
                            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                          />
                          <motion.a
                            href={`https://wa.me/${(selectedNotification.confirmation?.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMsg)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-white text-sm"
                            style={{ backgroundColor: '#25D366', display: 'flex' }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <MessageCircle size={18} />
                            {lang === 'pt' ? 'Enviar pelo WhatsApp' : 'Send via WhatsApp'}
                          </motion.a>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          }

          {/* My Profile Editor */}
          {
            activeTab === 'my_profile' && profileData && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto pb-10">
                <h1 className="font-serif text-3xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>
                  {lang === 'pt' ? 'Editar Meu Perfil' : 'Edit My Profile'}
                </h1>

                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Left Column: Avatar */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div className="relative inline-block group mb-4">
                        <div className="w-40 h-40 rounded-3xl overflow-hidden border-4 border-[var(--accent)] shadow-2xl mx-auto bg-[var(--bg-secondary)]">
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-5xl font-bold opacity-20">
                              {profileData.name?.charAt(0) || 'A'}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => avatarInputRef.current?.click()}
                          className="absolute -bottom-2 -right-2 p-3 rounded-2xl bg-[var(--accent)] text-white shadow-xl hover:scale-110 transition cursor-pointer"
                        >
                          <Plus size={20} />
                        </button>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setAvatarFile(file);
                              const reader = new FileReader();
                              reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                      <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{profileData.name}</h3>
                      <p className="text-xs opacity-50 font-bold uppercase tracking-widest mt-1">Status: Administrator</p>
                    </div>

                    <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <TrendingUp size={16} className="text-[var(--accent)]" /> Perfil Público
                      </h4>
                      <p className="text-xs opacity-60 leading-relaxed">
                        Essas informações estarão disponíveis se você for listado como líder ou em rankings da comunidade.
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Fields */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Nome Completo</label>
                          <div className="relative">
                            <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                            <input
                              type="text"
                              value={profileData.name || ''}
                              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none border border-[var(--border)] focus:ring-2 focus:ring-[var(--accent)]/30 transition-all"
                              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Email (Principal)</label>
                          <div className="relative">
                            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                            <input
                              type="email"
                              value={user?.email || ''}
                              disabled
                              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none border border-[var(--border)] opacity-40 cursor-not-allowed"
                              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Telefone / WhatsApp</label>
                          <div className="relative">
                            <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                            <input
                              type="tel"
                              value={profileData.phone || ''}
                              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none border border-[var(--border)] focus:ring-2 focus:ring-[var(--accent)]/30 transition-all"
                              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Instagram (Username ou Link)</label>
                          <div className="relative">
                            <MessageCircle size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                            <input
                              type="text"
                              value={profileData.social_instagram || ''}
                              onChange={(e) => setProfileData({ ...profileData, social_instagram: e.target.value })}
                              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none border border-[var(--border)] focus:ring-2 focus:ring-[var(--accent)]/30 transition-all"
                              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                              placeholder="@seuusuario"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Facebook (Link)</label>
                          <div className="relative">
                            <ImageIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                            <input
                              type="text"
                              value={profileData.social_facebook || ''}
                              onChange={(e) => setProfileData({ ...profileData, social_facebook: e.target.value })}
                              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none border border-[var(--border)] focus:ring-2 focus:ring-[var(--accent)]/30 transition-all"
                              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">YouTube (Link do Canal)</label>
                          <div className="relative">
                            <Play size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                            <input
                              type="text"
                              value={profileData.social_youtube || ''}
                              onChange={(e) => setProfileData({ ...profileData, social_youtube: e.target.value })}
                              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none border border-[var(--border)] focus:ring-2 focus:ring-[var(--accent)]/30 transition-all"
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
                              let finalAvatarUrl = profileData.avatar_url;

                              if (avatarFile) {
                                const ext = avatarFile.name.split('.').pop();
                                const path = `admin-${user?.id}-${Date.now()}.${ext}`;
                                const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatarFile);
                                if (upErr) throw upErr;
                                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
                                finalAvatarUrl = publicUrl;
                              }

                              const { error } = await supabase
                                .from('profiles')
                                .update({
                                  name: profileData.name,
                                  phone: profileData.phone,
                                  avatar_url: finalAvatarUrl,
                                  social_instagram: profileData.social_instagram,
                                  social_facebook: profileData.social_facebook,
                                  social_youtube: profileData.social_youtube,
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', user?.id);

                              if (error) throw error;
                              alert('Perfil atualizado com sucesso!');
                              setProfileData({ ...profileData, avatar_url: finalAvatarUrl });
                              setAvatarFile(null);
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
                            <><Save size={20} /> SALVAR ALTERAÇÕES NO PERFIL</>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          }
          {/* Participation Form Side Panel */}
          <AnimatePresence>
            {showParticipationForm && (
              <motion.div
                layoutId="participation-panel"
                className="fixed top-0 right-0 h-full w-full max-w-[420px] z-[150] flex flex-col overflow-y-auto shadow-2xl"
                style={{ backgroundColor: 'var(--bg-card)', borderLeft: '1px solid var(--border)' }}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              >
                <div className="flex items-center justify-between p-6 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
                  <h2 className="font-serif font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                    {lang === 'pt' ? 'Nova Participação' : 'New Participation'}
                  </h2>
                  <button
                    onClick={() => setShowParticipationForm(false)}
                    className="p-2 rounded-xl cursor-pointer transition hover:opacity-70"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 space-y-6 flex-1">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {lang === 'pt' ? 'Nome do Participante' : 'Participant Name'}
                      </label>
                      <input
                        type="text"
                        value={participationData.name}
                        onChange={(e) => setParticipationData({ ...participationData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none font-medium"
                        placeholder={lang === 'pt' ? 'Ex: João Silva' : 'Ex: John Doe'}
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {lang === 'pt' ? 'Telefone / WhatsApp' : 'Phone / WhatsApp'}
                      </label>
                      <input
                        type="text"
                        value={participationData.phone}
                        onChange={(e) => setParticipationData({ ...participationData, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        placeholder="+55 ..."
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>
                        Email (Opcional)
                      </label>
                      <input
                        type="email"
                        value={participationData.email}
                        onChange={(e) => setParticipationData({ ...participationData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        placeholder="email@exemplo.com"
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {lang === 'pt' ? 'Selecionar Evento' : 'Select Event'}
                      </label>
                      <select
                        value={participationData.event_id}
                        onChange={(e) => setParticipationData({ ...participationData, event_id: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      >
                        <option value="">{lang === 'pt' ? 'Selecione um evento' : 'Select an event'}</option>
                        {allEvents.map(event => (
                          <option key={event.id} value={event.id}>
                            {event.title} ({new Date(event.date).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <motion.button
                    onClick={handleSaveParticipation}
                    className="w-full py-4 rounded-xl font-bold text-white text-sm shadow-lg shadow-blue-500/20"
                    style={{ backgroundColor: 'var(--accent)' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {lang === 'pt' ? 'Cadastrar Participação' : 'Register Participation'}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
