import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth-context';

export interface TaskList {
  id: string;
  title: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'needsAction' | 'completed';
  notes?: string;
}

export function useTasks() {
  const { accessToken } = useAuth();
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let isMounted = true;
    const loadTaskLists = async () => {
      try {
        const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (data.items && isMounted) {
          setTaskLists(data.items);
          if (data.items.length > 0 && !activeListId) {
            setActiveListId(data.items[0].id);
          }
        }
      } catch (e) {
        console.error('Error fetching task lists', e);
      }
    };
    loadTaskLists();
    return () => { isMounted = false; };
  }, [accessToken, activeListId]);

  useEffect(() => {
    if (!accessToken || !activeListId) return;
    let isMounted = true;
    
    const loadTasks = async () => {
      // Defer state update to avoid synchronous React 18 effect warning
      await Promise.resolve();
      if (!isMounted) return;
      setLoading(true);
      try {
        const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${activeListId}/tasks`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (isMounted) setTasks(data.items || []);
      } catch (e) {
        console.error('Error fetching tasks', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    loadTasks();
    return () => { isMounted = false; };
  }, [accessToken, activeListId]);

  const addTask = async (title: string) => {
    if (!accessToken || !activeListId) return;
    try {
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${activeListId}/tasks`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, status: 'needsAction' })
      });
      const newTask = await res.json();
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (e) {
      console.error('Error adding task', e);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!accessToken || !activeListId) return;
    try {
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;
      
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${activeListId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...taskToUpdate, ...updates })
      });
      const updated = await res.json();
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    } catch (e) {
      console.error('Error updating task', e);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!accessToken || !activeListId) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${activeListId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (e) {
      console.error('Error deleting task', e);
    }
  };

  return {
    taskLists,
    activeListId,
    setActiveListId,
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask
  };
}
