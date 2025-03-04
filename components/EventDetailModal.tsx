import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Dialog, CircularProgress, Fade } from '@mui/material';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const router = useRouter();

  // モーダルを閉じる処理をカスタマイズ
  const handleClose = useCallback(() => {
    // まず閉じるアニメーションのフラグを立てる
    setIsClosing(true);
    
    // アニメーション完了後にモーダルを実際に閉じる
    setTimeout(() => {
      onClose();
      // モーダルが完全に閉じた後にリセット
      setTimeout(() => {
        setIsClosing(false);
      }, 100);
    }, 300);
  }, [onClose]);

  useEffect(() => {
    // モーダルが開かれたときだけデータを取得
    if (isOpen && !isClosing && eventId) {
      setIsLoading(true);
      
      const fetchEventDetails = async () => {
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
        } finally {
          // アニメーションのためにローディング状態を少し遅延させて解除
          setTimeout(() => {
            setIsLoading(false);
          }, 300);
        }
      };

      fetchEventDetails();
    }
    
    // モーダルが閉じられたときはデータをクリアしない
    // データは次回モーダルが開かれるときにリセットされる
  }, [eventId, isOpen, isClosing]);

  // モーダルが完全に閉じた後にデータをクリア
  useEffect(() => {
    if (!isOpen && !isClosing) {
      // モーダルが完全に閉じた後にデータをクリア
      setTimeout(() => {
        setEvent(null);
      }, 300);
    }
  }, [isOpen, isClosing]);

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
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
      TransitionComponent={Fade}
      transitionDuration={300}
    >
      <div className="relative flex flex-col max-h-[90vh]">
        {isLoading ? (
          <Fade in={isLoading} timeout={300}>
            <div className="flex flex-col items-center justify-center p-16 min-h-[300px]">
              <CircularProgress color="primary" size={48} />
              <span className="mt-4 text-white text-sm">読み込み中...</span>
            </div>
          </Fade>
        ) : !event ? (
          <Fade in={!isLoading && !event && !isClosing} timeout={300}>
            <div className="flex items-center justify-center p-16 min-h-[300px]">
              <span className="text-white">イベント情報が見つかりません</span>
            </div>
          </Fade>
        ) : (
          <Fade in={!isLoading && !!event && !isClosing} timeout={isClosing ? 100 : 500}>
            <div className={`animate-fade-in ${isClosing ? 'animate-fade-out' : ''}`}>
              {/* ヘッダー部分 */}
              <div className="bg-gradient-to-br from-[#37373F] via-[#3D3E42] to-[#5b63d3]/50 p-4 pb-8">
                {isOwner && (
                  <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-2.5 py-0.5 mb-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <AssignmentIndIcon className="h-3.5 w-3.5 text-white" />
                    <span className="text-white text-xs font-medium">主催イベント</span>
                  </div>
                )}
                <h2 className="text-xl font-bold text-white mb-2 animate-fade-in-up" style={{ animationDelay: '200ms' }}>{event.title}</h2>
                <div className="flex items-center text-white/90 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
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
                <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
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
                <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                  <div className="p-1.5 bg-[#37373F] rounded-lg flex items-center justify-center" style={{ height: '36px', width: '36px' }}>
                    <LocationOnIcon className="h-5 w-5 text-[#8E93DA]" fontSize="small" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 leading-tight">開催場所</div>
                    <div className="text-white text-sm font-medium">{event.venue_nm || '未定'}</div>
                  </div>
                </div>

                {/* 開催形式 */}
                <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
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
                <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '700ms' }}>
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
                  <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '800ms' }}>
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
                <div className="sticky bottom-0 pt-4 pb-1 bg-[#2D2D33] animate-fade-in-up" style={{ animationDelay: '900ms' }}>
                  <button
                    onClick={() => {
                      handleClose();
                      router.push(`/events/eventDetailPage?event_id=${event.event_id}`);
                    }}
                    className="w-full py-2.5 bg-[#5b63d3] hover:bg-opacity-90 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <span>イベント詳細へ</span>
                    <ArrowForwardIcon className="h-4 w-4" fontSize="small" />
                  </button>
                </div>
              </div>
            </div>
          </Fade>
        )}

        {/* 閉じるボタン */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-gray-800/50 text-white/70 hover:bg-gray-800/80 hover:text-white transition-all duration-300"
        >
          <CloseIcon className="h-4 w-4" fontSize="small" />
        </button>
      </div>
    </Dialog>
  );
};

export default EventDetailModal; 