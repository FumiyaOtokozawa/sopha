export interface Event {
  event_id: number;
  title: string;
  start_date: string;
  end_date: string;
  start: Date;
  end: Date;
  place?: string;
  owner: string;
  ownerName?: string;
  genre: string;
  description?: string;
  repeat_id?: number | null;
} 