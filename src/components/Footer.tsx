import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Heart, BookOpen, Instagram, Youtube, Facebook } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Footer() {
  const { t, lang, churchSettings } = useApp();

  return (
    <footer
      className="relative overflow-hidden"
      style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}
    >
      <div className="absolute top-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" className="w-full rotate-180">
          <path d="M0,30 C480,60 960,0 1440,30 L1440,60 L0,60Z" fill="var(--bg-primary)" />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-20 pb-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div>
            <motion.div
              className="flex items-center gap-2 mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--accent)' }}>
                {churchSettings.logo_url ? (
                  <img src={churchSettings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <BookOpen size={20} className="text-white" />
                )}
              </div>
              <span className="font-serif text-lg font-bold">{churchSettings.church_name}</span>
            </motion.div>
            <p className="text-sm opacity-70 leading-relaxed">
              {lang === 'pt' ? 'Conectando vidas através da fé, amor e esperança. Venha fazer parte da nossa família.' :
                lang === 'en' ? 'Connecting lives through faith, love and hope. Come be part of our family.' :
                  'Conectando vidas a través de la fe, el amor y la esperanza. Ven a ser parte de nuestra familia.'}
            </p>
          </div>

          {/* Address */}
          <div>
            <h4 className="font-semibold mb-4">{t('footer.address')}</h4>
            <div className="space-y-2 text-sm opacity-70">
              <div className="flex items-start gap-2">
                <MapPin size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                <span>{churchSettings.address}</span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">{t('footer.contact')}</h4>
            <div className="space-y-2 text-sm opacity-70">
              <div className="flex items-center gap-2">
                <Phone size={16} style={{ color: 'var(--accent)' }} />
                <span>(11) 1234-5678</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} style={{ color: 'var(--accent)' }} />
                <span>contato@igrejacristã.com</span>
              </div>
            </div>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold mb-4">{t('footer.social')}</h4>
            <div className="flex gap-3">
              {[
                { icon: <Instagram size={18} />, label: 'Instagram', url: churchSettings.instagram },
                { icon: <Youtube size={18} />, label: 'YouTube', url: churchSettings.youtube },
                { icon: <Facebook size={18} />, label: 'Facebook', url: churchSettings.facebook || '#' },
              ].map((social, i) => (
                <motion.button
                  key={i}
                  className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  onClick={() => window.open(social.url.startsWith('http') ? social.url : `https://${social.url}`, '_blank')}
                  whileHover={{ scale: 1.1, backgroundColor: 'var(--accent)' }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={social.label}
                >
                  {social.icon}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <p className="text-sm opacity-50">
            © {new Date().getFullYear()} {churchSettings.church_name}. {t('footer.rights')}.
          </p>
          <p className="text-sm opacity-50 flex items-center gap-1">
            {lang === 'pt' ? 'Feito com' : lang === 'en' ? 'Made with' : 'Hecho con'}
            <Heart size={12} className="text-red-400" fill="currentColor" />
            {lang === 'pt' ? 'e fé' : lang === 'en' ? 'and faith' : 'y fe'}
          </p>
        </div>
      </div>
    </footer>
  );
}
