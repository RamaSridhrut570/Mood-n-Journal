import React, { useState } from 'react';
import { useTasks, Task } from '@/lib/use-tasks';
import { useAuth } from '@/lib/auth-context';
import { CheckSquare, Circle, CheckCircle2, Trash2, X, Plus, Loader2, Sparkles, Pencil, Check } from 'lucide-react';

export function TasksPanel({ onClose, journalText, messages }: { onClose: () => void, journalText?: string, messages?: {role: string, text: string}[] }) {
  const { accessToken, signIn } = useAuth();
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editedTaskTitle, setEditedTaskTitle] = useState('');
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [extractStatus, setExtractStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await addTask(newTaskTitle);
    setNewTaskTitle('');
  };

  const handleExtractTasks = async () => {
    if (!journalText && (!messages || messages.length === 0)) return;
    setIsExtracting(true);
    setExtractStatus(null);
    try {
      const res = await fetch('/api/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalText, messages })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to extract tasks');
      }
      const data = await res.json();
      const extractedTitles: string[] = data.tasks || [];
      if (extractedTitles.length === 0) {
        setExtractStatus({ type: 'success', message: 'No new actionable tasks found.' });
      } else {
        for (const title of extractedTitles) {
          await addTask(title);
        }
        setExtractStatus({ type: 'success', message: `Extracted ${extractedTitles.length} task${extractedTitles.length > 1 ? 's' : ''}.` });
      }
    } catch (e: any) {
      console.error('Extraction error:', e);
      setExtractStatus({ type: 'error', message: e?.message || 'Failed to extract tasks. Please try again.' });
    } finally {
      setIsExtracting(false);
    }
  };

  if (!accessToken) {
    return (
      <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-800">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-gray-500" />
            <h2 className="font-serif font-medium">Google Tasks</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 flex flex-col items-center justify-center text-center h-full">
          <p className="text-sm text-gray-500 mb-4">Connect to Google Tasks to manage actionable items from your journal.</p>
          <button onClick={signIn} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-800 transform transition-transform">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-gray-500" />
          <h2 className="font-serif font-medium text-gray-900 dark:text-white">Google Tasks</h2>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-2">
        <button 
          onClick={handleExtractTasks}
          disabled={isExtracting}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
        >
          {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Auto-Extract from Chat
        </button>
        {extractStatus && (
          <div
            className={`text-xs px-2.5 py-1.5 rounded ${
              extractStatus.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
            }`}
          >
            {extractStatus.message}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && tasks.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            No tasks found.
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg group">
              <button 
                onClick={() => updateTask(task.id, { status: task.status === 'needsAction' ? 'completed' : 'needsAction' })}
                className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-blue-500 transition-colors"
              >
                {task.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5" />}
              </button>
              <div className="flex-1 min-w-0">
                {editingTaskId === task.id ? (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (editedTaskTitle.trim()) {
                      updateTask(task.id, { title: editedTaskTitle });
                    }
                    setEditingTaskId(null);
                  }}>
                    <input
                      type="text"
                      value={editedTaskTitle}
                      onChange={(e) => setEditedTaskTitle(e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
                      autoFocus
                    />
                  </form>
                ) : (
                  <>
                    <p className={`text-sm ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                      {task.title}
                    </p>
                    {task.notes && <p className="text-xs text-gray-500 mt-1 truncate">{task.notes}</p>}
                  </>
                )}
              </div>
              <div className={`flex items-center gap-1 transition-all ${editingTaskId === task.id || deletingTaskId === task.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {deletingTaskId === task.id ? (
                  <>
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="px-2 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
                    >
                      Delete
                    </button>
                    <button 
                      onClick={() => setDeletingTaskId(null)}
                      className="p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : editingTaskId === task.id ? (
                  <button 
                    onClick={() => {
                      if (editedTaskTitle.trim()) {
                        updateTask(task.id, { title: editedTaskTitle });
                      }
                      setEditingTaskId(null);
                    }}
                    className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                        setEditingTaskId(task.id);
                        setEditedTaskTitle(task.title);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeletingTaskId(task.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAdd} className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a new task..."
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 text-sm dark:text-white"
          />
          <button 
            type="submit"
            disabled={!newTaskTitle.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </form>
    </div>
  );
}
