'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Journal, Message, createJournal, getJournals, getMessages, addMessage, deleteJournal, renameJournal, updateJournalMood, updateJournalSummary, addMessagesBatch } from '@/lib/db';
import { Plus, MessageSquare, LogOut, Send, Trash2, Menu, Pencil, Check, X, Moon, Sun, Download, Search, Smile, ChevronDown, BookOpen, Loader2, CheckSquare, Calendar, MoreVertical } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TasksPanel } from '@/components/TasksPanel';
import { toast } from '@/components/Toast';
import { CalendarPanel } from '@/components/CalendarPanel';

const MOODS = ['😃', '😌', '😐', '😔', '😢'];

export default function Dashboard() {
  const { user, loading, logOut } = useAuth();
  const router = useRouter();

  const [journals, setJournals] = useState<Journal[]>([]);
  const [activeJournal, setActiveJournal] = useState<Journal | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [isDark, setIsDark] = useState(false);

  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingJournalId, setDeletingJournalId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{journal: Journal, matchCount: number}[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [isGeneratingJournal, setIsGeneratingJournal] = useState(false);
  const [showCompiledJournal, setShowCompiledJournal] = useState(false);
  const [isEditingJournal, setIsEditingJournal] = useState(false);
  const [editedJournalText, setEditedJournalText] = useState('');
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setTimeout(() => setIsDark(true), 0);
        root.classList.add('dark');
      } else {
        setTimeout(() => setIsDark(false), 0);
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

  const loadJournals = useCallback(async () => {
    if (!user) return;
    const j = await getJournals(user.uid);
    setJournals(j);
  }, [user]);

  const loadMessages = useCallback(async (journalId: string) => {
    if (!user) return;
    const m = await getMessages(user.uid, journalId);
    setMessages(m);
  }, [user]);

  useEffect(() => {
    if (user) {
      setTimeout(() => {
        loadJournals();
      }, 0);
    }
  }, [user, loadJournals]);

  useEffect(() => {
    if (activeJournal && user) {
      setTimeout(() => {
        loadMessages(activeJournal.id);
      }, 0);
    } else {
      setTimeout(() => setMessages([]), 0);
    }
  }, [activeJournal, user, loadMessages]);

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

  const [showGuidedForm, setShowGuidedForm] = useState(false);
  const [guidedAnswers, setGuidedAnswers] = useState({ q1: '', q2: '', q3: '', q4: '' });
  const [isSubmittingGuided, setIsSubmittingGuided] = useState(false);

  const openNewJournalModal = () => {
    setActiveJournal(null);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const createFreeChatJournal = async () => {
    if (!user) return;
    const title = 'New Reflection ' + new Date().toLocaleDateString();
    const newId = await createJournal(user.uid, title);
    await loadJournals();
    const newJ = await getJournals(user.uid);
    setActiveJournal(newJ.find(j => j.id === newId) || null);
  };

  const submitGuidedForm = async () => {
    if (!user) return;
    setIsSubmittingGuided(true);
    try {
      const title = 'Guided Reflection ' + new Date().toLocaleDateString();
      const newId = await createJournal(user.uid, title);
      
      const questions = [
        "What went well today?",
        "What was challenging?",
        "How are you feeling overall?",
        "What are you looking forward to tomorrow?"
      ];
      
      const answers = [guidedAnswers.q1, guidedAnswers.q2, guidedAnswers.q3, guidedAnswers.q4];
      
      const messagesToBatch: {role: 'model' | 'user', text: string}[] = [];
      for (let i = 0; i < questions.length; i++) {
        if (answers[i] && answers[i].trim()) {
           messagesToBatch.push({ role: 'model', text: questions[i] });
           messagesToBatch.push({ role: 'user', text: answers[i].trim() });
        }
      }
      
      if (messagesToBatch.length > 0) {
        await addMessagesBatch(user.uid, newId, messagesToBatch);
      }
      
      await loadJournals();
      const newJ = await getJournals(user.uid);
      setActiveJournal(newJ.find(j => j.id === newId) || null);
      
      setShowGuidedForm(false);
      setGuidedAnswers({ q1: '', q2: '', q3: '', q4: '' });
    } catch(e) {
       console.error(e);
       toast('Failed to create guided journal', 'error');
    } finally {
       setIsSubmittingGuided(false);
    }
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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch AI response');
      }
      const data = await res.json();

      await addMessage(user.uid, activeJournal.id, 'model', data.text);
      await loadMessages(activeJournal.id);
    } catch (error: any) {
      console.error(error);
      toast(error.message || 'Failed to send message.', 'error');
    } finally {
      setIsTyping(false);
    }
  };

  const handleMakeJournal = async () => {
    if (!user || !activeJournal) return;
    setIsGeneratingJournal(true);
    
    // Find index of last summarized message
    let newMessages = messages;
    if (activeJournal.lastSummarizedMessageId) {
        const lastIdx = messages.findIndex(m => m.id === activeJournal.lastSummarizedMessageId);
        if (lastIdx !== -1) {
            newMessages = messages.slice(lastIdx + 1);
        }
    }
    
    // If no new messages, just show the compiled journal
    if (newMessages.length === 0 && activeJournal.compiledJournal) {
        setShowCompiledJournal(true);
        setIsGeneratingJournal(false);
        return;
    }
    
    if (newMessages.length === 0) {
        setIsGeneratingJournal(false);
        toast("Chat more to generate a journal!", "error");
        return;
    }
    
    try {
        const res = await fetch('/api/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                existingJournal: activeJournal.compiledJournal || '',
                newMessages: newMessages.map(m => ({ role: m.role, text: m.text }))
            })
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to summarize');
        }
        const data = await res.json();
        
        const lastMessageId = newMessages[newMessages.length - 1].id;
        
        await updateJournalSummary(user.uid, activeJournal.id, data.text, lastMessageId);
        
        setActiveJournal({
            ...activeJournal,
            compiledJournal: data.text,
            lastSummarizedMessageId: lastMessageId
        });
        setShowCompiledJournal(true);
    } catch (e: any) {
        console.error(e);
        toast(e.message || "Failed to generate journal summary.", "error");
    } finally {
        setIsGeneratingJournal(false);
    }
  };

  const handleSaveEditedJournal = async () => {
    if (!user || !activeJournal) return;
    try {
      await updateJournalSummary(user.uid, activeJournal.id, editedJournalText, activeJournal.lastSummarizedMessageId || '');
      setActiveJournal({ ...activeJournal, compiledJournal: editedJournalText });
      setIsEditingJournal(false);
      toast('Journal updated successfully');
    } catch (e) {
      console.error(e);
      toast('Failed to save journal', 'error');
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
      {/* Sidebar Toggle (Always Visible) */}
      <div className="fixed top-0 left-4 z-50 h-[61px] flex items-center">
        <button aria-label="Toggle sidebar" onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm transition-colors hover:bg-gray-200 dark:hover:bg-gray-700">
          <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out transform ${sidebarOpen ? 'translate-x-0 md:ml-0' : '-translate-x-full md:-ml-72'} md:relative`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between mt-14">
          <h2 className="font-medium text-lg text-gray-900 dark:text-white">My Journals</h2>
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
            <button onClick={openNewJournalModal} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {(() => {
            const groupedMap = new Map<string, Journal[]>();
            
            journals.forEach((journal) => {
              let d: Date;
              if (journal.createdAt?.toDate) d = journal.createdAt.toDate();
              else if (journal.createdAt) d = new Date(journal.createdAt as any);
              else d = new Date();
              
              const dateStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
              
              if (!groupedMap.has(dateStr)) {
                groupedMap.set(dateStr, []);
              }
              groupedMap.get(dateStr)!.push(journal);
            });

            return Array.from(groupedMap.entries()).map(([dateStr, items]) => (
              <div key={dateStr}>
                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-3">{dateStr}</h3>
                <div className="space-y-1">
                  {items.map((journal) => (
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
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 relative transition-colors overflow-hidden">
        {activeJournal ? (
          <>
            {/* Chat Area Header */}
            <div className="w-full px-4 md:px-8 h-[61px] flex items-center justify-end border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-20 shrink-0">
              <div className="relative">
                <button
                  onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                  className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-900 dark:border-white px-4 h-9 rounded-full flex items-center justify-center gap-1 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  aria-label="Toggle actions menu"
                >
                    <span className="text-sm font-medium">Quick Actions</span>
                    {isActionsMenuOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
                  </button>
                  
                  {isActionsMenuOpen && (
                    <>
                      {/* Invisible overlay for click-outside to close */}
                      <div className="fixed inset-0 z-20" onClick={() => setIsActionsMenuOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col z-30 animate-in fade-in zoom-in-95 duration-200">
                      <button
                        onClick={() => { setIsTasksOpen(!isTasksOpen); setIsCalendarOpen(false); setIsActionsMenuOpen(false); }}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full text-left"
                      >
                        <CheckSquare className="w-4 h-4" /> Tasks
                      </button>
                      <button
                        onClick={() => { setIsCalendarOpen(!isCalendarOpen); setIsTasksOpen(false); setIsActionsMenuOpen(false); }}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full text-left"
                      >
                        <Calendar className="w-4 h-4" /> Calendar
                      </button>
                      <button
                        onClick={() => { handleMakeJournal(); setIsActionsMenuOpen(false); }}
                        disabled={isGeneratingJournal}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full text-left disabled:opacity-50"
                      >
                        {isGeneratingJournal ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                        ) : (
                          <><BookOpen className="w-4 h-4" /> Make Journal</>
                        )}
                      </button>
                      {activeJournal.compiledJournal && (
                         <button 
                           onClick={() => { setShowCompiledJournal(true); setIsActionsMenuOpen(false); }}
                           className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full text-left"
                         >
                           <BookOpen className="w-4 h-4 opacity-50" /> View Journal
                         </button>
                      )}
                    </div>
                    </>
                  )}
                </div>
            </div>

            <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="max-w-3xl mx-auto space-y-6 pb-20">
                <div className="text-center mb-8 pt-14 relative group">
                  <h1 className="text-2xl text-gray-900 dark:text-white flex items-center justify-center gap-2">
                    {activeJournal.mood && <span>{activeJournal.mood}</span>}
                    {activeJournal.title}
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {activeJournal.createdAt && typeof activeJournal.createdAt.toDate === 'function' 
                        ? new Date(activeJournal.createdAt.toDate()).toLocaleDateString() 
                        : (activeJournal.createdAt ? new Date(activeJournal.createdAt as any).toLocaleDateString() : 'Just now')}
                    </p>
                    <button
                      onClick={(e) => {
                        handleDeleteConfirm(e, activeJournal.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-all"
                      title="Delete Journal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
              <h2 className="text-xl text-gray-900 dark:text-white mb-2 text-center">How would you like to reflect?</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 text-center">Choose how you want to journal today.</p>
              
              <div className="space-y-3">
                <button 
                  onClick={createFreeChatJournal}
                  className="w-full flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-900 dark:hover:border-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group"
                >
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg group-hover:bg-white dark:group-hover:bg-gray-700 transition-colors">
                    <MessageSquare className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Free Chat</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Talk freely with the AI about your day in an open-ended conversation.</p>
                  </div>
                </button>

                <button 
                  onClick={() => setShowGuidedForm(true)}
                  className="w-full flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-900 dark:hover:border-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group"
                >
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg group-hover:bg-white dark:group-hover:bg-gray-700 transition-colors">
                    <BookOpen className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Guided Form</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Answer a few prompts if you&apos;re not sure where to start. Perfect for quick logging.</p>
                  </div>
                </button>
              </div>

              <div className="mt-8 text-center border-t border-gray-100 dark:border-gray-800 pt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Not looking to write right now?<br/>
                  <span className="hidden md:inline">Select an older entry from the sidebar to view past reflections.</span>
                  <span className="md:hidden">Tap the menu icon to select an older entry.</span>
                </p>
              </div>
            </div>
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
                  No matches found for &quot;{searchQuery}&quot;
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
      {/* Compiled Journal Modal */}
      {showCompiledJournal && activeJournal?.compiledJournal && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Compiled Journal
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingJournal ? (
                  <button 
                    onClick={() => {
                      setEditedJournalText(activeJournal.compiledJournal || '');
                      setIsEditingJournal(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                ) : (
                  <button 
                    onClick={handleSaveEditedJournal}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Save
                  </button>
                )}
                <button 
                  onClick={() => {
                    setShowCompiledJournal(false);
                    setIsEditingJournal(false);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              {isEditingJournal ? (
                <textarea
                  value={editedJournalText}
                  onChange={(e) => setEditedJournalText(e.target.value)}
                  className="w-full h-full min-h-[50vh] p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 resize-none text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="Edit your journal entry..."
                />
              ) : (
                <div className={`markdown-body prose prose-sm max-w-none ${isDark ? 'prose-invert text-gray-100' : 'text-gray-800'}`}>
                  <ReactMarkdown>{activeJournal.compiledJournal}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showGuidedForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl text-gray-900 dark:text-white">Guided Reflection</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Take a moment to answer these prompts. Feel free to skip any.</p>
              </div>
              <button onClick={() => setShowGuidedForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">What went well today?</label>
                <textarea
                  value={guidedAnswers.q1}
                  onChange={e => setGuidedAnswers({...guidedAnswers, q1: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 resize-none h-24 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="A small win, a nice conversation..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">What was challenging?</label>
                <textarea
                  value={guidedAnswers.q2}
                  onChange={e => setGuidedAnswers({...guidedAnswers, q2: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 resize-none h-24 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="Something that drained your energy..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">How are you feeling overall?</label>
                <textarea
                  value={guidedAnswers.q3}
                  onChange={e => setGuidedAnswers({...guidedAnswers, q3: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 resize-none h-24 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="Tired but satisfied, anxious..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">What are you looking forward to tomorrow?</label>
                <textarea
                  value={guidedAnswers.q4}
                  onChange={e => setGuidedAnswers({...guidedAnswers, q4: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 resize-none h-24 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="A quiet morning, wrapping up a project..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 flex justify-end gap-3">
              <button 
                onClick={() => setShowGuidedForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                disabled={isSubmittingGuided}
              >
                Cancel
              </button>
              <button 
                onClick={submitGuidedForm}
                disabled={isSubmittingGuided}
                className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingGuided && <Loader2 className="w-4 h-4 animate-spin" />}
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {isTasksOpen && (
        <TasksPanel 
          onClose={() => setIsTasksOpen(false)}
          journalText={activeJournal?.compiledJournal}
          messages={messages}
        />
      )}

      {isCalendarOpen && (
        <CalendarPanel onClose={() => setIsCalendarOpen(false)} />
      )}

    </div>
  );
}
