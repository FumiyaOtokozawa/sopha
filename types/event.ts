type EventFormat = 'offline' | 'online' | 'hybrid';

export interface Event {
  event_id: number;
  title: string;
  start_date: string;
  end_date: string;
  place: string;
  description?: string;
  owner: string;
  ownerName?: string;
  genre: string;
  repeat_id?: number | null;
  abbreviation: string;
  format: EventFormat;
  url?: string;
  venue_latitude?: number;
  venue_longitude?: number;
  venue_radius?: number;
} 