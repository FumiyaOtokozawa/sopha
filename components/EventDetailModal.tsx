import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Dialog } from '@mui/material';
import { Event } from '../types/event';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

const EventDetailModal: React.FC<Props> = ({ isOpen, onClose, eventId }) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventId) return;

      try {
        // イベント情報を取得（会場情報も含める）
        const { data: eventData, error: eventError } = await supabase
          .from('EVENT_LIST')
          .select(`
            *,
            venue:EVENT_VENUE!venue_id(venue_nm)
          `)
          .eq('event_id', eventId)
          .single();

        if (eventError) throw eventError;

        // オーナー情報を取得
        const { data: ownerData } = await supabase
          .from('USER_INFO')
          .select('myoji, namae')
          .eq('emp_no', eventData.owner)
          .single();

        // イベント情報を更新
        setEvent({
          ...eventData,
          venue_nm: eventData.venue?.venue_nm,
          ownerName: ownerData ? `${ownerData.myoji} ${ownerData.namae}` : undefined
        });

        // オーナーチェック
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('USER_INFO')
          .select('emp_no')
          .eq('email', user.email)
          .single();

        if (userData) {
          setIsOwner(userData.emp_no === eventData.owner);
        }
      } catch (error) {
        console.error('エラー:', error);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  if (!event) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: '#2D2D33',
          borderRadius: '1rem',
          overflow: 'hidden',
          maxHeight: '90vh',
        },
      }}
    >
      <div className="relative flex flex-col max-h-[90vh]">
        {/* ヘッダー部分 */}
        <div className="bg-gradient-to-br from-[#37373F] via-[#3D3E42] to-[#5b63d3]/50 p-6 pb-12">
          {isOwner && (
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1.323l-3.954 1.582A1 1 0 004 6.868V16a1 1 0 001 1h10a1 1 0 001-1V6.868a1 1 0 00-1.046-.963L11 4.323V3a1 1 0 00-1-1H10zm4 8V7L9 5v1h2v1H9v1h2v1H9v1h6z" clipRule="evenodd" />
              </svg>
              <span className="text-white text-sm font-medium">主催イベント</span>
            </div>
          )}
          <h2 className="text-2xl font-bold text-white mb-2">{event.title}</h2>
          <div className="text-white/80 text-sm">
            {format(new Date(event.start_date), "yyyy-MM-dd (EEE)", { locale: enUS })}
          </div>
        </div>

        {/* メイン情報部分 */}
        <div className="bg-[#2D2D33] -mt-6 rounded-t-2xl p-6 space-y-6 overflow-y-auto flex-1">
          {/* 時間情報 */}
          <div className="flex items-start gap-4">
            <div className="p-2 bg-[#37373F] rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#8E93DA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-400 ">開催時間</div>
              <div className="text-white">
                {format(new Date(event.start_date), "HH:mm")} → {format(new Date(event.end_date), "HH:mm")}
              </div>
            </div>
          </div>

          {/* 場所情報 */}
          <div className="flex items-start gap-4">
            <div className="p-2 bg-[#37373F] rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#8E93DA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-400 ">開催場所</div>
              <div className="text-white">{event.venue_nm || '未定'}</div>
            </div>
          </div>

          {/* 開催形式 */}
          <div className="flex items-start gap-4">
            <div className="p-2 bg-[#37373F] rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#8E93DA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-400">開催形式</div>
              <div className="text-white">
                {event.format === 'offline' ? 'オフライン' :
                 event.format === 'online' ? 'オンライン' : 'ハイブリッド'}
              </div>
            </div>
          </div>

          {/* 主催者情報 */}
          <div className="flex items-start gap-4">
            <div className="p-2 bg-[#37373F] rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#8E93DA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-400">主催者</div>
              <div className="text-white">{event.ownerName}</div>
            </div>
          </div>

          {/* 参加URL */}
          {event.url && (
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[#37373F] rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#8E93DA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">参加URL</div>
                <a 
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8E93DA] hover:underline break-all"
                >
                  {event.url}
                </a>
              </div>
            </div>
          )}

          {/* フッターボタン */}
          <div className="sticky bottom-0 pt-8 pb-2 bg-[#2D2D33]">
            <button
              onClick={() => {
                onClose();
                router.push(`/events/eventDetailPage?event_id=${event.event_id}`);
              }}
              className="w-full py-3 bg-[#5b63d3] hover:bg-opacity-90 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>イベント詳細へ</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default EventDetailModal; 