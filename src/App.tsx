import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider } from './context/AppContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Gallery from './pages/Gallery';
import Events from './pages/Events';
import Member from './pages/Member';
import Admin from './pages/Admin';

type Page = 'home' | 'about' | 'gallery' | 'events' | 'member' | 'admin' | 'quiz';

function AppContent() {
  const [page, setPage] = useState<Page>('home');

  const navigate = (p: string) => {
    if (p === 'quiz') {
      setPage('home');
      setTimeout(() => {
        document.getElementById('quiz-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
      return;
    }
    setPage(p as Page);
    // iOS scroll to top compatible
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '') as Page;
      if (hash && ['home', 'about', 'gallery', 'events', 'member', 'admin'].includes(hash)) {
        setPage(hash);
      }
    };
    window.addEventListener('popstate', handlePopState);
    handlePopState();
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    window.location.hash = page;
  }, [page]);

  // ── Corrige altura no iOS Safari (100vh bug) ──
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);
    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);

  // ── Previne bounce do iOS no overscroll ──
  useEffect(() => {
    const preventBounce = (e: TouchEvent) => {
      // Só previne se não está em elemento com scroll
      const target = e.target as HTMLElement;
      let el: HTMLElement | null = target;
      while (el && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        const overflow = style.overflowY;
        if (overflow === 'auto' || overflow === 'scroll') return; // deixa scroll local funcionar
        el = el.parentElement;
      }
    };
    document.addEventListener('touchmove', preventBounce, { passive: true });
    return () => document.removeEventListener('touchmove', preventBounce);
  }, []);

  const showFooter = page !== 'admin';

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Header currentPage={page} onNavigate={navigate} />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {page === 'home' && <Home onNavigate={navigate} />}
            {page === 'about' && <About />}
            {page === 'gallery' && <Gallery />}
            {page === 'events' && <Events />}
            {page === 'member' && <Member />}
            {page === 'admin' && <Admin onNavigate={navigate} />}
          </motion.div>
        </AnimatePresence>
      </main>
      {showFooter && <Footer />}
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
