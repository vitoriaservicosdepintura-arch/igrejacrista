import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, Play, Star, MessageSquare, Send, Calendar, Tag, Heart, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabase';

type FilterType = 'all' | 'worship' | 'events' | 'community' | 'batismo';

export default function Gallery() {
  const { t, lang } = useApp();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);

  const fetchGallery = async () => {
    const { data } = await supabase
      .from('gallery_images')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data);
  };

  useEffect(() => {
    fetchGallery();
    const sub = supabase.channel('gallery_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_images' }, () => fetchGallery())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('gallery.filter_all') },
    { key: 'worship', label: t('gallery.filter_worship') },
    { key: 'events', label: t('gallery.filter_events') },
    { key: 'community', label: t('gallery.filter_community') },
    { key: 'batismo', label: 'Batismo' },
  ];

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const filtered = filter === 'all' ? items : items.filter(item => item.category === filter);
  const selectedItem = items.find(i => i.id === selectedId);

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Hero Section */}
      <section className="relative h-[40vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&q=80"
            className="w-full h-full object-cover opacity-10"
            alt="background"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bg-primary)]/80 to-[var(--bg-primary)]" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-[var(--accent)] font-black tracking-[0.4em] text-[10px] uppercase mb-4 px-4 py-1.5 rounded-full bg-[var(--accent)]/5 border border-[var(--accent)]/20 shadow-[0_0_20px_rgba(var(--accent-rgb),0.1)] inline-block">
              Mural de Testemunhos & Fé
            </span>
            <h1 className="font-serif text-5xl md:text-7xl font-black mb-10 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {t('gallery.title')}
            </h1>
          </motion.div>

          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-3">
            {filters.map((f) => (
              <motion.button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all cursor-pointer border-2`}
                style={{
                  backgroundColor: filter === f.key ? 'var(--accent)' : 'transparent',
                  color: filter === f.key ? 'white' : 'var(--text-secondary)',
                  borderColor: filter === f.key ? 'var(--accent)' : 'var(--border)',
                }}
                whileHover={{ scale: 1.05 }}
              >
                {f.label}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Grid with inline interaction */}
      <section className="px-4 max-w-7xl mx-auto mt-4 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-12">
          <AnimatePresence mode='popLayout'>
            {filtered.map((item) => {
              const videoUrl = item.video_url || item.image_url || '';
              const isVideo = item.media_type === 'video' || videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
              const ytId = isVideo ? getYouTubeId(videoUrl) : null;
              const thumb = isVideo ? (ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : item.thumbnail_url || item.image_url) : item.image_url;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-[40px] overflow-hidden shadow-2xl border border-gray-100 flex flex-col"
                >
                  {/* Top: Media Area */}
                  <div
                    className="relative h-[300px] overflow-hidden cursor-pointer group"
                    onClick={() => setSelectedId(item.id)}
                  >
                    {isVideo && !thumb ? (
                      <video src={`${videoUrl}#t=0.5`} className="w-full h-full object-cover" preload="metadata" />
                    ) : (
                      <img
                        src={thumb || 'https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&q=80'}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100">
                        {isVideo ? <Play size={24} className="text-white fill-white" /> : <ZoomIn size={24} className="text-white" />}
                      </div>
                    </div>
                    {/* Floating Info */}
                    <div className="absolute top-6 left-6 flex gap-2">
                      <span className="px-3 py-1 bg-black/50 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-tighter rounded-lg border border-white/10">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Title & Stats */}
                  <div className="p-8 border-b border-gray-50">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <h3 className="text-xl font-black text-gray-900 leading-tight">
                        {item.title || 'Visão do Reino'}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-yellow-500 text-sm font-black bg-yellow-50 px-2 py-1 rounded-lg">
                          <Star size={14} className="fill-yellow-500" />
                          {item.avg_rating > 0 ? Number(item.avg_rating).toFixed(1) : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Inline Comments Section */}
                  <div className="flex flex-col flex-1 bg-gray-50/30">
                    {/* List of comments (Fixed height scrollable) */}
                    <div className="p-8 h-[250px] overflow-y-auto space-y-4 custom-scrollbar">
                      <div className="flex items-center gap-2 mb-4 opacity-40">
                        <MessageSquare size={14} className="text-gray-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Comentários Recentes</span>
                      </div>
                      <GalleryComments itemId={item.id} />
                    </div>

                    {/* Inline Input Form */}
                    <div className="p-8 bg-white border-t border-gray-50 mt-auto">
                      <CommentForm itemId={item.id} category={item.category} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </section>

      {/* Legacy Lightbox keeping for media zoom only */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setSelectedId(null)} />
            <motion.div className="relative w-full max-w-5xl h-[80vh] flex items-center justify-center">
              <button onClick={() => setSelectedId(null)} className="absolute -top-12 right-0 text-white"><X size={32} /></button>
              {(() => {
                const videoUrl = selectedItem.video_url || selectedItem.image_url || '';
                const isVideo = selectedItem.media_type === 'video' || videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
                const ytId = isVideo ? getYouTubeId(videoUrl) : null;
                if (isVideo && ytId) return <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} className="w-full h-full border-none" allowFullScreen />;
                if (isVideo) return <video src={videoUrl} controls autoPlay className="max-w-full max-h-full" />;
                return <img src={selectedItem.image_url} className="w-full h-full object-contain" />;
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GalleryComments({ itemId }: { itemId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    const { data } = await supabase.from('gallery_comments').select('*').eq('gallery_item_id', itemId).order('created_at', { ascending: false });
    if (data) setComments(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
    const sub = supabase.channel(`cmt:${itemId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gallery_comments', filter: `gallery_item_id=eq.${itemId}` }, () => fetchComments()).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [itemId]);

  if (loading) return <div className="py-10 text-center opacity-30 text-[9px] font-bold">CARREGANDO...</div>;

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <p className="text-gray-400 text-xs italic text-center py-10 opacity-60">Sem comentários ainda. Seja o primeiro!</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-[var(--accent)] tracking-tight">
                <User size={10} /> {c.author_name}
              </span>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={8} className={i < c.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} />
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-600 font-medium leading-relaxed">{c.content}</p>
          </div>
        ))
      )}
    </div>
  );
}

function CommentForm({ itemId, category }: { itemId: string; category: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !content) return;
    setSending(true);
    await supabase.from('gallery_comments').insert([{ gallery_item_id: itemId, author_name: name, content, rating }]);
    setContent('');
    setName('');
    setRating(5);
    setSending(false);
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsExpanded(true)}
        className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center gap-2 text-gray-400 hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all cursor-pointer"
      >
        <MessageSquare size={16} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Comente</span>
      </motion.button>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--accent)]">Nova Avaliação</span>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Mini Rating Panel */}
      <div className="flex items-center justify-center gap-2 mb-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
        <span className="text-[8px] font-black uppercase text-gray-400">Nota:</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="cursor-pointer transition-transform hover:scale-125"
            >
              <Star size={16} className={(hoverRating || rating) >= star ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl text-xs border border-gray-100 focus:border-[var(--accent)] outline-none bg-gray-50/50 font-bold"
        />
        <div className="relative">
          <textarea
            placeholder="Deixe seu feedback..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl text-xs border border-gray-100 focus:border-[var(--accent)] outline-none bg-gray-50/50 h-20 resize-none font-medium"
          />
          <button
            type="submit"
            disabled={sending}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all cursor-pointer"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </motion.form>
  );
}
