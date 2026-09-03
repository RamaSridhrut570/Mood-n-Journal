'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Journal, Message, createJournal, getJournals, getMessages, addMessage, deleteJournal, renameJournal, updateJournalMood } from '@/lib/db';
import { Plus, MessageSquare, LogOut, Send, Trash2, Menu, Pencil, Check, X, Moon, Sun, Download, Search, Smile, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const MOODS = ['😃', '😌', '😐', '😔', '😢'];

export default function Dashboard() {
  const { user, loading, logOut } = useAuth();
  const router = useRouter();

  const [journals, setJournals] = useState<Journal[]>([]);
  const [activeJournal, setActiveJournal] = useState<Journal | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingJournalId, setDeletingJournalId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{journal: Journal, matchCount: number}[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setIsDark(true);
        root.classList.add('dark');
      } else {
        setIsDark(false);
        root.classList.remove('dark');
      }
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    const root = window.document.documentElement;
    if (!isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadJournals();
    }
  }, [user]);

  useEffect(() => {
    if (activeJournal && user) {
      loadMessages(activeJournal.id);
    } else {
      setMessages([]);
    }
  }, [activeJournal, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
  };

  useEffect(() => {
    const doSearch = async () => {
      if (!searchQuery.trim() || !user) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      
      const results: {journal: Journal, matchCount: number}[] = [];
      const lowerQuery = searchQuery.toLowerCase();
      
      for (const journal of journals) {
        let matchCount = 0;
        if (journal.title.toLowerCase().includes(lowerQuery)) matchCount++;
        
        const msgs = await getMessages(user.uid, journal.id);
        const msgMatches = msgs.filter(m => m.text.toLowerCase().includes(lowerQuery)).length;
        matchCount += msgMatches;
        
        if (matchCount > 0) {
          results.push({ journal, matchCount });
        }
      }
      
      setSearchResults(results.sort((a,b) => b.matchCount - a.matchCount));
      setIsSearching(false);
    };
    
    const debounceTimeout = setTimeout(doSearch, 500);
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery, journals, user]);

  const handleMoodSelect = async (mood: string) => {
    if (!user || !activeJournal) return;
    await updateJournalMood(user.uid, activeJournal.id, mood);
    setActiveJournal({ ...activeJournal, mood });
    setShowMoodPicker(false);
    await loadJournals();
  };

  const loadJournals = async () => {
    if (!user) return;
    const j = await getJournals(user.uid);
    setJournals(j);
    if (j.length > 0 && !activeJournal) {
      setActiveJournal(j[0]);
    }
  };

  const loadMessages = async (journalId: string) => {
    if (!user) return;
    const m = await getMessages(user.uid, journalId);
    setMessages(m);
  };

  const handleNewJournal = async () => {
    if (!user) return;
    const title = 'New Reflection ' + new Date().toLocaleDateString();
    const newId = await createJournal(user.uid, title);
    await loadJournals();
    const newJ = await getJournals(user.uid);
    setActiveJournal(newJ.find(j => j.id === newId) || null);
    setSidebarOpen(false);
  };

  const handleRenameStart = (e: React.MouseEvent, journal: Journal) => {
    e.stopPropagation();
    setEditingJournalId(journal.id);
    setEditingTitle(journal.title);
    setDeletingJournalId(null);
  };

  const handleRenameSave = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user || !editingTitle.trim()) return;
    await renameJournal(user.uid, id, editingTitle.trim());
    setEditingJournalId(null);
    await loadJournals();
    if (activeJournal?.id === id) {
      setActiveJournal(prev => prev ? { ...prev, title: editingTitle.trim() } : null);
    }
  };

  const handleRenameCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingJournalId(null);
  };

  const handleDeleteStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingJournalId(id);
    setEditingJournalId(null);
  };

  const handleDeleteConfirm = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;
    
    await deleteJournal(user.uid, id);
    if (activeJournal?.id === id) {
      setActiveJournal(null);
    }
    setDeletingJournalId(null);
    await loadJournals();
  };

  const handleDeleteCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingJournalId(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !activeJournal) return;

    const userText = input.trim();
    setInput('');
    
    const tempUserMsg: Message = { id: Date.now().toString(), role: 'user', text: userText, createdAt: new Date() };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsTyping(true);

    try {
      await addMessage(user.uid, activeJournal.id, 'user', userText);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: messages.map(m => ({ role: m.role, text: m.text })),
          message: userText
        })
      });

      if (!res.ok) throw new Error('Failed to fetch AI response');
      const data = await res.json();

      await addMessage(user.uid, activeJournal.id, 'model', data.text);
      await loadMessages(activeJournal.id);
    } catch (error) {
      console.error(error);
      alert('Failed to send message.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleExport = async (e: React.MouseEvent, journal: Journal) => {
    e.stopPropagation();
    if (!user) return;

    const msgs = await getMessages(user.uid, journal.id);

    let content = `# ${journal.title}\n\n`;
    const date = journal.createdAt?.toDate 
      ? journal.createdAt.toDate() 
      : (journal.createdAt ? new Date(journal.createdAt as any) : new Date());
    content += `Date: ${date.toLocaleDateString()}\n`;
    if (journal.mood) content += `Mood: ${journal.mood}\n`;
    content += `\n---\n\n`;

    msgs.forEach(msg => {
      const roleName = msg.role === 'user' ? 'Me' : 'AI Assistant';
      content += `**${roleName}:**\n${msg.text}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${journal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden absolute top-4 left-4 z-20">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md shadow-sm">
          <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 z-10 w-72 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-200 ease-in-out`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between mt-12 md:mt-0">
          <h2 className="font-serif font-medium text-lg text-gray-900 dark:text-white">My Journals</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleDarkMode}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsSearchOpen(true)}
              title="Search Journals"
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <button onClick={handleNewJournal} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {(() => {
            const groupedJournals: { dateStr: string; items: Journal[] }[] = [];
            let currentGroup = '';
            let currentItems: Journal[] = [];
            
            journals.forEach((journal) => {
              let d: Date;
              if (journal.createdAt?.toDate) d = journal.createdAt.toDate();
              else if (journal.createdAt) d = new Date(journal.createdAt as any);
              else d = new Date();
              
              const dateStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
              
              if (dateStr !== currentGroup) {
                if (currentGroup) {
                  groupedJournals.push({ dateStr: currentGroup, items: currentItems });
                }
                currentGroup = dateStr;
                currentItems = [journal];
              } else {
                currentItems.push(journal);
              }
            });
            if (currentGroup) {
              groupedJournals.push({ dateStr: currentGroup, items: currentItems });
            }

            return groupedJournals.map((group) => (
              <div key={group.dateStr}>
                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-3">{group.dateStr}</h3>
                <div className="space-y-1">
                  {group.items.map((journal) => (
                    <div
                      key={journal.id}
                      onClick={() => { setActiveJournal(journal); setSidebarOpen(false); }}
                      className={`group flex flex-col p-3 rounded-lg cursor-pointer transition-colors ${activeJournal?.id === journal.id ? 'bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50 border border-transparent'}`}
                    >
                      {deletingJournalId === journal.id ? (
                        <div className="flex flex-col gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Delete this entry?</span>
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => handleDeleteConfirm(e, journal.id)} className="flex-1 text-xs bg-red-500 hover:bg-red-600 text-white py-1.5 rounded transition-colors">Yes</button>
                            <button onClick={handleDeleteCancel} className="flex-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-1.5 rounded transition-colors">No</button>
                          </div>
                        </div>
                      ) : editingJournalId === journal.id ? (
                        <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                          <input
                            autoFocus
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameSave(e as any, journal.id)}
                            className="flex-1 min-w-0 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-400"
                          />
                          <button onClick={(e) => handleRenameSave(e, journal.id)} className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={handleRenameCancel} className="p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <MessageSquare className={`w-4 h-4 shrink-0 ${activeJournal?.id === journal.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                            <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                              {journal.mood && <span className="mr-1">{journal.mood}</span>}
                              {journal.title}
                            </span>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                            <button 
                              onClick={(e) => handleExport(e, journal)}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded transition-all"
                              title="Export"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => handleRenameStart(e, journal)}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded transition-all"
                              title="Rename"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteStart(e, journal.id)}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
          {journals.length === 0 && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">No journals yet. Click + to start.</p>
          )}
        </div>

        {/* User Account Section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.displayName}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</span>
            </div>
            <button onClick={logOut} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 relative transition-colors">
        {activeJournal ? (
          <>
            <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="max-w-3xl mx-auto space-y-6 pb-20">
                <div className="text-center mb-8 pt-12 md:pt-4">
                  <h1 className="text-2xl font-serif text-gray-900 dark:text-white">
                    {activeJournal.mood && <span className="mr-2">{activeJournal.mood}</span>}
                    {activeJournal.title}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {activeJournal.createdAt && typeof activeJournal.createdAt.toDate === 'function' 
                      ? new Date(activeJournal.createdAt.toDate()).toLocaleDateString() 
                      : (activeJournal.createdAt ? new Date(activeJournal.createdAt as any).toLocaleDateString() : 'Just now')}
                  </p>
                </div>
                
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 ${msg.role === 'user' ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 shadow-sm'}`}>
                      {msg.role === 'model' ? (
                        <div className={`markdown-body prose prose-sm max-w-none ${isDark ? 'prose-invert text-gray-100' : 'text-gray-800'}`}>
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed font-medium">
                          {msg.text}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="absolute bottom-0 w-full bg-gradient-to-t from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900 pt-16 pb-6 px-4 md:px-8">
              <div className="max-w-3xl mx-auto relative">
                
                {/* Floating buttons above input */}
                <div className="absolute -top-24 left-0 w-full flex items-center justify-between pointer-events-none px-2">
                  <div className="flex-1" />
                  <button 
                    onClick={scrollToBottom}
                    className={`pointer-events-auto p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-full shadow-md transition-all duration-300 ${isAtBottom ? 'opacity-0 scale-90 translate-y-4 pointer-events-none' : 'opacity-100 scale-100 translate-y-0'}`}
                    title="Scroll to bottom"
                    tabIndex={isAtBottom ? -1 : 0}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                  <div className="flex-1" />
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowMoodPicker(!showMoodPicker)}
                      className="p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                      title="Set entry mood"
                    >
                      {activeJournal.mood ? (
                        <span className="text-lg leading-none block">{activeJournal.mood}</span>
                      ) : (
                        <Smile className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    {showMoodPicker && (
                      <div className="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg flex gap-1 z-50">
                        {MOODS.map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleMoodSelect(m)}
                            className="w-10 h-10 text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} className="relative flex-1 flex items-center">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Write your reflection..."
                      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full pl-6 pr-14 py-4 text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-transparent transition-all"
                      disabled={isTyping}
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="p-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full disabled:opacity-50 disabled:bg-gray-400 dark:disabled:bg-gray-600 hover:bg-gray-800 dark:hover:bg-white transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-700">
              <MessageSquare className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <h2 className="text-xl font-serif text-gray-900 dark:text-white mb-2">Welcome to your Journal</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">Create a new journal entry to start reflecting with your AI assistant.</p>
            <button
              onClick={handleNewJournal}
              className="flex items-center gap-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 py-2.5 px-6 rounded-full font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Journal
            </button>
          </div>
        )}
      </div>

      {/* Global Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50 flex flex-col items-center pt-[10vh] px-4">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search across all journal entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white"
              />
              <button 
                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {searchQuery.trim() === '' ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  Type to search through your past journal entries and AI reflections.
                </div>
              ) : isSearching ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  No matches found for "{searchQuery}"
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map(({journal, matchCount}) => (
                    <button
                      key={journal.id}
                      onClick={() => {
                        setActiveJournal(journal);
                        setIsSearchOpen(false);
                      }}
                      className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl flex items-center justify-between transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {journal.mood && <span className="mr-2">{journal.mood}</span>}
                          {journal.title}
                        </span>
                        <span className="text-xs text-gray-500">
                          {journal.createdAt && typeof journal.createdAt.toDate === 'function' ? new Date(journal.createdAt.toDate()).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full font-medium">
                        {matchCount} match{matchCount !== 1 ? 'es' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
