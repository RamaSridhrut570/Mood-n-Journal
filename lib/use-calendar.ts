import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth-context';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
}

export function useCalendar() {
  const { accessToken } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let isMounted = true;
    
    const loadEvents = async () => {
      await Promise.resolve();
      if (!isMounted) return;
      setLoading(true);
      try {
        const timeMin = new Date().toISOString();
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&maxResults=10&orderBy=startTime&singleEvents=true`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (isMounted) setEvents(data.items || []);
      } catch (e) {
        console.error('Error fetching calendar events', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    loadEvents();
    return () => { isMounted = false; };
  }, [accessToken]);

  const addEvent = async (summary: string, date: Date) => {
    if (!accessToken) return;
    try {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(end.getHours() + 1);

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() }
        })
      });
      const newEvent = await res.json();
      if (newEvent.id) {
        setEvents(prev => [...prev, newEvent].sort((a, b) => {
          const aTime = a.start.dateTime || a.start.date || '';
          const bTime = b.start.dateTime || b.start.date || '';
          return new Date(aTime).getTime() - new Date(bTime).getTime();
        }));
      }
    } catch (e) {
      console.error('Error adding event', e);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!accessToken) return;
setEvents(prev => prev.filter(e => e.id !== eventId));
    
    

    try {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
       
    } catch (e) {
      console.error('Error deleting event', e);
    }
  };

  return {
    events,
    loading,
    addEvent,
    deleteEvent
  };
}
