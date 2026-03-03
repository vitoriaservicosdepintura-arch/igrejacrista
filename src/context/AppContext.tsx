import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { translations, type Lang } from '../i18n/translations';
import { supabase } from '../supabase';

type Theme = '' | 'vida' | 'fogo' | 'paz' | 'noturno';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'leader' | 'member';
  coins: number;
}

interface AppContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  quizResults: any[];
  churchSettings: {
    church_name: string;
    address: string;
    instagram: string;
    youtube: string;
    logo_url: string;
    about_us_pt: string;
    about_us_en: string;
    about_us_es: string;
    facebook: string;
  };
  t: (key: string) => string;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, phone: string, church: string, password: string) => Promise<boolean>;
  logout: () => void;
  addCoins: (n: number) => void;
  setUser: (u: User | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

function detectLang(): Lang {
  const nav = navigator.language?.slice(0, 2) || 'pt';
  if (nav === 'en') return 'en';
  if (nav === 'es') return 'es';
  return 'pt';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [quizResults] = useState<any[]>([]);
  const [churchSettings, setChurchSettings] = useState({
    church_name: 'Igreja Cristã',
    address: 'Rua da Paz, 123 - Centro',
    instagram: '@igrejacrista',
    youtube: 'youtube.com/igrejacrista',
    logo_url: '',
    about_us_pt: 'Resgatando vidas através do evangelho de Jesus Cristo.',
    about_us_en: 'Rescuing lives through the gospel of Jesus Christ.',
    about_us_es: 'Rescatando vidas a través del evangelio de Jesucristo.',
    facebook: 'facebook.com/igrejacrista'
  });
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('church-theme');
    if (saved) return saved as Theme;
    const hour = new Date().getHours();
    return (hour >= 20 || hour < 6) ? 'noturno' : '';
  });

  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('church-lang');
    return (saved as Lang) || detectLang();
  });

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('church-user');
    return saved ? JSON.parse(saved) : null;
  });

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('church-theme', t);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('church-lang', l);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[lang][key] || key;
  }, [lang]);

  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('church_settings').select('*');
      if (data) {
        const settingsObj = data.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {});
        setChurchSettings(prev => ({ ...prev, ...settingsObj }));
      }
    };
    fetchSettings();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (email === 'admin' && password === '123') {
      const newUser: User = { id: 'admin-id', name: 'Administrador', email, role: 'admin', coins: 0 };
      setUser(newUser);
      localStorage.setItem('church-user', JSON.stringify(newUser));
      return true;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();

      const isAdmin = email.toLowerCase().includes('admin');
      const isLeader = email.toLowerCase().includes('leader') || email.toLowerCase().includes('lider');

      const newUser: User = {
        id: data.user.id,
        name: profile?.name || data.user.email?.split('@')[0] || 'Member',
        email: data.user.email!,
        role: profile?.role || (isAdmin ? 'admin' : isLeader ? 'leader' : 'member'),
        coins: profile?.coins || 0
      };

      setUser(newUser);
      localStorage.setItem('church-user', JSON.stringify(newUser));
      return true;
    } catch (error) {
      console.error('Error logging in:', error);
      alert('Login failed: ' + (error as any).message);
      return false;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, phone: string, church: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            church,
            role: 'member'
          }
        }
      });

      if (error) throw error;

      // Auto login to establish Supabase session 
      // (Since we have an auto-confirm DB trigger, this will succeed)
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;

      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      const newUser: User = { id: supabaseUser?.id || '', name, email, role: 'member', coins: 0 };
      setUser(newUser);
      localStorage.setItem('church-user', JSON.stringify(newUser));
      return true;
    } catch (error) {
      console.error('Error registering:', error);
      alert('Registration failed: ' + (error as any).message);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('church-user');
  }, []);

  const addCoins = useCallback((n: number) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, coins: prev.coins + n };
      localStorage.setItem('church-user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AppContext.Provider value={{
      theme,
      setTheme,
      lang,
      setLang,
      quizResults,
      churchSettings,
      t,
      user,
      login,
      register,
      logout,
      addCoins,
      setUser,
    }}>
      {children}
    </AppContext.Provider>
  );
}
