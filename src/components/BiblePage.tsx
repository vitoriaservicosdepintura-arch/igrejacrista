import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, ChevronRight, ChevronLeft, Search, PenLine, StickyNote,
    Share2, X, Bookmark, Palette, Menu, Camera,
    Trash2, Save, Sun, Moon, Mail, MessageCircle, Copy, Download, Image as ImageIcon, Send
} from 'lucide-react';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import { supabase } from '../supabase';
import { useApp } from '../context/AppContext';

/* ─────────────────── Types ─────────────────── */
interface BibleBook { bookid: number; name: string; chapters: number; }
interface BibleVerse { pk: number; verse: number; text: string; }
interface SavedItem {
    id: string;
    book_id: number;
    book_name: string;
    chapter: number;
    verse: number;
    verse_text: string;
    color: string;
    annotation: string;
    photo_url: string | null;
    created_at: string;
}

/* ─────────────────── Short names map ─────────────────── */
const SHORT_NAMES: Record<number, string> = {
    1: 'Gênesis', 2: 'Êxodo', 3: 'Levítico', 4: 'Números', 5: 'Deuteronômio',
    6: 'Josué', 7: 'Juízes', 8: 'Rute', 9: '1 Samuel', 10: '2 Samuel',
    11: '1 Reis', 12: '2 Reis', 13: '1 Crônicas', 14: '2 Crônicas', 15: 'Esdras',
    16: 'Neemias', 17: 'Ester', 18: 'Jó', 19: 'Salmos', 20: 'Provérbios',
    21: 'Eclesiastes', 22: 'Cantares', 23: 'Isaías', 24: 'Jeremias', 25: 'Lamentações',
    26: 'Ezequiel', 27: 'Daniel', 28: 'Oseias', 29: 'Joel', 30: 'Amós',
    31: 'Obadias', 32: 'Jonas', 33: 'Miqueias', 34: 'Naum', 35: 'Habacuque',
    36: 'Sofonias', 37: 'Ageu', 38: 'Zacarias', 39: 'Malaquias',
    40: 'Mateus', 41: 'Marcos', 42: 'Lucas', 43: 'João', 44: 'Atos',
    45: 'Romanos', 46: '1 Coríntios', 47: '2 Coríntios', 48: 'Gálatas', 49: 'Efésios',
    50: 'Filipenses', 51: 'Colossenses', 52: '1 Tessalonicenses', 53: '2 Tessalonicenses',
    54: '1 Timóteo', 55: '2 Timóteo', 56: 'Tito', 57: 'Filemom', 58: 'Hebreus',
    59: 'Tiago', 60: '1 Pedro', 61: '2 Pedro', 62: '1 João', 63: '2 João',
    64: '3 João', 65: 'Judas', 66: 'Apocalipse',
};

/* ─────────────────── Constants ─────────────────── */
const API = 'https://bolls.life';

const TRANSLATIONS = [
    { id: 'ARA', label: 'ARA – Almeida Revista e Atualizada' },
    { id: 'ACF', label: 'ACF – Almeida Corrigida Fiel' },
    { id: 'NVI', label: 'NVI – Nova Versão Internacional' },
    { id: 'KJV', label: 'KJV – King James Version' },
    { id: 'NKJV', label: 'NKJV – New King James' },
];

const DEFAULT_COLORS = [
    { value: '#fef3c7', label: 'Inspirador' },
    { value: '#dcfce7', label: 'Renovo' },
    { value: '#dbeafe', label: 'Esperança' },
    { value: '#fee2e2', label: 'Promessa' },
    { value: '#f3e8ff', label: 'Realeza' },
    { value: '#ffedd5', label: 'Aviso' },
    { value: '#fcd34d', label: 'Revelação' },
    { value: '#4ade80', label: 'Vida' },
    { value: '#60a5fa', label: 'Paz' },
    { value: '#fb7185', label: 'Amor' },
    { value: '#a78bfa', label: 'Espírito' },
    { value: '#fb923c', label: 'Fogo' },
    // Gradients
    { value: 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%)', label: 'Amanhecer' },
    { value: 'linear-gradient(135deg, #dcfce7 0%, #4ade80 100%)', label: 'Florescer' },
    { value: 'linear-gradient(135deg, #dbeafe 0%, #60a5fa 100%)', label: 'Oceano' },
    { value: 'linear-gradient(135deg, #fee2e2 0%, #fb7185 100%)', label: 'Paixão' },
    { value: 'linear-gradient(135deg, #f3e8ff 0%, #a78bfa 100%)', label: 'Gênese' },
    { value: 'linear-gradient(135deg, #ffedd5 0%, #fb923c 100%)', label: 'Glória' },
];

interface BiblePageProps {
    onMarkingSaved?: () => void;
}

export default function BiblePage({ onMarkingSaved }: BiblePageProps) {
    const { user } = useApp();

    /* ── Navigation ── */
    const [books, setBooks] = useState<BibleBook[]>([]);
    const [translation, setTranslation] = useState('ARA');
    const [book, setBook] = useState<BibleBook | null>(null);
    const [chapter, setChapter] = useState<number>(1);
    const [verses, setVerses] = useState<BibleVerse[]>([]);
    const [loading, setLoading] = useState(false);
    const [booksLoading, setBooksLoading] = useState(false);
    const [search, setSearch] = useState('');

    /* ── UI ── */
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
    const [activeSection, setActiveSection] = useState<'books' | 'saved'>('books');
    const [testamentFilter, setTestamentFilter] = useState<'all' | 'ot' | 'nt'>('all');
    const [darkReader, setDarkReader] = useState(false);
    const [fontSize, setFontSize] = useState(18);

    /* ── Highlight Editor ── */
    const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
    const [editorOpen, setEditorOpen] = useState(false);
    const [palette, setPalette] = useState(DEFAULT_COLORS);
    const [editorColor, setEditorColor] = useState(DEFAULT_COLORS[0].value);
    const [annotation, setAnnotation] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [paletteEditorOpen, setPaletteEditorOpen] = useState(false);
    const [editingColorItem, setEditingColorItem] = useState<{ value: string; label: string; index: number } | null>(null);
    const [tempLabel, setTempLabel] = useState('');
    const [tempColor, setTempColor] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* ── Saved ── */
    const [saved, setSaved] = useState<SavedItem[]>([]);
    const [viewItem, setViewItem] = useState<SavedItem | null>(null);
    const [sharing, setSharing] = useState(false);
    const shareCardRef = useRef<HTMLDivElement>(null);

    /* ─── Fetch books ─── */
    useEffect(() => {
        setBooksLoading(true);
        fetch(`${API}/get-books/${translation}/`)
            .then(r => r.json())
            .then((data: any[]) => {
                // Normalise: API returns `bookid`, we expose as `bookid`; apply short names
                const mapped: BibleBook[] = data.map(b => ({
                    bookid: b.bookid ?? b.book_id ?? b.id,
                    name: SHORT_NAMES[b.bookid ?? b.book_id ?? b.id] || b.name,
                    chapters: b.chapters
                }));
                setBooks(mapped);
            })
            .catch(console.error)
            .finally(() => setBooksLoading(false));
    }, [translation]);

    /* ─── Fetch verses ─── */
    const loadChapter = useCallback(async (b: BibleBook, ch: number) => {
        setLoading(true);
        setVerses([]);
        setSelectedVerses([]);
        try {
            const r = await fetch(`${API}/get-text/${translation}/${b.bookid}/${ch}/`);
            const d: BibleVerse[] = await r.json();
            setVerses(d);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [translation]);

    useEffect(() => {
        if (book) loadChapter(book, chapter);
    }, [book, chapter, loadChapter]);

    /* ─── Fetch palette ─── */
    const loadPalette = useCallback(async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('bible_marker_colors')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error loading palette:', error);
            return;
        }

        if (data && data.length > 0) {
            setPalette(data.map(d => ({ value: d.color, label: d.label, id: d.id })));
        } else {
            // If no palette, initialize with defaults
            const rows = DEFAULT_COLORS.map(c => ({
                user_id: user.id,
                label: c.label,
                color: c.value
            }));
            const { data: inserted, error: insErr } = await supabase
                .from('bible_marker_colors')
                .insert(rows)
                .select();

            if (!insErr && inserted) {
                setPalette(inserted.map(d => ({ value: d.color, label: d.label, id: d.id })));
            }
        }
    }, [user]);

    useEffect(() => { loadPalette(); }, [loadPalette]);

    /* ─── Fetch saved ─── */
    const loadSaved = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from('bible_highlights')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        if (data) setSaved(data);
    }, [user]);

    // Grouping saved items for sidebar
    const groupedSaved = saved.reduce((acc: any[], curr) => {
        const last = acc[acc.length - 1];
        if (last &&
            last.book_id === curr.book_id &&
            last.chapter === curr.chapter &&
            last.annotation === curr.annotation &&
            Math.abs(new Date(last.created_at).getTime() - new Date(curr.created_at).getTime()) < 5000
        ) {
            last.verses = [...(last.verses || [last.verse]), curr.verse].sort((a, b) => a - b);
            last.ids = [...(last.ids || [last.id]), curr.id];
        } else {
            acc.push({ ...curr, verses: [curr.verse], ids: [curr.id] });
        }
        return acc;
    }, []);

    useEffect(() => { loadSaved(); }, [loadSaved]);

    /* ─── Derived ─── */
    const OT = books.filter(b => b.bookid <= 39);
    const NT = books.filter(b => b.bookid > 39);
    const q = search.toLowerCase();
    const filteredOT = OT.filter(b => b.name.toLowerCase().includes(q));
    const filteredNT = NT.filter(b => b.name.toLowerCase().includes(q));

    /* ─── Handlers ─── */
    const selectBook = (b: BibleBook) => {
        setBook(b); setChapter(1);
        if (window.innerWidth < 1024) setSidebarOpen(false);
    };

    const toggleVerse = (v: number) =>
        setSelectedVerses(prev =>
            prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
        );

    const openEditor = () => {
        if (!selectedVerses.length) return;
        setAnnotation(''); setPhotoFile(null); setPhotoPreview(null);
        setEditorColor(palette[0].value); setEditorOpen(true);
    };

    const handleSavePaletteItem = async () => {
        if (!user || !editingColorItem) return;

        const item = palette[editingColorItem.index];
        // @ts-ignore
        if (item.id) {
            // Update existing
            const { error } = await supabase
                .from('bible_marker_colors')
                .update({ label: tempLabel, color: tempColor })
                // @ts-ignore
                .eq('id', item.id);
            if (error) alert('Erro ao salvar: ' + error.message);
        } else {
            // Fallback: This shouldn't happen if we initialize correctly
            await loadPalette();
        }

        setEditingColorItem(null);
        await loadPalette();
    };

    const handleResetPalette = async () => {
        if (!user || !confirm('Deseja restaurar a paleta padrão? Sua personalização atual será perdida.')) return;
        setSaving(true);
        try {
            const { error: delErr } = await supabase
                .from('bible_marker_colors')
                .delete()
                .eq('user_id', user.id);

            if (!delErr) {
                await loadPalette();
                setPaletteEditorOpen(false);
            } else {
                alert('Erro ao restaurar: ' + delErr.message);
            }
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        setPhotoFile(f);
        const reader = new FileReader();
        reader.onload = ev => setPhotoPreview(ev.target?.result as string);
        reader.readAsDataURL(f);
    };

    const handleSave = async () => {
        if (!user) {
            alert('Faça login para salvar suas marcações!');
            return;
        }
        if (!selectedVerses.length || !book) return;
        setSaving(true);
        try {
            let photo_url: string | null = null;
            if (photoFile) {
                const ext = photoFile.name.split('.').pop();
                const path = `${user.id}/${Date.now()}.${ext}`;
                const { error: upErr } = await supabase.storage
                    .from('bible-photos').upload(path, photoFile, { upsert: true });
                if (!upErr) {
                    const { data: ud } = supabase.storage.from('bible-photos').getPublicUrl(path);
                    photo_url = ud.publicUrl;
                }
            }

            const rows = selectedVerses.map(vNum => ({
                user_id: user.id,
                book_id: book.bookid,
                book_name: book.name,
                chapter,
                verse: vNum,
                verse_text: verses.find(v => v.verse === vNum)?.text || '',
                color: editorColor,
                annotation: annotation.trim(),
                photo_url
            }));

            // Save to bible_highlights (for sidebar in BiblePage)
            const { data: hlData, error: hlError } = await supabase
                .from('bible_highlights').insert(rows).select('*');

            if (hlError) {
                alert('Erro ao salvar: ' + hlError.message);
                return;
            }

            // Also save to bible_annotations (for Materiais Exclusivos tab)
            if (hlData && hlData.length > 0) {
                const annRows = hlData.map(hl => ({
                    user_id: user.id,
                    highlight_id: hl.id,
                    book_name: hl.book_name,
                    chapter: hl.chapter,
                    verse: hl.verse,
                    verse_text: hl.verse_text,
                    color: hl.color,
                    annotation: hl.annotation,
                    photo_url: hl.photo_url,
                    is_read: false,
                }));
                await supabase.from('bible_annotations').insert(annRows);
            }

            await loadSaved();
            setEditorOpen(false);
            setSelectedVerses([]);
            setActiveSection('saved');
            if (onMarkingSaved) onMarkingSaved();
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remover este item salvo?')) return;

        // Delete from bible_highlights
        await supabase.from('bible_highlights').delete().eq('id', id);

        // Also delete from bible_annotations using highlight_id
        await supabase.from('bible_annotations').delete().eq('highlight_id', id);

        setSaved(prev => prev.filter(s => s.id !== id));
        if (viewItem?.id === id) setViewItem(null);
    };

    const getHighlight = (vNum: number) =>
        saved.find(s => s.book_id === book?.bookid && s.chapter === chapter && s.verse === vNum);

    const getAlphaColor = (color: string, alphaStr: string) => {
        if (!color) return 'transparent';
        if (color.includes('gradient')) return color;
        return color + alphaStr;
    };

    const handleShare = async (type: 'wa' | 'mail' | 'copy' | 'image', item: SavedItem) => {
        const text = `"${item.verse_text}" — ${item.book_name} ${item.chapter}:${item.verse}\n\n${item.annotation ? `Minha anotação: ${item.annotation}\n\n` : ''}Igreja Cristã: Vivendo a Palavra.`;
        const url = window.location.origin;

        if (type === 'wa') {
            window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
        } else if (type === 'mail') {
            window.open(`mailto:?subject=Versículo Bíblico&body=${encodeURIComponent(text + '\n' + url)}`, '_self');
        } else if (type === 'copy') {
            await navigator.clipboard.writeText(text + '\n' + url);
            alert('Copiado para a área de transferência!');
        } else if (type === 'image') {
            if (!shareCardRef.current) return;
            setSharing(true);
            try {
                const dataUrl = await toPng(shareCardRef.current, { cacheBust: true, quality: 0.95, backgroundColor: 'white' });
                const link = document.createElement('a');
                link.download = `versiculo-${item.book_name}-${item.chapter}-${item.verse}.png`;
                link.href = dataUrl;
                link.click();
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            } catch (err) {
                console.error('Falha ao gerar imagem', err);
            } finally { setSharing(false); }
        }
    };

    const readerBg = darkReader ? '#1a1309' : 'var(--bg-primary)';
    const readerTxt = darkReader ? '#f0deba' : 'var(--text-primary)';

    /* ─────────────────────────── RENDER ─────────────────────────── */
    return (
        <div
            className="flex rounded-3xl overflow-hidden border border-[var(--border)] shadow-2xl"
            style={{ height: 'calc(100vh - 160px)', minHeight: 540, background: 'var(--bg-secondary)' }}
        >
            {/* ══ SIDEBAR ══════════════════════════════════════════════ */}
            <AnimatePresence initial={false}>
                {sidebarOpen && (
                    <motion.aside
                        key="sb"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 276, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                        className="flex flex-col border-r border-[var(--border)] overflow-hidden shrink-0 z-20"
                        style={{ background: 'var(--bg-card)' }}
                    >
                        {/* Sidebar Header */}
                        <div className="p-4 border-b border-[var(--border)]">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                                    style={{ background: 'linear-gradient(135deg,#f59e0b,#dc2626)' }}>
                                    <BookOpen size={18} />
                                </div>
                                <div>
                                    <p className="font-serif font-black text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>Bíblia Sagrada</p>
                                    <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Palavra de Deus</p>
                                </div>
                            </div>

                            {/* Section tabs */}
                            <div className="flex p-1 rounded-2xl gap-1" style={{ background: 'var(--bg-secondary)' }}>
                                {([
                                    { k: 'books', label: 'Livros', icon: <BookOpen size={12} /> },
                                    { k: 'saved', label: `Salvos ${saved.length ? `(${saved.length})` : ''}`, icon: <Bookmark size={12} /> },
                                ] as const).map(tab => (
                                    <button key={tab.k}
                                        onClick={() => setActiveSection(tab.k)}
                                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                                        style={{
                                            background: activeSection === tab.k ? 'var(--bg-card)' : 'transparent',
                                            color: activeSection === tab.k ? 'var(--accent)' : 'var(--text-secondary)',
                                            boxShadow: activeSection === tab.k ? '0 2px 8px var(--shadow)' : 'none',
                                        }}>{tab.icon} {tab.label}</button>
                                ))}
                            </div>
                        </div>

                        {/* ── BOOKS ── */}
                        {activeSection === 'books' && (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Search */}
                                <div className="px-3 pt-3 pb-2">
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)]"
                                        style={{ background: 'var(--bg-secondary)' }}>
                                        <Search size={13} className="opacity-40 shrink-0" />
                                        <input value={search} onChange={e => setSearch(e.target.value)}
                                            placeholder="Buscar livro..."
                                            className="bg-transparent outline-none text-xs flex-1" style={{ color: 'var(--text-primary)' }} />
                                        {search && <button onClick={() => setSearch('')} className="opacity-40 hover:opacity-100"><X size={12} /></button>}
                                    </div>
                                </div>

                                {/* Testament filter */}
                                <div className="flex gap-1 px-3 pb-2">
                                    {([
                                        { k: 'all', label: 'Todos' },
                                        { k: 'ot', label: 'V.T.' },
                                        { k: 'nt', label: 'N.T.' },
                                    ] as const).map(f => (
                                        <button key={f.k} onClick={() => setTestamentFilter(f.k)}
                                            className="flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all"
                                            style={{
                                                background: testamentFilter === f.k ? 'var(--accent)' : 'var(--bg-secondary)',
                                                color: testamentFilter === f.k ? '#fff' : 'var(--text-secondary)',
                                            }}>{f.label}</button>
                                    ))}
                                </div>

                                {/* Book list */}
                                {booksLoading ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="w-8 h-8 border-3 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5" style={{ scrollbarWidth: 'thin' }}>
                                        {(testamentFilter !== 'nt') && filteredOT.length > 0 && (
                                            <>
                                                <div className="flex items-center gap-2 px-2 pt-2 pb-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">📜 Velho Testamento</span>
                                                    <div className="h-px flex-1 bg-[var(--border)]" />
                                                    <span className="text-[9px] font-bold opacity-30">{filteredOT.length}</span>
                                                </div>
                                                {filteredOT.map(b => (
                                                    <button key={b.bookid} onClick={() => selectBook(b)}
                                                        className="w-full text-left px-3 py-2 rounded-xl text-[13px] font-semibold transition-all"
                                                        style={{
                                                            background: book?.bookid === b.bookid ? 'var(--accent)' : 'transparent',
                                                            color: book?.bookid === b.bookid ? '#fff' : 'var(--text-primary)',
                                                        }}>
                                                        {b.name}
                                                    </button>
                                                ))}
                                            </>
                                        )}

                                        {(testamentFilter !== 'ot') && filteredNT.length > 0 && (
                                            <>
                                                <div className="flex items-center gap-2 px-2 pt-3 pb-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">✝️ Novo Testamento</span>
                                                    <div className="h-px flex-1 bg-[var(--border)]" />
                                                    <span className="text-[9px] font-bold opacity-30">{filteredNT.length}</span>
                                                </div>
                                                {filteredNT.map(b => (
                                                    <button key={b.bookid} onClick={() => selectBook(b)}
                                                        className="w-full text-left px-3 py-2 rounded-xl text-[13px] font-semibold transition-all"
                                                        style={{
                                                            background: book?.bookid === b.bookid ? 'var(--accent)' : 'transparent',
                                                            color: book?.bookid === b.bookid ? '#fff' : 'var(--text-primary)',
                                                        }}>
                                                        {b.name}
                                                    </button>
                                                ))}
                                            </>
                                        )}

                                        {filteredOT.length === 0 && filteredNT.length === 0 && (
                                            <p className="text-center py-8 text-xs opacity-30">Nenhum livro encontrado.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── SAVED ── */}
                        {activeSection === 'saved' && (
                            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2" style={{ scrollbarWidth: 'thin' }}>
                                {groupedSaved.length === 0 && (
                                    <div className="text-center py-16 px-4 opacity-30">
                                        <Bookmark size={40} className="mx-auto mb-3" />
                                        <p className="text-xs font-bold mb-1">Nenhum versículo salvo.</p>
                                        <p className="text-[10px]">Selecione versículos no leitor e clique ✍️ para marcar.</p>
                                    </div>
                                )}
                                {groupedSaved.map(item => (
                                    <motion.div key={item.id} layout
                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                        className="p-3 cursor-pointer group rounded-2xl transition-all hover:shadow-md relative overflow-hidden"
                                        style={{ background: 'var(--bg-secondary)' }}
                                        onClick={() => setViewItem(item)}
                                    >
                                        <div className="absolute top-0 left-0 w-1 h-full" style={{ background: item.color }} />
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-black" style={{ color: 'var(--accent)' }}>
                                                {item.book_name} {item.chapter}:{item.verses.length > 1 ? `${item.verses[0]}-${item.verses[item.verses.length - 1]}` : item.verse}
                                            </span>
                                            <button onClick={e => {
                                                e.stopPropagation();
                                                if (confirm('Remover esta marcação?')) {
                                                    item.ids.forEach((id: string) => handleDelete(id));
                                                }
                                            }}
                                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-100 hover:text-red-500 transition-all ml-1 shrink-0">
                                                <Trash2 size={10} />
                                            </button>
                                        </div>
                                        <p className="text-[11px] leading-relaxed line-clamp-2 italic opacity-60">
                                            {item.verses.length > 1 ? `"${item.verse_text.substring(0, 60)}..."` : `"${item.verse_text}"`}
                                        </p>
                                        {item.annotation && (
                                            <p className="text-[10px] mt-1 opacity-40 line-clamp-1">📝 {item.annotation}</p>
                                        )}
                                        {item.photo_url && <p className="text-[10px] mt-0.5 opacity-40">📸 foto anexada</p>}
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Translation picker */}
                        <div className="p-3 border-t border-[var(--border)]">
                            <select value={translation} onChange={e => { setTranslation(e.target.value); setBook(null); }}
                                className="w-full text-[11px] font-bold px-3 py-2 rounded-xl border border-[var(--border)] outline-none"
                                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                {TRANSLATIONS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* ══ MAIN READER ══════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">

                {/* Top Bar */}
                <div className="flex items-center gap-2 px-4 h-14 border-b border-[var(--border)] shrink-0 overflow-hidden"
                    style={{ background: 'var(--bg-card)' }}>
                    <button onClick={() => setSidebarOpen(o => !o)}
                        className="p-2 rounded-xl hover:bg-[var(--bg-secondary)] transition shrink-0">
                        <Menu size={18} style={{ color: 'var(--text-primary)' }} />
                    </button>

                    {book ? (
                        <>
                            <span className="font-serif font-black text-base shrink-0" style={{ color: 'var(--text-primary)' }}>
                                {book.name}
                            </span>
                            {/* Chapter selector */}
                            <div className="flex gap-1 overflow-x-auto flex-1 py-1" style={{ scrollbarWidth: 'none' }}>
                                {Array.from({ length: book.chapters }, (_, i) => i + 1).map(ch => (
                                    <button key={ch} onClick={() => setChapter(ch)}
                                        className="shrink-0 w-8 h-8 rounded-xl text-xs font-bold transition-all"
                                        style={{
                                            background: chapter === ch ? 'var(--accent)' : 'var(--bg-secondary)',
                                            color: chapter === ch ? '#fff' : 'var(--text-secondary)',
                                        }}>{ch}</button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <span className="flex-1 text-xs opacity-30 italic" style={{ color: 'var(--text-secondary)' }}>
                            ← Selecione um livro no menu
                        </span>
                    )}

                    {/* Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setFontSize(f => Math.max(14, f - 2))}
                            className="w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center hover:bg-[var(--bg-secondary)] transition"
                            style={{ color: 'var(--text-primary)' }}>A-</button>
                        <button onClick={() => setFontSize(f => Math.min(30, f + 2))}
                            className="w-8 h-8 rounded-xl font-black flex items-center justify-center hover:bg-[var(--bg-secondary)] transition"
                            style={{ color: 'var(--text-primary)' }}>A+</button>
                        <button onClick={() => setDarkReader(d => !d)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[var(--bg-secondary)] transition"
                            style={{ color: 'var(--text-primary)' }}>
                            {darkReader ? <Sun size={15} /> : <Moon size={15} />}
                        </button>
                    </div>
                </div>

                {/* ── Verses ── */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-8" style={{ background: readerBg, scrollbarWidth: 'thin' }}>
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-bold animate-pulse" style={{ color: 'var(--accent)' }}>Carregando escrituras...</p>
                        </div>
                    )}

                    {!book && !loading && (
                        <div className="flex flex-col items-center justify-center h-full gap-6 text-center select-none">
                            <div className="w-28 h-28 rounded-full flex items-center justify-center shadow-2xl"
                                style={{ background: 'linear-gradient(135deg,#fde68a,#f59e0b)' }}>
                                <BookOpen size={60} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-serif text-3xl font-black mb-2" style={{ color: readerTxt }}>
                                    "A Tua Palavra é Lâmpada"
                                </h3>
                                <p className="text-sm opacity-40">Salmos 119:105 · Selecione um livro para começar</p>
                            </div>
                        </div>
                    )}

                    {!loading && book && verses.length > 0 && (
                        <div className="max-w-2xl mx-auto">
                            {/* Title */}
                            <div className="text-center mb-10">
                                <h3 className="font-serif font-black text-4xl mb-1" style={{ color: readerTxt }}>{book.name}</h3>
                                <p className="text-xs font-bold opacity-30 uppercase tracking-widest">Capítulo {chapter} · {translation}</p>
                                <div className="w-12 h-1 mx-auto mt-4 rounded-full" style={{ background: 'var(--accent)', opacity: 0.4 }} />
                            </div>

                            {/* Verse list */}
                            <div className="space-y-1">
                                {verses.map(v => {
                                    const hl = getHighlight(v.verse);
                                    const isSel = selectedVerses.includes(v.verse);
                                    return (
                                        <div key={v.pk} onClick={() => toggleVerse(v.verse)}
                                            className="group flex items-start gap-3 px-3 py-2 rounded-2xl cursor-pointer transition-all"
                                            style={{
                                                background: isSel ? 'var(--accent)18' : hl && !hl.color.includes('gradient') ? getAlphaColor(hl.color, '33') : 'transparent',
                                                opacity: hl && !isSel ? 0.9 : 1,
                                                border: isSel ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                                            }}>
                                            {hl && hl.color.includes('gradient') && !isSel && (
                                                <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ background: hl.color }} />
                                            )}
                                            <span className="mt-0.5 text-[11px] font-black w-5 text-right shrink-0 transition-colors"
                                                style={{ color: isSel ? 'var(--accent)' : readerTxt, opacity: isSel ? 1 : 0.3 }}>
                                                {v.verse}
                                            </span>
                                            <p className="flex-1 leading-loose"
                                                style={{ fontSize: `${fontSize}px`, color: readerTxt, fontFamily: "'Merriweather', Georgia, serif" }}>
                                                {v.text}
                                            </p>
                                            {hl && (
                                                <div className="shrink-0 flex gap-1 pt-1.5 opacity-60">
                                                    {hl.annotation && <StickyNote size={11} style={{ color: 'var(--accent)' }} />}
                                                    {hl.photo_url && <Camera size={11} style={{ color: 'var(--accent)' }} />}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Chapter navigation */}
                            <div className="flex justify-between gap-4 pt-12 pb-4">
                                <button
                                    disabled={chapter === 1}
                                    onClick={() => setChapter(c => Math.max(1, c - 1))}
                                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm disabled:opacity-20 transition-all hover:scale-105"
                                    style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                                    <ChevronLeft size={16} /> Anterior
                                </button>
                                <button
                                    disabled={chapter === book.chapters}
                                    onClick={() => setChapter(c => Math.min(book.chapters, c + 1))}
                                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white disabled:opacity-20 transition-all hover:scale-105"
                                    style={{ background: 'var(--accent)' }}>
                                    Próximo <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ══ FLOATING PEN BUTTON ══════════════════════════════════ */}
            <AnimatePresence>
                {selectedVerses.length > 0 && (
                    <motion.button
                        key="pen"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={openEditor}
                        className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-6 py-4 rounded-full font-black text-white shadow-2xl"
                        style={{ background: 'linear-gradient(135deg,var(--accent),#7c3aed)' }}
                    >
                        <PenLine size={20} />
                        Marcar ({selectedVerses.length})
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ══ EDITOR MODAL ═════════════════════════════════════════ */}
            <AnimatePresence>
                {editorOpen && (
                    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setEditorOpen(false)} />
                        <motion.div
                            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
                            className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]"
                                style={{ background: editorColor.includes('gradient') ? 'var(--bg-card)' : `${editorColor}20` }}>
                                {editorColor.includes('gradient') && (
                                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: editorColor }} />
                                )}
                                <div className="relative flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                                        style={{ background: 'var(--accent)' }}><PenLine size={18} /></div>
                                    <div>
                                        <h3 className="font-serif font-black text-base" style={{ color: 'var(--text-primary)' }}>Marcador Bíblico</h3>
                                        <p className="text-[11px] opacity-40">{selectedVerses.length} versículo(s) · {book?.name} {chapter}</p>
                                    </div>
                                </div>
                                <button onClick={() => setEditorOpen(false)} className="p-2 rounded-xl hover:bg-[var(--bg-secondary)] transition">
                                    <X size={18} style={{ color: 'var(--text-primary)' }} />
                                </button>
                            </div>

                            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                {/* Verse preview */}
                                <div className="rounded-2xl p-4 space-y-2 border border-[var(--border)] relative overflow-hidden"
                                    style={{ background: editorColor.includes('gradient') ? 'transparent' : `${editorColor}15`, borderLeft: `4px solid ${editorColor.includes('gradient') ? 'var(--accent)' : editorColor}` }}>
                                    {editorColor.includes('gradient') && (
                                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: editorColor }} />
                                    )}
                                    <div className="relative">
                                        {selectedVerses.slice(0, 3).map(vNum => {
                                            const txt = verses.find(v => v.verse === vNum)?.text || '';
                                            return (
                                                <div key={vNum}>
                                                    <p className="text-[10px] font-black opacity-40 mb-0.5">{book?.name} {chapter}:{vNum}</p>
                                                    <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-primary)' }}>"{txt}"</p>
                                                </div>
                                            );
                                        })}
                                        {selectedVerses.length > 3 && <p className="text-xs opacity-30">+ {selectedVerses.length - 3} mais...</p>}
                                    </div>
                                </div>

                                {/* Color */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Escolha uma Cor</p>
                                        <button
                                            onClick={() => setPaletteEditorOpen(true)}
                                            className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] hover:opacity-70 transition-all flex items-center gap-1"
                                        >
                                            <Palette size={12} /> Editar Paleta
                                        </button>
                                    </div>
                                    <div className="flex gap-2 flex-wrap bg-[var(--bg-secondary)] p-4 rounded-3xl border border-[var(--border)]">
                                        {palette.map(c => (
                                            <button key={c.id || c.value} onClick={() => setEditorColor(c.value)} title={c.label}
                                                className="w-8 h-8 rounded-full transition-all hover:scale-110 flex items-center justify-center overflow-hidden"
                                                style={{
                                                    background: c.value,
                                                    border: editorColor === c.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                                                    transform: editorColor === c.value ? 'scale(1.15)' : 'scale(1)',
                                                    boxShadow: editorColor === c.value ? '0 4px 12px var(--accent)44' : 'none',
                                                }}>
                                                {editorColor === c.value && <div className="w-2 h-2 bg-white rounded-full shadow-md" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Annotation */}
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Anotação Pessoal</p>
                                    <textarea value={annotation} onChange={e => setAnnotation(e.target.value)}
                                        placeholder="O que Deus falou ao seu coração nesse texto?"
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none border border-[var(--border)] focus:ring-2 focus:ring-[var(--accent)]/30 transition"
                                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                                </div>

                                {/* Photo */}
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">📸 Foto do Momento</p>
                                    {photoPreview ? (
                                        <div className="relative rounded-2xl overflow-hidden">
                                            <img src={photoPreview} alt="preview" className="w-full h-36 object-cover" />
                                            <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                                                className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/50 text-white hover:bg-red-500 transition">
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => fileInputRef.current?.click()}
                                            className="w-full py-4 rounded-2xl border-2 border-dashed border-[var(--border)] flex items-center justify-center gap-2 text-sm font-bold opacity-50 hover:opacity-100 hover:border-[var(--accent)] transition"
                                            style={{ color: 'var(--text-secondary)' }}>
                                            <Camera size={18} /> Registrar foto da igreja
                                        </button>
                                    )}
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                                </div>

                                {/* Save */}
                                <button onClick={handleSave} disabled={saving}
                                    className="w-full py-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg,var(--accent),#7c3aed)' }}>
                                    {saving
                                        ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        : <><Save size={20} />  Salvar na Bíblia</>
                                    }
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ══ SAVED ITEM DETAIL ════════════════════════════════════ */}
            <AnimatePresence>
                {viewItem && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setViewItem(null)} />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
                            style={{
                                background: 'var(--bg-card)',
                                border: viewItem.color.includes('gradient') ? '1px solid var(--border)' : `3px solid ${viewItem.color}`
                            }}
                        >
                            {viewItem.color.includes('gradient') && (
                                <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: viewItem.color }} />
                            )}
                            <div className="relative px-7 py-5 overflow-hidden" style={{
                                borderBottom: '1px solid var(--border)'
                            }}>
                                {viewItem.color.includes('gradient') && (
                                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: viewItem.color }} />
                                )}
                                {!viewItem.color.includes('gradient') && (
                                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: viewItem.color }} />
                                )}
                                <div className="relative flex justify-between items-center">
                                    <span className="font-serif font-black text-xl" style={{ color: 'var(--text-primary)' }}>
                                        {viewItem.book_name} {viewItem.chapter}:{viewItem.verse}
                                    </span>
                                    <button onClick={() => setViewItem(null)} className="p-2 rounded-xl hover:bg-black/10 transition">
                                        <X size={18} style={{ color: 'var(--text-primary)' }} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-7 space-y-5">
                                <p className="text-lg leading-relaxed italic font-serif" style={{ color: 'var(--text-primary)' }}>
                                    "{viewItem.verse_text}"
                                </p>
                                {viewItem.annotation && (
                                    <div className="p-4 rounded-2xl border border-[var(--border)]" style={{ background: 'var(--bg-secondary)' }}>
                                        <p className="text-[10px] font-black uppercase opacity-40 mb-2">Anotação</p>
                                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{viewItem.annotation}</p>
                                    </div>
                                )}
                                {viewItem.photo_url && (
                                    <div className="rounded-2xl overflow-hidden border border-[var(--border)]">
                                        <img src={viewItem.photo_url} alt="foto" className="w-full object-cover max-h-52" />
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => handleShare('wa', viewItem)}
                                        className="flex-1 min-w-[120px] py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-[var(--border)] hover:bg-[#25D366] hover:text-white transition-all shadow-sm"
                                        title="WhatsApp">
                                        <MessageCircle size={14} /> WhatsApp
                                    </button>
                                    <button
                                        onClick={() => handleShare('mail', viewItem)}
                                        className="flex-1 min-w-[120px] py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-[var(--border)] hover:bg-[var(--accent)] hover:text-white transition-all shadow-sm"
                                        title="Email">
                                        <Mail size={14} /> E-mail
                                    </button>
                                    <button
                                        onClick={() => handleShare('image', viewItem)}
                                        disabled={sharing}
                                        className="flex-1 min-w-[120px] py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-[var(--border)] hover:bg-black hover:text-white transition-all shadow-sm disabled:opacity-50"
                                        title="Baixar Imagem">
                                        {sharing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ImageIcon size={14} /> Salvar PC</>}
                                    </button>
                                    <button
                                        onClick={() => handleShare('copy', viewItem)}
                                        className="flex-1 min-w-[120px] py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-[var(--border)] hover:bg-gray-100 transition-all shadow-sm"
                                        style={{ color: 'var(--text-primary)' }}>
                                        <Copy size={14} /> Copiar
                                    </button>
                                    <button onClick={() => handleDelete(viewItem.id)}
                                        className="p-3 rounded-2xl border border-[var(--border)] hover:border-red-400 hover:text-red-500 transition-all shadow-sm">
                                        <Trash2 size={15} />
                                    </button>
                                </div>

                                {/* Element used only for image capture (hidden in normal view) */}
                                <div className="fixed -left-[5000px] top-0 pointer-events-none">
                                    <div ref={shareCardRef} className="w-[400px] p-10 bg-white" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white text-xl">✝️</div>
                                            <div>
                                                <h4 className="font-bold text-lg text-gray-800">Igreja Cristã</h4>
                                                <p className="text-xs text-[var(--accent)] font-black uppercase tracking-widest">Vivendo a Palavra</p>
                                            </div>
                                        </div>
                                        <div className="relative mb-8 pl-6">
                                            {viewItem.color.includes('gradient') ? (
                                                <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-full" style={{ background: viewItem.color }} />
                                            ) : (
                                                <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-full" style={{ backgroundColor: viewItem.color }} />
                                            )}
                                            <p className="text-2xl leading-relaxed italic text-gray-700">"{viewItem.verse_text}"</p>
                                            <p className="mt-4 font-black text-gray-900 text-sm uppercase tracking-wider">{viewItem.book_name} {viewItem.chapter}:{viewItem.verse}</p>
                                        </div>
                                        {viewItem.annotation && (
                                            <div className="mb-8 p-5 bg-gray-50 rounded-3xl border border-gray-100">
                                                <p className="text-[10px] uppercase font-black opacity-30 mb-2">Reflexão Pessoal</p>
                                                <p className="text-sm text-gray-600 italic">"{viewItem.annotation}"</p>
                                            </div>
                                        )}
                                        {viewItem.photo_url && (
                                            <div className="mb-8 rounded-3xl overflow-hidden shadow-lg">
                                                <img src={viewItem.photo_url} alt="photo" className="w-full h-48 object-cover" />
                                            </div>
                                        )}
                                        <div className="pt-6 border-t border-gray-100 items-center justify-between flex">
                                            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">igrejacrista.com.br</p>
                                            <p className="text-[10px] text-gray-300">{new Date(viewItem.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >
            {/* ══ PALETTE EDITOR MODAL ══════════════════════════════════ */}
            <AnimatePresence>
                {
                    paletteEditorOpen && (
                        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                            <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-xl"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => {
                                    if (editingColorItem) setEditingColorItem(null);
                                    else setPaletteEditorOpen(false);
                                }} />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                                className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                            >
                                <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
                                    <div className="flex items-center gap-3">
                                        <Palette size={18} className="text-[var(--accent)]" />
                                        <h3 className="font-serif font-black text-base" style={{ color: 'var(--text-primary)' }}>Personalizar Paleta</h3>
                                    </div>
                                    <button onClick={() => setPaletteEditorOpen(false)} className="p-2 rounded-xl hover:bg-[var(--bg-secondary)] transition">
                                        <X size={18} style={{ color: 'var(--text-primary)' }} />
                                    </button>
                                </div>

                                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3" style={{ scrollbarWidth: 'thin' }}>
                                    <p className="text-[10px] uppercase font-black opacity-30 tracking-widest mb-4">Seus Marcadores</p>
                                    {palette.map((item, idx) => (
                                        <div key={item.id || idx} className="flex items-center gap-3 p-3 rounded-2xl border border-[var(--border)] group hover:bg-[var(--bg-secondary)] transition-all">
                                            <div className="w-10 h-10 rounded-xl shadow-inner shrink-0" style={{ background: item.value }} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black truncate" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                                                <p className="text-[10px] opacity-40 font-mono uppercase">{item.value.includes('gradient') ? 'Gradiente' : item.value}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setEditingColorItem({ ...item, index: idx });
                                                    setTempLabel(item.label);
                                                    setTempColor(item.value);
                                                }}
                                                className="p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--accent)] hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <PenLine size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Inner Modal for editing a specific item */}
                                <AnimatePresence>
                                    {editingColorItem && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                                            className="absolute inset-0 bg-[var(--bg-card)] z-10 p-8 flex flex-col"
                                        >
                                            <div className="flex justify-between items-center mb-6">
                                                <h4 className="font-black text-sm uppercase tracking-widest opacity-40">Editar Marcador</h4>
                                                <button onClick={() => setEditingColorItem(null)} className="p-2 rounded-xl hover:bg-[var(--bg-secondary)]"><X size={16} /></button>
                                            </div>

                                            <div className="space-y-6 flex-1 overflow-y-auto">
                                                <div className="flex gap-4 items-center mb-4">
                                                    <div className="w-16 h-16 rounded-2xl shadow-xl border border-white/20" style={{ background: tempColor }} />
                                                    <div className="flex-1">
                                                        <p className="text-[10px] font-black opacity-30 mb-1 uppercase">Visualização</p>
                                                        <p className="font-serif italic text-sm" style={{ color: tempColor.includes('gradient') ? 'var(--text-primary)' : tempColor }}>"A Tua Palavra..."</p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-black uppercase opacity-40 block mb-2">Nome do Marcador</label>
                                                    <input
                                                        value={tempLabel}
                                                        onChange={e => setTempLabel(e.target.value)}
                                                        className="w-full px-4 py-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-black uppercase opacity-40 block mb-2">Cor (Hex ou Gradiente)</label>
                                                    <input
                                                        value={tempColor}
                                                        onChange={e => setTempColor(e.target.value)}
                                                        placeholder="#ff0000 ou linear-gradient(...)"
                                                        className="w-full px-4 py-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] text-sm font-mono outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-6 gap-2 pt-2 border-t border-[var(--border)]">
                                                    {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#a855f7', '#06b6d4', '#84cc16'].map(preset => (
                                                        <button
                                                            key={preset}
                                                            onClick={() => setTempColor(preset)}
                                                            className="w-full aspect-square rounded-xl border border-black/10 transition-all hover:scale-110"
                                                            style={{ background: preset }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleSavePaletteItem}
                                                className="w-full py-4 mt-8 rounded-2xl font-black text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                                                style={{ background: 'var(--accent)' }}
                                            >
                                                Salvar Alterações
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {/* Footer / Reset */}
                                <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-secondary)]/30 mt-auto">
                                    <button
                                        onClick={handleResetPalette}
                                        className="text-[10px] font-black text-red-500/60 hover:text-red-500 transition-colors uppercase tracking-widest"
                                    >
                                        Restaurar Padrão
                                    </button>
                                    <div className="flex items-center gap-1 opacity-20">
                                        <div className="w-1 h-1 rounded-full bg-[var(--accent)]" />
                                        <p className="text-[10px] font-bold">Igreja Cristã</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >
        </div >
    );
}
