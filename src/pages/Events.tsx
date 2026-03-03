import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, Play, ChevronLeft, ChevronRight, Video, Users, X, CheckCircle, Phone, User as UserIcon, ZoomIn } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ImageLightbox from '../components/ImageLightbox';
import { supabase } from '../supabase';

function getLocalized(str: string, lang: string): string {
  if (!str) return '';
  const parts = str.split('|');
  for (const part of parts) {
    if (part.startsWith(`${lang}:`)) return part.substring(lang.length + 1);
  }
  return parts[0]?.split(':')[1] || str;
}

interface ParticipateModalProps {
  event: any;
  lang: string;
  user: any;
  onClose: () => void;
}

function ParticipateModal({ event, lang, user, onClose }: ParticipateModalProps) {
  const [step, setStep] = useState<'form' | 'success'>(user ? 'success' : 'form');
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);

  // If member, immediately notify admin
  useEffect(() => {
    if (user) {
      notifyAdmin(user.name, user.email || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notifyAdmin = async (participantName: string, contact: string) => {
    const eventTitle = getLocalized(event.title, lang);
    const eventDate = new Date(`${event.date}T00:00:00`).toLocaleDateString();
    const eventTime = event.time?.slice(0, 5);

    // Save to event_confirmations and get the new row's ID
    const { data: confData } = await supabase.from('event_confirmations').insert([{
      event_id: event.id,
      name: participantName,
      phone: contact,
      email: email || user?.email || null,
    }]).select('id').single();

    // Auto-redirect to Google Calendar
    const eventLocation = getLocalized(event.location, lang);
    const eventDescription = getLocalized(event.description, lang);
    const startDate = event.date.replace(/-/g, '') + 'T' + event.time.replace(/:/g, '') + '00';
    // Assume 1 hour duration
    const endDate = event.date.replace(/-/g, '') + 'T' + (parseInt(event.time.split(':')[0]) + 1).toString().padStart(2, '0') + event.time.split(':')[1] + '00';

    const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(eventLocation)}`;

    setTimeout(() => {
      window.open(calendarUrl, '_blank');
    }, 1500);

    // Save notification for admin panel, linking to the confirmation row
    await supabase.from('notifications').insert([{
      type: 'event_participation',
      title: lang === 'pt' ? '🙌 Nova Confirmação de Presença' : '🙌 New Event Confirmation',
      message: `${participantName} confirmou presença no evento "${eventTitle}" — ${eventDate} às ${eventTime} | Contato: ${contact}`,
      read: false,
      related_id: confData?.id || null,
    }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setLoading(true);
    await notifyAdmin(name, phone);
    setLoading(false);
    setStep('success');
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--bg-card)' }}
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 p-2 rounded-full cursor-pointer transition"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
        >
          <X size={18} />
        </button>

        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                  <Users size={28} />
                </div>
                <h3 className="font-serif text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {lang === 'pt' ? 'Confirmar Participação' : 'Confirm Participation'}
                </h3>
                <p className="text-sm mt-1 opacity-60" style={{ color: 'var(--text-secondary)' }}>
                  {getLocalized(event.title, lang)}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    {lang === 'pt' ? 'Seu Nome' : 'Your Name'}
                  </label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-primary)' }} />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={lang === 'pt' ? 'Nome completo' : 'Full name'}
                      required
                      className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    {lang === 'pt' ? 'WhatsApp / Telemovel' : 'WhatsApp / Phone'}
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-primary)' }} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+244 9XX XXX XXX"
                      required
                      className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Email (Opcional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-white cursor-pointer mt-2 disabled:opacity-60"
                  style={{ backgroundColor: 'var(--accent)' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading
                    ? (lang === 'pt' ? 'Enviando...' : 'Sending...')
                    : (lang === 'pt' ? 'Confirmar Participação' : 'Confirm Participation')}
                </motion.button>
              </form>
            </motion.div>
          ) : (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.1 }}
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
              >
                <CheckCircle size={40} />
              </motion.div>
              <h3 className="font-serif text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                {lang === 'pt' ? 'Que bênção! 🙏' : 'What a blessing! 🙏'}
              </h3>
              <p className="text-sm leading-relaxed opacity-70 mb-6" style={{ color: 'var(--text-secondary)' }}>
                {user
                  ? (lang === 'pt'
                    ? `Que alegria ter você, ${user.name.split(' ')[0]}! Sua presença em "${getLocalized(event.title, lang)}" foi confirmada. Deus abençoe!`
                    : `What a joy to have you, ${user.name.split(' ')[0]}! Your presence at "${getLocalized(event.title, lang)}" is confirmed. God bless!`)
                  : (lang === 'pt'
                    ? `Obrigado pela confirmação! Aguardamos a sua presença em "${getLocalized(event.title, lang)}". Que Deus abençoe você!`
                    : `Thank you for confirming! We look forward to your presence at "${getLocalized(event.title, lang)}". God bless you!`)}
              </p>
              <div className="flex flex-col gap-3">
                <motion.button
                  onClick={() => {
                    const eventTitle = getLocalized(event.title, lang);
                    const eventLocation = getLocalized(event.location, lang);
                    const eventDescription = getLocalized(event.description, lang);
                    const startDate = event.date.replace(/-/g, '') + 'T' + event.time.replace(/:/g, '') + '00';
                    const endDate = event.date.replace(/-/g, '') + 'T' + (parseInt(event.time.split(':')[0]) + 1).toString().padStart(2, '0') + event.time.split(':')[1] + '00';
                    const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(eventLocation)}`;
                    window.open(calendarUrl, '_blank');
                  }}
                  className="w-full py-4 rounded-xl font-bold text-white text-sm shadow-lg flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#4285F4' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Calendar size={18} />
                  {lang === 'pt' ? 'Adicionar ao Google Agenda' : 'Add to Google Calendar'}
                </motion.button>


                <motion.button
                  onClick={onClose}
                  className="px-8 py-3 rounded-xl font-semibold opacity-60 hover:opacity-100 cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {lang === 'pt' ? 'Fechar' : 'Close'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export default function Events() {
  const { t, lang, user } = useApp();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [participateEvent, setParticipateEvent] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });
      if (data) setEvents(data);
    };
    fetchEvents();
  }, []);

  const months = lang === 'pt'
    ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    : lang === 'en'
      ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      : ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const weekDays = lang === 'pt'
    ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    : lang === 'en'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const eventDays = events.filter(e => {
    const d = new Date(`${e.date}T00:00:00`);
    return d.getMonth() === calendarMonth && d.getFullYear() === calendarYear;
  }).map(e => new Date(`${e.date}T00:00:00`).getDate());

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Lightbox */}
      <ImageLightbox
        src={lightboxImage?.src || ''}
        alt={lightboxImage?.alt || ''}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      {/* Participate Modal */}
      <AnimatePresence>
        {participateEvent && (
          <ParticipateModal
            event={participateEvent}
            lang={lang}
            user={user}
            onClose={() => setParticipateEvent(null)}
          />
        )}
      </AnimatePresence>

      {/* Hero */}
      <section
        className="py-24 px-4 text-center text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}
      >
        <motion.h1
          className="font-serif text-4xl sm:text-5xl font-bold mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {t('events.title')}
        </motion.h1>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full"><path d="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80Z" fill="var(--bg-primary)" /></svg>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <motion.div
            className="lg:col-span-1 rounded-2xl p-6 self-start"
            style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => {
                  if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); }
                  else setCalendarMonth(calendarMonth - 1);
                }}
                className="p-2 rounded-lg cursor-pointer hover:opacity-70 transition"
                style={{ color: 'var(--text-primary)' }}
              >
                <ChevronLeft size={20} />
              </button>
              <h3 className="font-serif text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {months[calendarMonth]} {calendarYear}
              </h3>
              <button
                onClick={() => {
                  if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); }
                  else setCalendarMonth(calendarMonth + 1);
                }}
                className="p-2 rounded-lg cursor-pointer hover:opacity-70 transition"
                style={{ color: 'var(--text-primary)' }}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(d => (
                <div key={d} className="text-center text-xs font-medium py-2" style={{ color: 'var(--text-secondary)' }}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
              {calendarDays.map(day => {
                const hasEvent = eventDays.includes(day);
                return (
                  <motion.button
                    key={day}
                    className="aspect-square rounded-lg flex items-center justify-center text-sm font-medium cursor-pointer transition-all"
                    style={{
                      backgroundColor: hasEvent ? 'var(--accent)' : 'transparent',
                      color: hasEvent ? 'white' : 'var(--text-primary)',
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {day}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Events List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-serif text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
              {t('events.upcoming')}
            </h2>
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                {/* Event Image Preview */}
                {event.image_url && (
                  <div
                    className="relative w-full overflow-hidden cursor-zoom-in group"
                    style={{ height: '180px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxImage({ src: event.image_url, alt: getLocalized(event.title, lang) });
                    }}
                  >
                    <img
                      src={event.image_url}
                      alt={getLocalized(event.title, lang)}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                      <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    {event.type === 'special' && (
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: 'var(--accent)' }}>
                        ★ {lang === 'pt' ? 'Especial' : 'Special'}
                      </span>
                    )}
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="font-serif font-bold text-white text-lg drop-shadow-lg line-clamp-1">
                        {getLocalized(event.title, lang)}
                      </h3>
                    </div>
                  </div>
                )}

                {/* Event Info Row */}
                <div
                  className="flex items-stretch cursor-pointer"
                  onClick={() => setSelectedEventId(selectedEventId === event.id ? null : event.id)}
                >
                  <div className="w-2 shrink-0" style={{ backgroundColor: event.color || 'var(--accent)' }} />
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        {!event.image_url && (
                          <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
                            {getLocalized(event.title, lang)}
                          </h3>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <span className="flex items-center gap-1"><Calendar size={14} style={{ color: 'var(--accent)' }} /> {new Date(`${event.date}T00:00:00`).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Clock size={14} style={{ color: 'var(--accent)' }} /> {event.time?.slice(0, 5)}</span>
                          <span className="flex items-center gap-1"><MapPin size={14} style={{ color: 'var(--accent)' }} /> {getLocalized(event.location || '', lang)}</span>
                        </div>
                        {(event.speaker || event.singers) && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs font-medium">
                            {event.speaker && (
                              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--accent)' }}>
                                <span className="opacity-70">📖</span> {event.speaker}
                              </span>
                            )}
                            {event.singers && (
                              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--accent)' }}>
                                <span className="opacity-70">🎤</span> {event.singers}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {event.is_live && (
                          <motion.button
                            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-white cursor-pointer"
                            style={{ backgroundColor: '#FF0000' }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); if (event.live_url) window.open(event.live_url, '_blank'); }}
                          >
                            <Play size={12} fill="white" /> {t('events.watch_live')}
                          </motion.button>
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {selectedEventId === event.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t overflow-hidden"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          {event.description && (
                            <p className="mb-4 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                              {getLocalized(event.description, lang)}
                            </p>
                          )}
                          {event.theme && (
                            <div className="mb-4 p-3 rounded-xl border-l-4 font-serif italic text-xs" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--accent)', color: 'var(--text-primary)' }}>
                              "{getLocalized(event.theme, lang)}"
                            </div>
                          )}
                          <div className="flex flex-wrap gap-3">
                            <motion.button
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer"
                              style={{ backgroundColor: 'var(--accent)' }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => { e.stopPropagation(); setParticipateEvent(event); }}
                            >
                              <Users size={14} />
                              {lang === 'pt' ? 'Participe' : 'Participate'}
                            </motion.button>
                            {event.is_live && event.live_url && (
                              <motion.button
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => { e.stopPropagation(); window.open(event.live_url, '_blank'); }}
                              >
                                <Video size={14} /> YouTube
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
            {events.length === 0 && (
              <p className="text-center opacity-50 py-12">
                {lang === 'pt' ? 'Nenhum evento agendado.' : 'No upcoming events.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
