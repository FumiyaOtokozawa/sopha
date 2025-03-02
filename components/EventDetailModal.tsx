import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Dialog } from '@mui/material';
import { Event } from '../types/event';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import LinkIcon from '@mui/icons-material/Link';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import VideocamIcon from '@mui/icons-material/Videocam';

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
        <div className="bg-gradient-to-br from-[#37373F] via-[#3D3E42] to-[#5b63d3]/50 p-4 pb-8">
          {isOwner && (
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-2.5 py-0.5 mb-3">
              <AssignmentIndIcon className="h-3.5 w-3.5 text-white" />
              <span className="text-white text-xs font-medium">主催イベント</span>
            </div>
          )}
          <h2 className="text-xl font-bold text-white mb-2">{event.title}</h2>
          <div className="flex items-center text-white/90">
            <div className="flex items-center bg-[#37373F] rounded-lg px-2.5 py-1 shadow-sm">
              <CalendarMonthIcon className="h-3.5 w-3.5 mr-1.5 text-[#8E93DA]" fontSize="small" />
              <span className="text-xs font-medium">
                {format(new Date(event.start_date), "yyyy年MM月dd日", { locale: ja })}
                <span className="ml-1">
                  ({format(new Date(event.start_date), "E", { locale: ja })})
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* メイン情報部分 */}
        <div className="bg-[#2D2D33] -mt-4 rounded-t-2xl p-4 space-y-4 overflow-y-auto flex-1">
          {/* 時間情報 */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#37373F] rounded-lg flex items-center justify-center" style={{ height: '36px', width: '36px' }}>
              <AccessTimeIcon className="h-5 w-5 text-[#8E93DA]" fontSize="small" />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 leading-tight">開催時間</div>
              <div className="text-white text-sm font-medium">
                {format(new Date(event.start_date), "HH:mm")} → {format(new Date(event.end_date), "HH:mm")}
              </div>
            </div>
          </div>

          {/* 場所情報 */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#37373F] rounded-lg flex items-center justify-center" style={{ height: '36px', width: '36px' }}>
              <LocationOnIcon className="h-5 w-5 text-[#8E93DA]" fontSize="small" />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 leading-tight">開催場所</div>
              <div className="text-white text-sm font-medium">{event.venue_nm || '未定'}</div>
            </div>
          </div>

          {/* 開催形式 */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#37373F] rounded-lg flex items-center justify-center" style={{ height: '36px', width: '36px' }}>
              <VideocamIcon className="h-5 w-5 text-[#8E93DA]" fontSize="small" />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 leading-tight">開催形式</div>
              <div className="text-white text-sm font-medium">
                {event.format === 'offline' ? 'オフライン' :
                 event.format === 'online' ? 'オンライン' : 'ハイブリッド'}
              </div>
            </div>
          </div>

          {/* 主催者情報 */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#37373F] rounded-lg flex items-center justify-center" style={{ height: '36px', width: '36px' }}>
              <PersonIcon className="h-5 w-5 text-[#8E93DA]" fontSize="small" />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 leading-tight">主催者</div>
              <div className="text-white text-sm font-medium">{event.ownerName}</div>
            </div>
          </div>

          {/* 参加URL */}
          {event.url && (
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-[#37373F] rounded-lg flex items-center justify-center" style={{ height: '36px', width: '36px' }}>
                <LinkIcon className="h-5 w-5 text-[#8E93DA]" fontSize="small" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 leading-tight">参加URL</div>
                <a 
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8E93DA] hover:underline break-all text-sm font-medium"
                >
                  {event.url}
                </a>
              </div>
            </div>
          )}

          {/* フッターボタン */}
          <div className="sticky bottom-0 pt-4 pb-1 bg-[#2D2D33]">
            <button
              onClick={() => {
                onClose();
                router.push(`/events/eventDetailPage?event_id=${event.event_id}`);
              }}
              className="w-full py-2.5 bg-[#5b63d3] hover:bg-opacity-90 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <span>イベント詳細へ</span>
              <ArrowForwardIcon className="h-4 w-4" fontSize="small" />
            </button>
          </div>
        </div>

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-gray-800/50 text-white/70 hover:bg-gray-800/80 hover:text-white transition-all duration-300"
        >
          <CloseIcon className="h-4 w-4" fontSize="small" />
        </button>
      </div>
    </Dialog>
  );
};

export default EventDetailModal; 