'use client';

import { useState } from 'react';
import { useCalendar, CalendarEvent } from '@/lib/use-calendar';
import { X, Calendar, Plus, Trash2, Clock, ExternalLink } from 'lucide-react';

interface CalendarPanelProps {
  onClose: () => void;
}

export function CalendarPanel({ onClose }: CalendarPanelProps) {
  const { events, loading, addEvent, deleteEvent } = useCalendar();
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventDate || !newEventTime) return;
    
    setIsAdding(true);
    const dateStr = `${newEventDate}T${newEventTime}`;
    await addEvent(newEventTitle, new Date(dateStr));
    setNewEventTitle('');
    setNewEventDate('');
    setNewEventTime('');
    setIsAdding(false);
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.start.dateTime) {
      return new Date(event.start.dateTime).toLocaleString(undefined, { 
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
      });
    }
    if (event.start.date) {
      return new Date(event.start.date).toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric'
      });
    }
    return '';
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-800 transform transition-transform">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
          <Calendar className="w-5 h-5" />
          <h2>Google Calendar</h2>
        </div>
        <button aria-label="Close panel" onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
        <form onSubmit={handleAddEvent} className="space-y-3">
          <input
            type="text"
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
            placeholder="Event title..."
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-gray-900 dark:focus:border-gray-500"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-gray-900 dark:focus:border-gray-500"
            />
            <input
              type="time"
              value={newEventTime}
              onChange={(e) => setNewEventTime(e.target.value)}
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-gray-900 dark:focus:border-gray-500"
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || !newEventTitle.trim() || !newEventDate || !newEventTime}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && events.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">Loading schedule...</div>
        ) : events.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">No upcoming events found.</div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="group flex flex-col gap-2 p-3 bg-white dark:bg-gray-800  rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                  {event.summary || '(No title)'}
                </span>
                <button
                  onClick={() => deleteEvent(event.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-all"
                  aria-label="Delete event"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatEventTime(event)}</span>
                </div>
                <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-all">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
