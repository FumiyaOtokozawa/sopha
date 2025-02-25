import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Dialog } from '@mui/material';
import { Event } from '../types/event';
import { useRouter } from 'next/router';
import { format } from 'date-fns';

interface EventDetailModalProps {
  event: Event | null;
  open: boolean;
  onClose: () => void;
  onEventUpdated: () => void;
}

export default function EventDetailModal({ event, open, onClose, onEventUpdated }: EventDetailModalProps) {
  const [error, setError] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkOwner = async () => {
      if (!event) return;

      try {
        // イベント情報を取得（会場情報も含める）
        const { data: eventData, error: eventError } = await supabase
          .from('EVENT_LIST')
          .select(`
            *,
            venue:EVENT_VENUE!venue_id(venue_nm)
          `)
          .eq('event_id', event.event_id)
          .single();

        if (eventError) throw eventError;

        // イベント情報を更新
        if (eventData) {
          event.venue_nm = eventData.venue?.venue_nm;
        }

        // 以下は既存のコード
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('USER_INFO')
          .select('emp_no')
          .eq('email', user.email)
          .single();

        if (userData) {
          setIsOwner(userData.emp_no === event.owner);
        }
      } catch (error) {
        console.error('エラー:', error);
      }
    };

    checkOwner();
  }, [event]);

  if (!event) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: '#2D2D33',
          borderRadius: '0.5rem',
        },
      }}
    >
      <div className="p-6">
        {isOwner && (
          <div className="mb-4 bg-[#8E93DA] bg-opacity-10 border border-[#8E93DA] rounded-lg p-3 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#8E93DA]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1.323l-3.954 1.582A1 1 0 004 6.868V16a1 1 0 001 1h10a1 1 0 001-1V6.868a1 1 0 00-1.046-.963L11 4.323V3a1 1 0 00-1-1H10zm4 8V7L9 5v1h2v1H9v1h2v1H9v1h6z" clipRule="evenodd" />
              </svg>
              <span className="text-[#8E93DA] font-medium">あなたが主催しているイベントです</span>
            </div>
          </div>
        )}
        {error && (
          <div className="mb-4 text-red-500">{error}</div>
        )}

        <div className="space-y-4">
          <div className="space-y-4 text-[#FCFCFC]">
            <div>
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                {event.genre === '1' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#8E93DA]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {event.title}
              </h2>
            </div>

            <div>
              <p className="text-gray-300">
                <div className="flex items-center gap-2">
                  <div>
                    {format(new Date(event.start_date), "yyyy/MM/dd (ccc) HH:mm")}
                  </div>
                  <div className="text-gray-300">→</div>
                  <div>
                    {format(new Date(event.start_date), 'yyyy/MM/dd') === format(new Date(event.end_date), 'yyyy/MM/dd')
                      ? format(new Date(event.end_date), "HH:mm")
                      : format(new Date(event.end_date), "yyyy/MM/dd (ccc) HH:mm")
                    }
                  </div>
                </div>
              </p>
            </div>

            <div>
              <p className="text-gray-300">at {event.venue_nm || '未定'}</p>
            </div>

            {event.description && (
              <div>
                <h3 className="font-medium mb-1">説明</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
            
            <p className="text-gray-400">主催者：{event.ownerName}</p>

            <div>
              <h3 className="font-medium mb-1">開催形式</h3>
              <p className="text-gray-300">
                {event.format === 'offline' ? 'オフライン' :
                 event.format === 'online' ? 'オンライン' : 'ハイブリッド'}
              </p>
            </div>

            {event.url && (
              <div>
                <h3 className="font-medium mb-1">参加URL</h3>
                <a 
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {event.url}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center items-center gap-2 mt-6 w-full">
          <button
            onClick={() => {
              onClose();
              router.push(`/events/eventDetailPage?event_id=${event.event_id}`);
            }}
            className="flex-[9] h-10 px-4 rounded bg-[#5b63d3] text-white font-bold hover:bg-opacity-80"
          >
            イベント詳細へ
          </button>
        </div>
      </div>
    </Dialog>
  );
} 