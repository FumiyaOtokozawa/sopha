type EventFormat = 'offline' | 'online' | 'hybrid';

export interface Event {
  event_id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue_id: number;
  venue_nm?: string;
  place?: string;
  description?: string;
  owner: string;
  ownerName?: string;
  genre: string;
  repeat_id?: number | null;
  format: EventFormat;
  url?: string;
  abbreviation?: string;
} 