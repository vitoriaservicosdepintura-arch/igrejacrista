import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Calendar, Clock, MapPin, Play, ChevronRight, Coins, Heart, Star, ArrowRight, BookOpen, Cross, Users, Music, ZoomIn, ScanLine, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { quizQuestions, dailyVerses } from '../i18n/translations';
import EventPopup from '../components/EventPopup';
import FloatingButtons from '../components/FloatingButtons';
import ImageLightbox from '../components/ImageLightbox';
import { supabase } from '../supabase';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';
import Particles from '@tsparticles/react';
import { QRCodeSVG } from 'qrcode.react';
import type { Container, Engine } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';

function getLocalized(str: string, lang: string): string {
  if (!str) return '';
  if (!str.includes('|')) return str;
  const parts = str.split('|');
  for (const part of parts) {
    if (part.startsWith(`${lang}:`)) return part.substring(lang.length + 1);
  }
  return parts[0]?.split(':')[1] || str;
}

export default function Home({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { t, lang, user, addCoins, churchSettings } = useApp();
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizPlayer, setQuizPlayer] = useState<{ id?: string; name: string; avatarUrl: string } | null>(null);
  const [quizLogForm, setQuizLogForm] = useState({ name: '', avatarUrl: '😇' });
  const [quizLoading, setQuizLoading] = useState(false);
  const [heroVerse, setHeroVerse] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [selectedHomeEvent, setSelectedHomeEvent] = useState<any | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [countdown, setCountdown] = useState<{ label: string; days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const { scrollY } = useScroll();
  const textY = useTransform(scrollY, [0, 400], [0, -80]);
  const textOpacity = useTransform(scrollY, [0, 350], [1, 0.1]);

  const [donationCategory, setDonationCategory] = useState<'Obras Sociais da Igreja' | 'Obras Sociais' | 'Dízimo' | 'Ofertas Online'>('Dízimo');
  const [donationAmount, setDonationAmount] = useState<string>('');
  const [donationMethod, setDonationMethod] = useState<'pix' | 'mbway' | 'transfer'>('pix');
  const [donationFullName, setDonationFullName] = useState('');
  const [donationEmail, setDonationEmail] = useState('');
  const [donationPhoneCode, setDonationPhoneCode] = useState('+351');
  const [donationPhone, setDonationPhone] = useState('');
  const [isProcessingDonation, setIsProcessingDonation] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setDonationFullName(user.name || '');
      setDonationEmail(user.email || '');
      // Try extracting country code if available
      // For simplicity, just set phone if you had it on user, 
      // but user interface only has name, email, role, coins.
    }
  }, [user]);

  const [dbQuestions, setDbQuestions] = useState<any[]>([]);
  const [dbSlides, setDbSlides] = useState<any[]>([]);
  const [dbVerses, setDbVerses] = useState<any[]>([]);

  const questions = dbQuestions.length > 0 ? dbQuestions : quizQuestions[lang];
  const verses = dailyVerses[lang];

  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  const particlesLoadedCb = useCallback(async (_container: Container | undefined) => { }, []);

  useEffect(() => {
    const idx = Math.floor(Date.now() / 86400000) % verses.length;
    setHeroVerse(idx);

    const fetchUpcomingEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(3);
      if (data) setUpcomingEvents(data);
    };
    fetchUpcomingEvents();

    // Countdown to next event
    const fetchNextEvent = async () => {
      const { data } = await supabase
        .from('events')
        .select('title, date, time')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(1)
        .single();
      if (data) {
        const update = () => {
          const eventDT = new Date(`${data.date}T${data.time}`);
          const diff = eventDT.getTime() - Date.now();
          if (diff > 0) {
            setCountdown({
              label: getLocalized(data.title, lang),
              days: Math.floor(diff / 86400000),
              hours: Math.floor((diff / 3600000) % 24),
              minutes: Math.floor((diff / 60000) % 60),
              seconds: Math.floor((diff / 1000) % 60),
            });
          } else {
            setCountdown(null);
          }
        };
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
      }
    };
    fetchNextEvent();
    const fetchQuizQuestions = async () => {
      const { data } = await supabase.from('quiz_questions').select('*').limit(30);
      if (data && data.length > 0) {
        // Map back to expected structure
        setDbQuestions(data.map(q => ({
          question: q.question,
          options: q.options,
          correct: q.correct_answer === 'A' ? 0 : q.correct_answer === 'B' ? 1 : q.correct_answer === 'C' ? 2 : 3,
          verse: 'Hebreus 4:12' // generic fallback
        })));
      }
    };
    fetchQuizQuestions();

    const fetchHeroData = async () => {
      const [{ data: slides }, { data: dbVersesData }] = await Promise.all([
        supabase.from('hero_slides').select('*').eq('active', true).order('sort_order', { ascending: true }),
        supabase.from('hero_verses').select('*').order('created_at', { ascending: false })
      ]);
      if (slides) setDbSlides(slides);
      if (dbVersesData) setDbVerses(dbVersesData);

      // Rotate random verse if not manually set in churchSettings
      if (dbVersesData && dbVersesData.length > 0 && !churchSettings.daily_verse_content) {
        const randomIdx = Math.floor(Math.random() * dbVersesData.length);
        setHeroVerse(randomIdx);
      }
    };
    fetchHeroData();
  }, [verses.length, churchSettings.daily_verse_content]);

  const handleAnswer = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    if (idx === questions[currentQuizIndex].correct) {
      setQuizScore(prev => prev + 10);
      if (user) addCoins(10);
    }
    setShowResult(true);
  };

  const handleStartQuizRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    const playerName = user?.name || quizLogForm.name;
    if (!playerName) return;
    setQuizLoading(true);
    try {
      const { data, error } = await supabase.from('quiz_players').insert([{
        name: playerName,
        avatar_url: quizLogForm.avatarUrl
      }]).select().single();

      if (error) throw error;

      setQuizPlayer({ id: data.id, name: data.name, avatarUrl: data.avatar_url });

      await supabase.from('notifications').insert([{
        type: 'quiz_registration',
        title: lang === 'pt' ? '🎮 Novo Jogador no Quiz' : '🎮 New Quiz Player',
        message: `${data.avatar_url} ${data.name} começou a jogar o Quiz Bíblico!`,
        read: false
      }]);

      setQuizStarted(true);
      setQuizScore(0);
      setCurrentQuizIndex(0);
      setSelectedAnswer(null);
      setShowResult(false);
    } catch (e) {
      console.error(e);
      // Fallback
      setQuizPlayer({ name: playerName, avatarUrl: quizLogForm.avatarUrl });
      setQuizStarted(true);
    } finally {
      setQuizLoading(false);
    }
  };

  const nextQuestion = async () => {
    if (currentQuizIndex < questions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setQuizLoading(true);
      if (quizPlayer?.id) {
        await supabase.from('quiz_players').update({ score: quizScore }).eq('id', quizPlayer.id);
        await supabase.from('notifications').insert([{
          type: 'quiz_achievement',
          title: lang === 'pt' ? '🏆 Conquista no Quiz!' : '🏆 Quiz Achievement!',
          message: `${quizPlayer.avatarUrl} ${quizPlayer.name} finalizou o quiz com ${quizScore} pontos!`,
          read: false
        }]);
      }
      setQuizLoading(false);
      setQuizStarted(false);
      setCurrentQuizIndex(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuizPlayer(null);
    }
  };

  const handleConfirmDonation = async () => {
    try {
      setIsProcessingDonation(true);

      const { data, error } = await supabase.from('donations').insert([{
        amount: Number(donationAmount) || 0,
        type: donationCategory,
        payment_method: donationMethod,
        status: 'completed'
      }]).select().single();

      if (error) throw error;

      if (data && data.id) {
        await supabase.from('notifications').insert([{
          type: 'donation',
          title: lang === 'pt' ? '🙌 Nova Doação' : '🙌 New Donation',
          message: lang === 'pt'
            ? `Doação confirmada! € ${donationAmount || 0} via ${donationMethod.toUpperCase()} na categoria ${donationCategory}.`
            : `Donation confirmed! €${donationAmount || 0} via ${donationMethod.toUpperCase()} under ${donationCategory}.`,
          related_id: data.id,
          read: false
        }]);
      }

      // Generate HTML Receipt for printing with Logo
      const printableReceipt = `
        <html>
          <head>
            <title>Recibo de Contribuição</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
              .logo { max-height: 80px; margin-bottom: 10px; }
              .title { font-size: 24px; font-weight: bold; margin: 0; }
              .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 16px; font-weight: bold; color: #555; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
              .label { font-weight: bold; }
              .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              ${churchSettings.logo_url ? `<img src="${churchSettings.logo_url}" class="logo" alt="Logo" />` : ''}
              <h1 class="title">${churchSettings.church_name || 'Igreja Local'}</h1>
              <div class="subtitle">Recibo de Contribuição na Obra</div>
            </div>
            
            <div class="section">
              <div class="row">
                <span class="label">Data e Hora:</span>
                <span>${new Date().toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Dados do Contribuinte</div>
              <div class="row"><span class="label">Nome:</span> <span>${donationFullName || 'Não informado'}</span></div>
              <div class="row"><span class="label">Email:</span> <span>${donationEmail || 'Não informado'}</span></div>
              <div class="row"><span class="label">Telemóvel:</span> <span>${donationPhone ? `${donationPhoneCode} ${donationPhone}` : 'Não informado'}</span></div>
            </div>

            <div class="section">
              <div class="section-title">Detalhes da Contribuição</div>
              <div class="row"><span class="label">Valor Informado:</span> <span style="font-weight: bold; font-size: 16px;">€ ${donationAmount || '0,00'}</span></div>
              <div class="row"><span class="label">Categoria:</span> <span>${donationCategory}</span></div>
              <div class="row"><span class="label">Método de Pagamento:</span> <span>${donationMethod.toUpperCase()}</span></div>
            </div>

            <div class="footer">
              <p>Muito obrigado pela sua generosidade!</p>
              <p><em>"A quem dá liberalmente, ainda se lhe acrescenta mais..." (Provérbios 11:24)</em></p>
            </div>
            
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printableReceipt);
        printWindow.document.close();
      } else {
        alert(lang === 'pt' ? 'Por favor, permita pop-ups para gerar o recibo.' : 'Please allow pop-ups to generate the receipt.');
      }

      setDonationSuccess(true);
      setTimeout(() => {
        setDonationSuccess(false);
        setDonationAmount('');
        setDonationCategory('Dízimo');
      }, 6000);

    } catch (err) {
      console.error('Error confirming donation:', err);
      alert(lang === 'pt' ? 'Erro ao confirmar doação.' : 'Error confirming donation.');
    } finally {
      setIsProcessingDonation(false);
    }
  };

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const pageVariants = {
    initial: { rotateY: -90, opacity: 0, transformOrigin: 'left center' as const },
    animate: { rotateY: 0, opacity: 1, transition: { duration: 0.8, ease: [0.6, 0.05, 0.01, 0.9] as [number, number, number, number] } },
    exit: { rotateY: 90, opacity: 0, transition: { duration: 0.5 } },
  };

  const stagger = {
    animate: { transition: { staggerChildren: 0.1 } },
  };

  const fadeUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
  };

  return (
    <div className="overflow-hidden">
      <EventPopup onNavigate={onNavigate} />
      <FloatingButtons />

      <ImageLightbox
        src={lightboxImage?.src || ''}
        alt={lightboxImage?.alt || ''}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      {/* ═══════════════ HERO ═══════════════ */}
      <section
        className="relative min-h-[100vh] flex items-center justify-center overflow-hidden transition-all duration-1000"
        style={{
          background: (churchSettings.hero_bg_type === 'color')
            ? ((churchSettings as any)[`hero_slide_bg_${currentSlideIndex + 1}`] || churchSettings.hero_bg_color)
            : churchSettings.hero_bg_gradient
        }}
      >
        {/* Subtle Luxury Overlay */}
        <div className="absolute inset-0 z-[1] bg-black/20 pointer-events-none" />

        {/* ── Full-screen Swiper background ── */}
        <div className="absolute inset-0 z-0 opacity-100">
          <Swiper
            modules={[Autoplay, EffectFade, Pagination]}
            effect="fade"
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            onSlideChange={(swiper) => setCurrentSlideIndex(swiper.realIndex)}
            loop
            speed={1200}
            className="w-full h-full hero-swiper"
          >
            {(dbSlides.length > 0 ? dbSlides : [
              {
                image_url: 'https://images.unsplash.com/photo-1445112098124-3e76dd67983c?w=1600&q=80',
                title: lang === 'pt' ? '✍️ Vivendo a Palavra' : lang === 'en' ? '✍️ Living the Word' : '✍️ Viviendo la Palabra'
              },
              {
                image_url: 'https://images.unsplash.com/photo-1548783300-1bfbfa5c694a?w=1600&q=80',
                title: lang === 'pt' ? '🕊️ Fé na Jornada' : lang === 'en' ? '🕊️ Faith in the Journey' : '🕊️ Fe en el Camino'
              },
              {
                image_url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1600&q=80',
                title: lang === 'pt' ? '🌅 Paz que Excede' : lang === 'en' ? '🌅 Peace Beyond Understanding' : '🌅 Paz que Sobrepasa'
              },
              {
                image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80',
                title: lang === 'pt' ? '💧 Água Viva' : lang === 'en' ? '💧 Living Water' : '💧 Agua Viva'
              },
              {
                image_url: 'https://images.unsplash.com/photo-1468186402973-e22a428b8d9b?w=1600&q=80',
                title: lang === 'pt' ? '🌟 Luz do Mundo' : lang === 'en' ? '🌟 Light of the World' : '🌟 Luz del Mundo'
              },
            ]).map((slide, i) => (
              <SwiperSlide key={i}>
                <div className="w-full h-full min-h-[100vh] relative">
                  {slide.image_url?.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video
                      src={slide.image_url}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${slide.image_url})` }}
                    />
                  )}
                </div>
                {/* Caption badge on slide */}
                {(slide.title || slide.caption) && (
                  <div className="absolute bottom-24 left-8 z-10 hidden md:block">
                    <span
                      className="px-4 py-1.5 rounded-full text-xs font-bold text-white tracking-widest uppercase"
                      style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)' }}
                    >
                      {slide.title || slide.caption}
                    </span>
                  </div>
                )}
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Gradient overlay for text legibility */}
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(10,5,25,0.55) 0%, rgba(10,5,25,0.4) 60%, rgba(10,5,25,0.7) 100%)' }}
          />
        </div>

        {/* ── tsParticles golden particles ── */}
        <div className="absolute inset-0 z-[11] pointer-events-none">
          <Particles
            id="tsparticles-hero"
            init={particlesInit}
            loaded={particlesLoadedCb}
            options={{
              fullScreen: { enable: false },
              background: { color: { value: 'transparent' } },
              fpsLimit: 60,
              particles: {
                number: { value: 55, density: { enable: true, area: 900 } },
                color: { value: ['#f5e6a3', '#ffffff', '#d4af37', '#fffde7'] },
                opacity: { value: { min: 0.1, max: 0.5 }, animation: { enable: true, speed: 0.6, minimumValue: 0.05 } },
                size: { value: { min: 1, max: 3 }, animation: { enable: true, speed: 1.5, minimumValue: 0.3 } },
                move: {
                  enable: true, direction: 'top',
                  speed: { min: 0.3, max: 0.9 },
                  random: true, straight: false,
                  outModes: { default: 'out' },
                },
                shape: { type: 'circle' },
                twinkle: { particles: { enable: true, frequency: 0.07, opacity: 1 } },
              },
              detectRetina: true,
            }}
            style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
          />
        </div>

        {/* ── Decorative floating icons ── */}
        <motion.div
          className="absolute top-24 left-10 opacity-15 z-20"
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Cross size={56} color="white" />
        </motion.div>
        <motion.div
          className="absolute bottom-28 right-10 opacity-10 z-20"
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        >
          <BookOpen size={72} color="white" />
        </motion.div>

        {/* ── Text content with parallax ── */}
        <motion.div
          className="relative z-20 max-w-5xl mx-auto px-6 text-center text-white py-32"
          style={{ y: textY, opacity: textOpacity }}
        >
          <motion.div variants={stagger} initial="initial" animate="animate">
            <motion.div variants={fadeUp} className="mb-6">
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <Star size={14} className="text-yellow-300" />
                {t('hero.verse_label')}
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight drop-shadow-2xl"
            >
              {churchSettings.hero_title}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg sm:text-xl opacity-90 mb-8 max-w-2xl mx-auto drop-shadow-md"
            >
              {churchSettings.hero_subtitle}
            </motion.p>

            <motion.blockquote
              variants={fadeUp}
              className="max-w-3xl mx-auto mb-10 p-6 rounded-2xl font-serif text-base sm:text-lg italic leading-relaxed"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              {churchSettings.daily_verse_content ? (
                <>
                  "{churchSettings.daily_verse_content}"
                  <span className="block mt-2 text-sm font-bold opacity-60">— {churchSettings.daily_verse_reference}</span>
                </>
              ) : dbVerses.length > 0 ? (
                <>
                  "{dbVerses[heroVerse]?.content}"
                  <span className="block mt-2 text-sm font-bold opacity-60">— {dbVerses[heroVerse]?.reference}</span>
                </>
              ) : verses[heroVerse]}
            </motion.blockquote>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                onClick={() => onNavigate('about')}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-base transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
                whileTap={{ scale: 0.95 }}
              >
                {t('hero.cta')}
                <ArrowRight size={18} />
              </motion.button>
              <motion.button
                onClick={() => onNavigate('events')}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-base border-2 border-white/30 hover:bg-white/10 transition-all cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Play size={18} />
                {t('events.watch_live')}
              </motion.button>
            </motion.div>

            {/* Countdown Timer */}
            {countdown && (
              <motion.div
                variants={fadeUp}
                className="mt-8 inline-block"
              >
                <p className="text-white/70 text-xs uppercase tracking-widest mb-3 font-medium">
                  {lang === 'pt' ? `⏳ Próximo: ${countdown.label}` : `⏳ Next: ${countdown.label}`}
                </p>
                <div className="flex items-center gap-3 sm:gap-5 justify-center">
                  {[
                    { v: countdown.days, l: lang === 'pt' ? 'Dias' : 'Days' },
                    { v: countdown.hours, l: lang === 'pt' ? 'Horas' : 'Hours' },
                    { v: countdown.minutes, l: lang === 'pt' ? 'Min' : 'Min' },
                    { v: countdown.seconds, l: lang === 'pt' ? 'Seg' : 'Sec' },
                  ].map((unit, i) => (
                    <div key={i} className="text-center">
                      <div
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-bold font-serif text-xl sm:text-2xl text-white"
                        style={{
                          background: 'rgba(255,255,255,0.15)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                        }}
                      >
                        {String(unit.v).padStart(2, '0')}
                      </div>
                      <div className="text-white/60 text-[10px] uppercase tracking-wider mt-1">{unit.l}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full">
            <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,55 1440,40 L1440,80 L0,80Z" fill="var(--bg-primary)" />
          </svg>
        </div>
      </section>

      {/* Features Strip */}
      <motion.section
        className="py-12 px-4"
        style={{ backgroundColor: 'var(--bg-primary)' }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: <BookOpen size={28} />, label: lang === 'pt' ? 'Palavra Viva' : lang === 'en' ? 'Living Word' : 'Palabra Viva', desc: lang === 'pt' ? 'Estudos diários' : lang === 'en' ? 'Daily studies' : 'Estudios diarios' },
            { icon: <Users size={28} />, label: lang === 'pt' ? 'Comunidade' : lang === 'en' ? 'Community' : 'Comunidad', desc: lang === 'pt' ? '+2.000 membros' : '+2,000 members' },
            { icon: <Music size={28} />, label: lang === 'pt' ? 'Louvor' : lang === 'en' ? 'Worship' : 'Alabanza', desc: lang === 'pt' ? 'Cultos vibrantes' : lang === 'en' ? 'Vibrant services' : 'Cultos vibrantes' },
            { icon: <Heart size={28} />, label: lang === 'pt' ? 'Amor' : lang === 'en' ? 'Love' : 'Amor', desc: lang === 'pt' ? 'Ação social' : lang === 'en' ? 'Social action' : 'Acción social' },
          ].map((f, i) => (
            <motion.div
              key={i}
              className="text-center p-6 rounded-2xl transition-all"
              style={{ backgroundColor: 'var(--bg-card)', boxShadow: `0 4px 20px var(--shadow)` }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="inline-flex p-3 rounded-xl mb-3" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                {f.icon}
              </div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{f.label}</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Video Section */}
      <motion.section
        className="py-20 px-4 paper-texture"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              {t('section.video')}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>{t('section.video_sub')}</p>
          </div>
          <motion.div
            className="relative aspect-video rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 20px 60px var(--shadow)' }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))',
              }}
            >
              <div className="text-center text-white">
                <motion.div
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)' }}
                  whileHover={{ scale: 1.1 }}
                  animate={{ boxShadow: ['0 0 0 0px rgba(200,164,90,0.4)', '0 0 0 20px rgba(200,164,90,0)', '0 0 0 0px rgba(200,164,90,0.4)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Play size={30} fill="white" />
                </motion.div>
                <p className="font-serif text-xl">{t('section.video')}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Events Section */}
      <motion.section
        className="py-20 px-4"
        style={{ backgroundColor: 'var(--bg-primary)' }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              {t('section.events')}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>{t('section.events_sub')}</p>
          </div>

          {/* Event Detail Modal */}
          <AnimatePresence>
            {selectedHomeEvent && (
              <motion.div
                className="fixed inset-0 z-[200] flex items-center justify-center px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedHomeEvent(null)} />
                <motion.div
                  className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
                  style={{ backgroundColor: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}
                  initial={{ scale: 0.9, y: 30, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, y: 30, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                  <button
                    onClick={() => setSelectedHomeEvent(null)}
                    className="absolute right-4 top-4 z-10 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>

                  {selectedHomeEvent.image_url ? (
                    <div
                      className="relative w-full cursor-zoom-in group"
                      style={{ height: '260px' }}
                      onClick={() => setLightboxImage({ src: selectedHomeEvent.image_url, alt: getLocalized(selectedHomeEvent.title, lang) })}
                    >
                      <img src={selectedHomeEvent.image_url} alt={getLocalized(selectedHomeEvent.title, lang)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="text-white w-10 h-10 drop-shadow-lg" />
                      </div>
                      {selectedHomeEvent.type === 'special' && (
                        <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: 'var(--accent)' }}>
                          ★ {lang === 'pt' ? 'Evento Especial' : 'Special Event'}
                        </span>
                      )}
                      <h2 className="absolute bottom-4 left-5 right-5 font-serif text-2xl font-bold text-white drop-shadow-lg">
                        {getLocalized(selectedHomeEvent.title, lang)}
                      </h2>
                    </div>
                  ) : (
                    <div className="w-full h-40 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}>
                      <h2 className="font-serif text-2xl font-bold text-white px-6 text-center">{getLocalized(selectedHomeEvent.title, lang)}</h2>
                    </div>
                  )}

                  <div className="p-6 sm:p-8">
                    <div className="flex flex-wrap gap-4 mb-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span className="flex items-center gap-1.5"><Calendar size={15} style={{ color: 'var(--accent)' }} /> {new Date(`${selectedHomeEvent.date}T00:00:00`).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      <span className="flex items-center gap-1.5"><Clock size={15} style={{ color: 'var(--accent)' }} /> {selectedHomeEvent.time?.slice(0, 5)}</span>
                      <span className="flex items-center gap-1.5"><MapPin size={15} style={{ color: 'var(--accent)' }} /> {getLocalized(selectedHomeEvent.location || '', lang)}</span>
                    </div>

                    {selectedHomeEvent.description && (
                      <p className="text-sm sm:text-base leading-relaxed mb-6 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                        {getLocalized(selectedHomeEvent.description, lang)}
                      </p>
                    )}

                    {selectedHomeEvent.theme && (
                      <div className="mb-6 p-4 rounded-2xl border-l-4 font-serif italic text-lg text-center" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--accent)', color: 'var(--text-primary)' }}>
                        <span className="block text-[10px] uppercase tracking-[0.2em] font-bold mb-2 opacity-50">Tema</span>
                        "{getLocalized(selectedHomeEvent.theme, lang)}"
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4 mb-8">
                      {selectedHomeEvent.speaker && (
                        <div className="p-6 rounded-3xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                          <div className="flex items-center gap-4 mb-3">
                            {selectedHomeEvent.speaker_photo_url ? (
                              <img src={selectedHomeEvent.speaker_photo_url} className="w-14 h-14 rounded-full object-cover border-2 border-[var(--accent)]" alt={selectedHomeEvent.speaker} />
                            ) : (
                              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--accent)] text-white shadow-lg">
                                <BookOpen size={20} />
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                                {lang === 'pt' ? 'Ministração' : 'Ministry'}
                              </p>
                              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selectedHomeEvent.speaker}</p>
                            </div>
                          </div>
                          {selectedHomeEvent.speaker_bio && (
                            <p className="text-xs leading-relaxed opacity-70 italic" style={{ color: 'var(--text-secondary)' }}>
                              {selectedHomeEvent.speaker_bio}
                            </p>
                          )}
                        </div>
                      )}

                      {selectedHomeEvent.singers && (
                        <div className="p-6 rounded-3xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                          <div className="flex items-center gap-4 mb-3">
                            {selectedHomeEvent.singer_photo_url ? (
                              <img src={selectedHomeEvent.singer_photo_url} className="w-14 h-14 rounded-full object-cover border-2 border-[var(--accent)]" alt={selectedHomeEvent.singers} />
                            ) : (
                              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--accent)] text-white shadow-lg">
                                <Music size={20} />
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                                {lang === 'pt' ? 'Louvor' : 'Worship'}
                              </p>
                              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selectedHomeEvent.singers}</p>
                            </div>
                          </div>
                          {selectedHomeEvent.singer_bio && (
                            <p className="text-xs leading-relaxed opacity-70 italic" style={{ color: 'var(--text-secondary)' }}>
                              {selectedHomeEvent.singer_bio}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <motion.button
                      onClick={() => { setSelectedHomeEvent(null); onNavigate('events'); }}
                      className="w-full py-3.5 rounded-xl font-bold text-white cursor-pointer"
                      style={{ backgroundColor: 'var(--accent)' }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {lang === 'pt' ? '🙌 Quero Participar!' : '🙌 I Want to Participate!'}
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid md:grid-cols-3 gap-6">
            {upcomingEvents.map((event: any, i: number) => (
              <motion.div
                key={i}
                className="rounded-2xl overflow-hidden cursor-pointer group"
                style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -8, boxShadow: '0 20px 50px var(--shadow)' }}
                onClick={() => setSelectedHomeEvent(event)}
              >
                {/* Event Image */}
                <div className="relative w-full overflow-hidden flex items-center justify-center bg-black" style={{ height: '260px' }}>
                  {event.image_url ? (
                    <>
                      {/* Blurred Background to fill empty gaps */}
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-40 blur-xl scale-110"
                        style={{ backgroundImage: `url(${event.image_url})` }}
                      />
                      {/* Crisp Proportional Poster */}
                      <img
                        src={event.image_url}
                        alt={getLocalized(event.title, lang)}
                        className="relative w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                      />
                    </>
                  ) : (
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}>
                      <Calendar size={48} className="opacity-20 text-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {event.type === 'special' && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: 'var(--accent)' }}>
                      ★ {lang === 'pt' ? 'Especial' : 'Special'}
                    </span>
                  )}
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="font-serif font-bold text-white text-base drop-shadow-lg line-clamp-2">
                      {getLocalized(event.title, lang)}
                    </h3>
                  </div>
                </div>

                {/* Event Details */}
                <div className="p-5">
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <Calendar size={13} style={{ color: 'var(--accent)' }} />
                      {new Date(`${event.date}T00:00:00`).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <Clock size={13} style={{ color: 'var(--accent)' }} />
                      {event.time?.slice(0, 5)}
                    </div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <MapPin size={13} style={{ color: 'var(--accent)' }} />
                      <span className="truncate">{getLocalized(event.location || '', lang)}</span>
                    </div>
                  </div>

                  {event.description && (
                    <p className="text-xs leading-relaxed mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {getLocalized(event.description, lang)}
                    </p>
                  )}

                  <motion.button
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer"
                    style={{ backgroundColor: 'var(--accent)' }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={(e) => { e.stopPropagation(); setSelectedHomeEvent(event); }}
                  >
                    {lang === 'pt' ? 'Ver Detalhes & Participar' : 'See Details & Join'}
                  </motion.button>
                </div>
              </motion.div>
            ))}
            {upcomingEvents.length === 0 && (
              <div className="col-span-full py-12 text-center opacity-50">
                {lang === 'pt' ? 'Nenhum evento próximo.' : 'No upcoming events.'}
              </div>
            )}
          </div>
          <div className="text-center mt-8">
            <motion.button
              onClick={() => onNavigate('events')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium cursor-pointer"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
              whileHover={{ scale: 1.05 }}
            >
              {t('events.calendar')}
              <ChevronRight size={16} />
            </motion.button>
          </div>
        </div>
      </motion.section>

      {/* Quiz Section */}
      <motion.section
        id="quiz-section"
        className="py-20 px-4 paper-texture"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              {t('section.quiz')}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>{t('section.quiz_sub')}</p>
          </div>

          <motion.div
            className="rounded-2xl p-8"
            style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 8px 40px var(--shadow)', border: '1px solid var(--border)' }}
          >
            {!quizStarted ? (
              <div className="max-w-md mx-auto py-8 text-center">
                <motion.div
                  className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ backgroundColor: 'var(--accent-light)' }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Coins size={40} style={{ color: 'var(--accent)' }} />
                </motion.div>
                <h3 className="font-serif text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {t('section.quiz')}
                </h3>
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                  {questions.length} {t('quiz.question').toLowerCase()}s • {t('quiz.coins_earned')}: 10/✓
                </p>

                <form onSubmit={handleStartQuizRegistration} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {lang === 'pt' ? 'Escolha seu Avatar' : 'Choose your Avatar'}
                    </label>
                    <div className="flex flex-wrap gap-2 justify-center mb-2">
                      {['😇', '👼', '🕊️', '🐑', '🙏', '👑', '🛡️', '⚔️', '👨‍🏫', '👩‍🏫'].map(emoji => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() => setQuizLogForm(f => ({ ...f, avatarUrl: emoji }))}
                          className={`text-2xl p-2 rounded-xl transition-all cursor-pointer ${quizLogForm.avatarUrl === emoji ? 'bg-[var(--accent)] shadow-lg scale-110' : 'bg-[var(--bg-secondary)] hover:bg-[var(--accent-light)]'}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  {user ? (
                    <div className="p-4 rounded-xl flex items-center justify-center gap-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {lang === 'pt' ? 'Participando como:' : 'Playing as:'} {user.name}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {lang === 'pt' ? 'Seu Nome / Apelido' : 'Your Name / Nickname'}
                      </label>
                      <input
                        type="text"
                        required
                        value={quizLogForm.name}
                        onChange={(e) => setQuizLogForm(f => ({ ...f, name: e.target.value }))}
                        placeholder={lang === 'pt' ? 'Ex: João Silva' : 'Ex: John Smith'}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none font-medium"
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                    </div>
                  )}
                  <motion.button
                    type="submit"
                    disabled={quizLoading}
                    className="w-full py-3.5 rounded-xl font-bold text-white cursor-pointer mt-4 flex justify-center items-center gap-2"
                    style={{ backgroundColor: 'var(--accent)' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {quizLoading ? (lang === 'pt' ? 'Iniciando...' : 'Starting...') : (lang === 'pt' ? 'Começar Aventura' : 'Start Adventure')}
                  </motion.button>
                </form>
              </div>
            ) : (
              <div>
                {/* Progress */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{quizPlayer?.avatarUrl}</span>
                    <div>
                      <span className="block font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{quizPlayer?.name}</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {t('quiz.question')} {currentQuizIndex + 1}/{questions.length}
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                    <Coins size={16} /> {quizScore}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full mb-8" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: 'var(--accent)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuizIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuizIndex}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                  >
                    <h3 className="font-serif text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                      {questions[currentQuizIndex].question}
                    </h3>
                    <div className="space-y-3">
                      {questions[currentQuizIndex].options.map((opt: string, idx: number) => {
                        let bgColor = 'var(--bg-secondary)';
                        let borderCol = 'var(--border)';
                        if (selectedAnswer !== null) {
                          if (idx === questions[currentQuizIndex].correct) {
                            bgColor = '#d4edda';
                            borderCol = '#28a745';
                          } else if (idx === selectedAnswer && idx !== questions[currentQuizIndex].correct) {
                            bgColor = '#f8d7da';
                            borderCol = '#dc3545';
                          }
                        }
                        return (
                          <motion.button
                            key={idx}
                            onClick={() => handleAnswer(idx)}
                            className="w-full text-left px-5 py-4 rounded-xl transition-all font-medium cursor-pointer"
                            style={{
                              backgroundColor: bgColor,
                              border: `2px solid ${borderCol}`,
                              color: 'var(--text-primary)',
                            }}
                            whileHover={selectedAnswer === null ? { scale: 1.02, x: 5 } : {}}
                            whileTap={selectedAnswer === null ? { scale: 0.98 } : {}}
                          >
                            <span className="mr-3 font-bold" style={{ color: 'var(--accent)' }}>
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            {opt}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence>
                  {showResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6"
                    >
                      <div
                        className="p-4 rounded-xl mb-4"
                        style={{
                          backgroundColor: selectedAnswer === questions[currentQuizIndex].correct ? '#d4edda' : '#f8d7da',
                          color: selectedAnswer === questions[currentQuizIndex].correct ? '#155724' : '#721c24',
                        }}
                      >
                        <p className="font-semibold mb-2">
                          {selectedAnswer === questions[currentQuizIndex].correct ? t('quiz.correct') : t('quiz.incorrect')}
                        </p>
                        <p className="text-sm italic">{questions[currentQuizIndex].verse}</p>
                      </div>
                      <motion.button
                        onClick={nextQuestion}
                        className="w-full py-3 rounded-xl font-semibold text-white cursor-pointer"
                        style={{ backgroundColor: 'var(--accent)' }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {currentQuizIndex < questions.length - 1 ? t('quiz.next') : t('quiz.finish')}
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </motion.section>

      {/* Donation Section */}
      <motion.section
        className="py-20 px-4"
        style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-6xl mx-auto text-center text-white">
          <motion.h2
            className="font-serif text-3xl sm:text-4xl font-bold mb-3"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {t('section.donate')}
          </motion.h2>

          {/* Check if donation is configured */}
          {!(churchSettings.donation_pix_key && churchSettings.donation_mbway_key && churchSettings.donation_bank_transfer) ? (
            /* ── EM MANUTENÇÃO ── */
            <motion.div
              className="mt-4 flex flex-col items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div
                className="inline-flex flex-col items-center gap-3 px-10 py-8 rounded-3xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <motion.div
                  animate={{ rotate: [0, -5, 5, -5, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
                  className="text-5xl"
                >
                  🔧
                </motion.div>
                <p className="font-bold text-xl tracking-widest uppercase opacity-80">
                  EM MANUTENÇÃO
                </p>
                <p className="text-sm opacity-50 max-w-xs">
                  {lang === 'pt'
                    ? 'As opções de doação serão disponibilizadas em breve.'
                    : lang === 'en'
                      ? 'Donation options will be available soon.'
                      : 'Las opciones de donación estarán disponibles pronto.'}
                </p>
              </div>
            </motion.div>
          ) : (
            /* ── Donation Form ── */
            <>
              <p className="opacity-90 mb-12">{t('section.donate_sub')}</p>
              <div className="max-w-xl mx-auto">
                <motion.div
                  className="rounded-3xl p-6 sm:p-8 relative overflow-hidden"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 60px rgba(0,0,0,0.3)' }}
                >
                  <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }} />

                  <AnimatePresence mode="wait">
                    {donationSuccess ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-12 text-center"
                      >
                        <motion.div
                          className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                          style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)', color: 'var(--accent)' }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', bounce: 0.5 }}
                        >
                          <CheckCircle2 size={48} />
                        </motion.div>
                        <h3 className="font-serif text-3xl font-bold mb-4">{lang === 'pt' ? 'Deus abençoe sua generosidade!' : 'God bless your generosity!'}</h3>
                        <p className="opacity-80 text-lg max-w-lg mb-8">
                          {lang === 'pt'
                            ? 'Seu pagamento foi confirmado e o recibo foi baixado.'
                            : 'Your payment has been confirmed and the receipt downloaded.'}
                        </p>
                        <button
                          onClick={() => setDonationSuccess(false)}
                          className="px-8 py-3 rounded-xl font-bold transition text-sm cursor-pointer"
                          style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                        >
                          {lang === 'pt' ? 'Fazer Nova Contribuição' : 'Make Another Contribution'}
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="form"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-8 text-left"
                      >
                        {/* 1. PURPOSE */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-3 opacity-70">
                            {lang === 'pt' ? '1. Propósito da Contribuição' : '1. Contribution Purpose'}
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {['Dízimo', 'Ofertas Online', 'Obras Sociais', 'Obras Sociais da Igreja'].map((cat) => (
                              <button
                                key={cat}
                                onClick={() => setDonationCategory(cat as any)}
                                className={`px-3 py-2 text-xs rounded-xl font-semibold transition-all border cursor-pointer flex items-center justify-center text-center ${donationCategory === cat ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10' : 'border-white/20 hover:border-white/50 bg-black/20 text-white/80'}`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 2. DONOR DETAILS */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-3 opacity-70">
                            {lang === 'pt' ? '2. Seus Dados' : '2. Your Details'}
                          </label>
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={donationFullName}
                              onChange={(e) => setDonationFullName(e.target.value)}
                              placeholder={lang === 'pt' ? 'Nome Completo' : 'Full Name'}
                              className="w-full bg-black/30 border border-white/20 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:border-[var(--accent)] transition-colors"
                            />
                            <input
                              type="email"
                              value={donationEmail}
                              onChange={(e) => setDonationEmail(e.target.value)}
                              placeholder={lang === 'pt' ? 'Email' : 'Email'}
                              className="w-full bg-black/30 border border-white/20 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:border-[var(--accent)] transition-colors"
                            />
                            <div className="flex gap-2">
                              <select
                                value={donationPhoneCode}
                                onChange={(e) => setDonationPhoneCode(e.target.value)}
                                className="bg-black/30 border border-white/20 rounded-xl py-3 px-3 text-sm font-medium outline-none focus:border-[var(--accent)] transition-colors w-[100px]"
                              >
                                <option value="+351">🇵🇹 +351</option>
                                <option value="+55">🇧🇷 +55</option>
                                <option value="+1">🇺🇸 +1</option>
                              </select>
                              <input
                                type="tel"
                                value={donationPhone}
                                onChange={(e) => setDonationPhone(e.target.value)}
                                placeholder={lang === 'pt' ? 'Telemóvel' : 'Mobile Number'}
                                className="flex-1 bg-black/30 border border-white/20 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:border-[var(--accent)] transition-colors"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 3. AMOUNT */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-3 opacity-70">
                            {lang === 'pt' ? '3. Valor (Opcional para recibo)' : '3. Amount (Optional for receipt)'}
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-lg opacity-50">€</span>
                            <input
                              type="number"
                              value={donationAmount}
                              onChange={(e) => setDonationAmount(e.target.value)}
                              placeholder="0,00"
                              className="w-full bg-black/30 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-lg font-bold outline-none focus:border-[var(--accent)] transition-colors"
                            />
                          </div>
                        </div>

                        {/* 4. METHOD */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-3 opacity-70">
                            {lang === 'pt' ? '4. Forma de Pagamento' : '4. Payment Method'}
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            <button
                              onClick={() => setDonationMethod('pix')}
                              className={`flex flex-col items-center justify-center py-4 px-2 rounded-xl border transition-all cursor-pointer ${donationMethod === 'pix' ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-white/10 bg-black/20 hover:bg-black/40'}`}
                            >
                              <span className="text-2xl mb-1">📱</span>
                              <span className="font-bold text-[10px] uppercase">PIX</span>
                            </button>
                            <button
                              onClick={() => setDonationMethod('mbway')}
                              className={`flex flex-col items-center justify-center py-4 px-2 rounded-xl border transition-all cursor-pointer ${donationMethod === 'mbway' ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-white/10 bg-black/20 hover:bg-black/40'}`}
                            >
                              <span className="text-2xl mb-1">📲</span>
                              <span className="font-bold text-[10px] uppercase">MBWay</span>
                            </button>
                            <button
                              onClick={() => setDonationMethod('transfer')}
                              className={`flex flex-col items-center justify-center py-4 px-2 rounded-xl border transition-all cursor-pointer ${donationMethod === 'transfer' ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-white/10 bg-black/20 hover:bg-black/40'}`}
                            >
                              <span className="text-2xl mb-1">🏦 🇵🇹</span>
                              <span className="font-bold text-[10px] uppercase text-center line-clamp-1">{lang === 'pt' ? 'Transferência' : 'Transfer'}</span>
                            </button>
                          </div>
                        </div>

                        {/* 4. DETAILS */}
                        <div className="p-6 sm:p-8 rounded-2xl bg-black/30 border border-white/10">
                          {donationMethod === 'pix' && (
                            <div className="flex flex-col sm:flex-row items-center gap-8">
                              {churchSettings.donation_pix_key ? (
                                <>
                                  <div className="p-4 bg-white rounded-2xl w-32 h-32 flex items-center justify-center shrink-0">
                                    {churchSettings.donation_pix_qrcode_url ? (
                                      <img src={churchSettings.donation_pix_qrcode_url} alt="QR Code PIX" className="max-w-full max-h-full object-contain" />
                                    ) : (
                                      <QRCodeSVG value={churchSettings.donation_pix_key} size={100} />
                                    )}
                                  </div>
                                  <div className="flex-1 text-center sm:text-left">
                                    <h4 className="font-bold text-lg mb-2">{lang === 'pt' ? 'Escaneie o QR Code' : 'Scan the QR Code'}</h4>
                                    <p className="text-sm opacity-70 mb-4">{lang === 'pt' ? 'Abra o app do seu banco e escaneie o código, ou copie a chave abaixo.' : 'Open your bank app and scan the code, or copy the key below.'}</p>
                                    <div className="flex items-center justify-between bg-black/50 p-4 rounded-xl border border-white/10 cursor-pointer hover:bg-white/5 transition"
                                      onClick={() => {
                                        navigator.clipboard.writeText(churchSettings.donation_pix_key || '');
                                        alert(lang === 'pt' ? 'Chave copiada!' : 'Key copied!');
                                      }}
                                    >
                                      <span className="font-mono text-sm sm:text-base font-bold truncate max-w-[200px] sm:max-w-xs">{churchSettings.donation_pix_key}</span>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <p className="opacity-50 text-center w-full">{lang === 'pt' ? 'Chave PIX não configurada.' : 'PIX key not configured.'}</p>
                              )}
                            </div>
                          )}

                          {donationMethod === 'mbway' && (
                            <div className="text-center sm:text-left">
                              {churchSettings.donation_mbway_key ? (
                                <>
                                  <h4 className="font-bold text-lg mb-2">{lang === 'pt' ? 'Enviar via MBWay' : 'Send via MBWay'}</h4>
                                  <p className="text-sm opacity-70 mb-4">{lang === 'pt' ? 'Abra seu app MBWay e envie para o número abaixo.' : 'Open your MBWay app and send to the number below.'}</p>
                                  <div className="flex items-center justify-between bg-black/50 p-4 rounded-xl border border-white/10 cursor-pointer hover:bg-white/5 transition max-w-md"
                                    onClick={() => {
                                      navigator.clipboard.writeText(churchSettings.donation_mbway_key || '');
                                      alert(lang === 'pt' ? 'Número copiado!' : 'Number copied!');
                                    }}
                                  >
                                    <span className="font-mono text-lg font-bold">{churchSettings.donation_mbway_key}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                  </div>
                                </>
                              ) : (
                                <p className="opacity-50 text-center w-full">{lang === 'pt' ? 'Número MBWay não configurado.' : 'MBWay number not configured.'}</p>
                              )}
                            </div>
                          )}

                          {donationMethod === 'transfer' && (
                            <div className="text-center sm:text-left">
                              {churchSettings.donation_bank_transfer ? (
                                <>
                                  <h4 className="font-bold text-lg mb-2">{lang === 'pt' ? 'Transferência Bancária' : 'Bank Transfer'}</h4>
                                  <p className="text-sm opacity-70 mb-4">{lang === 'pt' ? 'Transfira para o IBAN abaixo e guarde seu comprovante.' : 'Transfer to the IBAN below and keep your receipt.'}</p>
                                  <div className="flex items-center justify-between bg-black/50 p-4 rounded-xl border border-white/10 cursor-pointer hover:bg-white/5 transition"
                                    onClick={() => {
                                      navigator.clipboard.writeText(churchSettings.donation_bank_transfer || '');
                                      alert(lang === 'pt' ? 'IBAN copiado!' : 'IBAN copied!');
                                    }}
                                  >
                                    <span className="font-mono text-sm sm:text-base font-bold break-all">{churchSettings.donation_bank_transfer}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-4 shrink-0"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                  </div>
                                </>
                              ) : (
                                <p className="opacity-50 text-center w-full">{lang === 'pt' ? 'IBAN não configurado.' : 'IBAN not configured.'}</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* CONFIRM BUTTON */}
                        <motion.button
                          onClick={handleConfirmDonation}
                          disabled={isProcessingDonation}
                          className="w-full py-5 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-3 cursor-pointer shadow-xl disabled:opacity-50"
                          style={{ backgroundColor: 'var(--accent)' }}
                          whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {isProcessingDonation ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <Heart size={24} />
                              {lang === 'pt' ? 'Confirmar Contribuição' : 'Confirm Contribution'}
                            </>
                          )}
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </>
          )}
        </div>
      </motion.section>
    </div>
  );
}
