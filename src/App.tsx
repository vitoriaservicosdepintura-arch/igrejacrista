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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
