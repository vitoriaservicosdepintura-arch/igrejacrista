import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Target, Eye, Heart, Cross, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabase';



export default function About() {
  const { t, lang, churchSettings } = useApp();
  const [leaders, setLeaders] = useState<any[]>([]);

  useEffect(() => {
    const fetchLeaders = async () => {
      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('role', 'leader')
        .order('name', { ascending: true });
      if (data) setLeaders(data);
    };
    fetchLeaders();
  }, []);

  const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Hero */}
      <section
        className="py-24 px-4 text-center text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}
      >
        <motion.div className="absolute top-10 right-10 opacity-10" animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}>
          <Cross size={120} />
        </motion.div>
        <motion.h1 className="font-serif text-4xl sm:text-5xl font-bold mb-4 relative z-10" {...fadeUp}>
          {t('about.title')}
        </motion.h1>
        <motion.p className="opacity-80 text-lg max-w-xl mx-auto relative z-10" {...fadeUp}>
          {lang === 'pt' ? 'Conheça nossa história, missão e liderança' : lang === 'en' ? 'Learn about our history, mission and leadership' : 'Conozca nuestra historia, misión y liderazgo'}
        </motion.p>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full"><path d="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80Z" fill="var(--bg-primary)" /></svg>
        </div>
      </section>

      {/* History */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div {...fadeUp}>
            <div className="inline-flex p-3 rounded-xl mb-4" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
              <BookOpen size={28} />
            </div>
            <h2 className="font-serif text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('about.history')}</h2>
            <p className="leading-relaxed text-lg whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
              {lang === 'pt' ? churchSettings.about_us_pt :
                lang === 'en' ? churchSettings.about_us_en :
                  churchSettings.about_us_es}
            </p>
          </motion.div>
          <motion.div
            className="rounded-2xl aspect-[4/3] overflow-hidden"
            style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}
            {...fadeUp}
          >
            <div className="w-full h-full flex items-center justify-center text-white/20">
              <Cross size={120} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Faith & Mission */}
      <section className="py-20 px-4 paper-texture" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { icon: <Heart size={28} />, title: t('about.faith'), text: t('about.faith_text') },
            { icon: <Target size={28} />, title: t('about.mission'), text: t('about.mission_text') },
            { icon: <Eye size={28} />, title: t('about.vision'), text: t('about.vision_text') },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="rounded-2xl p-8"
              style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              whileHover={{ y: -5 }}
            >
              <div className="inline-flex p-3 rounded-xl mb-4" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                {item.icon}
              </div>
              <h3 className="font-serif text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
              <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Leaders */}
      <section className="py-20 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{t('about.leaders')}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {leaders.map((leader, i) => (
              <motion.div
                key={i}
                className="rounded-2xl p-6 text-center"
                style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 20px var(--shadow)', border: '1px solid var(--border)' }}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5, boxShadow: '0 12px 40px var(--shadow)' }}
              >
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <motion.div
                    className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-white text-xl font-bold"
                    style={{ backgroundColor: 'var(--accent)' }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    {leader.photo_url ? (
                      <img src={leader.photo_url} alt={leader.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} />
                    )}
                  </motion.div>
                </div>
                <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{leader.name}</h3>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--accent)' }}>{leader.role}</p>
                <p className="text-sm line-clamp-3" style={{ color: 'var(--text-secondary)' }}>{leader.bio}</p>
              </motion.div>
            ))}
            {leaders.length === 0 && (
              <p className="col-span-full text-center opacity-50 py-12">
                {lang === 'pt' ? 'Nenhum líder cadastrado.' : 'No leaders registered.'}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
