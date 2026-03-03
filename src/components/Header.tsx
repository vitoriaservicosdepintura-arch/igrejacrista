import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search, User, Globe, Palette, Sun, Moon, Flame, Leaf, Droplets, BookOpen } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Lang } from '../i18n/translations';

type Page = 'home' | 'about' | 'gallery' | 'events' | 'member' | 'quiz' | 'admin';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export default function Header({ currentPage, onNavigate }: HeaderProps) {
  const { t, lang, setLang, theme, setTheme, user, logout, churchSettings } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const navItems: { key: Page; label: string }[] = [
    { key: 'home', label: t('nav.home') },
    { key: 'about', label: t('nav.about') },
    { key: 'gallery', label: t('nav.gallery') },
    { key: 'events', label: t('nav.events') },
    { key: 'member', label: t('nav.member') },
    { key: 'quiz', label: lang === 'pt' ? 'Quiz Bíblico' : 'Bible Quiz' },
  ];


  const themes: { key: typeof theme; label: string; icon: React.ReactNode }[] = [
    { key: '', label: t('theme.classic'), icon: <Sun size={16} /> },
    { key: 'vida', label: t('theme.vida'), icon: <Leaf size={16} /> },
    { key: 'fogo', label: t('theme.fogo'), icon: <Flame size={16} /> },
    { key: 'paz', label: t('theme.paz'), icon: <Droplets size={16} /> },
    { key: 'noturno', label: t('theme.night'), icon: <Moon size={16} /> },
  ];

  const langs: { key: Lang; label: string }[] = [
    { key: 'pt', label: 'PT' },
    { key: 'en', label: 'EN' },
    { key: 'es', label: 'ES' },
  ];

  const navigate = (page: Page) => {
    onNavigate(page);
    setMenuOpen(false);
  };

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md border-b"
      style={{
        backgroundColor: 'var(--header-bg)',
        color: 'var(--header-text)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.button
            onClick={() => navigate('home')}
            className="flex items-center gap-2 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: 'var(--accent)' }}
              whileHover={{ rotate: 10 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {churchSettings.logo_url ? (
                <img src={churchSettings.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <BookOpen size={22} className="text-white" />
              )}
            </motion.div>
            <span className="font-serif text-xl font-bold hidden sm:block">
              {churchSettings.church_name}
            </span>
          </motion.button>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => navigate(item.key)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                style={{
                  backgroundColor: currentPage === item.key ? 'var(--accent)' : 'transparent',
                  color: currentPage === item.key ? 'white' : 'var(--header-text)',
                  opacity: currentPage === item.key ? 1 : 0.8,
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <motion.button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-lg hover:opacity-80 transition cursor-pointer"
              whileTap={{ scale: 0.9 }}
            >
              <Search size={18} />
            </motion.button>

            {/* Language */}
            <div className="relative">
              <motion.button
                onClick={() => { setShowLang(!showLang); setShowTheme(false); }}
                className="p-2 rounded-lg hover:opacity-80 transition cursor-pointer"
                whileTap={{ scale: 0.9 }}
              >
                <Globe size={18} />
              </motion.button>
              <AnimatePresence>
                {showLang && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 rounded-xl shadow-xl overflow-hidden z-50"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    {langs.map(l => (
                      <button
                        key={l.key}
                        onClick={() => { setLang(l.key); setShowLang(false); }}
                        className="block w-full px-4 py-2 text-sm font-medium transition cursor-pointer"
                        style={{
                          color: 'var(--text-primary)',
                          backgroundColor: lang === l.key ? 'var(--accent-light)' : 'transparent',
                        }}
                      >
                        {l.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme */}
            <div className="relative">
              <motion.button
                onClick={() => { setShowTheme(!showTheme); setShowLang(false); }}
                className="p-2 rounded-lg hover:opacity-80 transition cursor-pointer"
                whileTap={{ scale: 0.9 }}
              >
                <Palette size={18} />
              </motion.button>
              <AnimatePresence>
                {showTheme && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 rounded-xl shadow-xl overflow-hidden z-50 min-w-[160px]"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    {themes.map(th => (
                      <button
                        key={th.key}
                        onClick={() => { setTheme(th.key); setShowTheme(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium transition cursor-pointer"
                        style={{
                          color: 'var(--text-primary)',
                          backgroundColor: theme === th.key ? 'var(--accent-light)' : 'transparent',
                        }}
                      >
                        {th.icon}
                        {th.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User */}
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('member')}
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                >
                  <User size={14} />
                  {user.name.split(' ')[0]}
                </button>
                <button
                  onClick={() => {
                    logout();
                    onNavigate('home');
                  }}
                  className="text-xs opacity-70 hover:opacity-100 transition cursor-pointer"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <motion.button
                onClick={() => navigate('member')}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm cursor-pointer"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <User size={14} />
                {t('nav.login')}
              </motion.button>
            )}

            {/* Mobile Menu */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded-lg cursor-pointer"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pb-3"
            >
              <input
                type="text"
                placeholder={t('nav.search')}
                className="w-full px-4 py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
                autoFocus
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden"
            style={{ backgroundColor: 'var(--header-bg)' }}
          >
            <nav className="px-4 pb-4 space-y-1">
              {navItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => navigate(item.key)}
                  className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition cursor-pointer"
                  style={{
                    backgroundColor: currentPage === item.key ? 'var(--accent)' : 'transparent',
                    color: currentPage === item.key ? 'white' : 'var(--header-text)',
                  }}
                >
                  {item.label}
                </button>
              ))}
              {!user && (
                <button
                  onClick={() => navigate('member')}
                  className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                >
                  {t('nav.login')}
                </button>
              )}
              {user && (
                <button
                  onClick={() => {
                    logout();
                    onNavigate('home');
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium cursor-pointer text-red-500"
                >
                  {t('nav.logout')}
                </button>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
