import { useState, useEffect, useRef } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Fecha menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setShowTheme(false);
        setShowLang(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Fecha mobile menu ao rotacionar tela
  useEffect(() => {
    const handleOrientationChange = () => setMenuOpen(false);
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, []);

  const navItems: { key: Page; label: string }[] = [
    { key: 'home', label: t('nav.home') },
    { key: 'about', label: t('nav.about') },
    { key: 'gallery', label: t('nav.gallery') },
    { key: 'events', label: t('nav.events') },
    { key: 'member', label: t('nav.member') },
    { key: 'quiz', label: lang === 'pt' ? 'Quiz Bíblico' : lang === 'en' ? 'Bible Quiz' : 'Quiz Bíblico' },
  ];

  const themes: { key: typeof theme; label: string; icon: React.ReactNode }[] = [
    { key: '', label: t('theme.classic'), icon: <Sun size={16} /> },
    { key: 'vida', label: t('theme.vida'), icon: <Leaf size={16} /> },
    { key: 'fogo', label: t('theme.fogo'), icon: <Flame size={16} /> },
    { key: 'paz', label: t('theme.paz'), icon: <Droplets size={16} /> },
    { key: 'noturno', label: t('theme.night'), icon: <Moon size={16} /> },
  ];

  const langs: { key: Lang; label: string; flag: string }[] = [
    { key: 'pt', label: 'Português', flag: '🇧🇷' },
    { key: 'en', label: 'English', flag: '🇺🇸' },
    { key: 'es', label: 'Español', flag: '🇪🇸' },
  ];

  const navigate = (p: Page) => {
    onNavigate(p);
    setMenuOpen(false);
    setShowTheme(false);
    setShowLang(false);
    setShowSearch(false);
  };

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md border-b"
      style={{
        backgroundColor: 'var(--header-bg)',
        color: 'var(--header-text)',
        borderColor: 'var(--border)',
        // Safe area para iPhone notch
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ── Logo ── */}
          <motion.button
            onClick={() => navigate('home')}
            className="flex items-center gap-2 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ minHeight: '44px' }}
            aria-label="Voltar para a página inicial"
          >
            <motion.div
              className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
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
            <span className="font-serif text-lg sm:text-xl font-bold hidden sm:block truncate max-w-[180px]">
              {churchSettings.church_name}
            </span>
          </motion.button>

          {/* ── Desktop Nav ── */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Navegação principal">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => navigate(item.key)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                style={{
                  backgroundColor: currentPage === item.key ? 'var(--accent)' : 'transparent',
                  color: currentPage === item.key ? 'white' : 'var(--header-text)',
                  opacity: currentPage === item.key ? 1 : 0.8,
                  minHeight: '44px',
                }}
                aria-current={currentPage === item.key ? 'page' : undefined}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* ── Right Actions ── */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Search */}
            <motion.button
              onClick={() => { setShowSearch(!showSearch); if (!showSearch) setTimeout(() => searchRef.current?.focus(), 150); }}
              className="p-2 rounded-lg hover:opacity-80 transition cursor-pointer"
              whileTap={{ scale: 0.9 }}
              style={{ minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Pesquisar"
            >
              <Search size={20} />
            </motion.button>

            {/* Language */}
            <div className="relative" data-dropdown>
              <motion.button
                onClick={() => { setShowLang(!showLang); setShowTheme(false); }}
                className="p-2 rounded-lg hover:opacity-80 transition cursor-pointer"
                whileTap={{ scale: 0.9 }}
                style={{ minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Selecionar idioma"
                aria-expanded={showLang}
              >
                <Globe size={20} />
              </motion.button>
              <AnimatePresence>
                {showLang && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 mt-2 rounded-xl shadow-xl overflow-hidden z-50 min-w-[140px]"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    {langs.map(l => (
                      <button
                        key={l.key}
                        onClick={() => { setLang(l.key); setShowLang(false); }}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium transition cursor-pointer"
                        style={{
                          color: 'var(--text-primary)',
                          backgroundColor: lang === l.key ? 'var(--accent-light)' : 'transparent',
                          minHeight: '44px',
                        }}
                      >
                        <span>{l.flag}</span>
                        {l.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme */}
            <div className="relative hidden sm:block" data-dropdown>
              <motion.button
                onClick={() => { setShowTheme(!showTheme); setShowLang(false); }}
                className="p-2 rounded-lg hover:opacity-80 transition cursor-pointer"
                whileTap={{ scale: 0.9 }}
                style={{ minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Selecionar tema"
                aria-expanded={showTheme}
              >
                <Palette size={20} />
              </motion.button>
              <AnimatePresence>
                {showTheme && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 mt-2 rounded-xl shadow-xl overflow-hidden z-50 min-w-[170px]"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    {themes.map(th => (
                      <button
                        key={th.key}
                        onClick={() => { setTheme(th.key); setShowTheme(false); }}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium transition cursor-pointer"
                        style={{
                          color: 'var(--text-primary)',
                          backgroundColor: theme === th.key ? 'var(--accent-light)' : 'transparent',
                          minHeight: '44px',
                        }}
                      >
                        {th.icon}
                        {th.label}
                        {theme === th.key && <span className="ml-auto text-[var(--accent)]">✓</span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User / Login */}
            {user ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate('member')}
                  className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-lg text-sm cursor-pointer font-medium"
                  style={{ backgroundColor: 'var(--accent)', color: 'white', minHeight: '44px' }}
                  aria-label="Área do membro"
                >
                  <User size={14} />
                  <span className="hidden md:inline">{user.name.split(' ')[0]}</span>
                </button>
                <button
                  onClick={() => { logout(); onNavigate('home'); }}
                  className="hidden sm:block text-xs opacity-70 hover:opacity-100 transition cursor-pointer px-2 py-2"
                  style={{ minHeight: '44px' }}
                  aria-label="Sair"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <motion.button
                onClick={() => navigate('member')}
                className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-lg text-sm cursor-pointer font-medium"
                style={{ backgroundColor: 'var(--accent)', color: 'white', minHeight: '44px' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Entrar na área do membro"
              >
                <User size={14} />
                {t('nav.login')}
              </motion.button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded-lg cursor-pointer"
              style={{ minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuOpen}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={menuOpen ? 'x' : 'menu'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {menuOpen ? <X size={22} /> : <Menu size={22} />}
                </motion.div>
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* ── Search Bar ── */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pb-3"
            >
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                <input
                  ref={searchRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('nav.search')}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    // Previne zoom no iOS (16px mínimo)
                    fontSize: '16px',
                  }}
                  enterKeyHint="search"
                  aria-label="Campo de pesquisa"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mobile Nav Menu ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="lg:hidden overflow-hidden"
            style={{
              backgroundColor: 'var(--header-bg)',
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <nav
              className="px-4 py-3 space-y-1"
              style={{
                // Safe area bottom caso o menu se expanda até lá
                paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
              }}
              aria-label="Menu mobile"
            >
              {navItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => navigate(item.key)}
                  className="flex items-center w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition cursor-pointer"
                  style={{
                    backgroundColor: currentPage === item.key ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    color: currentPage === item.key ? 'white' : 'var(--header-text)',
                    minHeight: '52px',
                  }}
                  aria-current={currentPage === item.key ? 'page' : undefined}
                >
                  {item.label}
                </button>
              ))}

              {/* Divider */}
              <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />

              {/* Temas no mobile */}
              <div className="grid grid-cols-5 gap-2 px-1 py-2">
                {themes.map(th => (
                  <button
                    key={th.key}
                    onClick={() => { setTheme(th.key); }}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg transition cursor-pointer"
                    style={{
                      backgroundColor: theme === th.key ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                      color: 'white',
                      minHeight: '52px',
                      fontSize: '10px',
                    }}
                    aria-label={`Tema ${th.label}`}
                  >
                    {th.icon}
                    <span style={{ fontSize: '9px', opacity: 0.8 }}>{th.label}</span>
                  </button>
                ))}
              </div>

              {/* Login/Logout no mobile */}
              {!user ? (
                <button
                  onClick={() => navigate('member')}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: 'white', minHeight: '52px' }}
                >
                  <User size={16} />
                  {t('nav.login')}
                </button>
              ) : (
                <div className="space-y-1">
                  <button
                    onClick={() => navigate('member')}
                    className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-medium cursor-pointer"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--header-text)', minHeight: '52px' }}
                  >
                    <User size={16} />
                    {user.name}
                  </button>
                  <button
                    onClick={() => { logout(); onNavigate('home'); setMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-medium cursor-pointer text-red-400"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', minHeight: '52px' }}
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
