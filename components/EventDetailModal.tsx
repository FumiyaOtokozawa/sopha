import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import format from 'date-fns/format';
import { Dialog } from '@mui/material';
import { Event } from '../types/event';
import { useRouter } from 'next/router';
import { enUS } from 'date-fns/locale';

interface EventDetailModalProps {
  event: Event | null;
  open: boolean;
  onClose: () => void;
  onEventUpdated: () => void;
}

export default function EventDetailModal({ event, open, onClose, onEventUpdated }: EventDetailModalProps) {
  const [error, setError] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
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

  const handleDelete = async (deleteType: 'single' | 'all' | 'future') => {
    if (!event) return;

    // 削除確認メッセージを設定
    const confirmMessages = {
      single: '本当にこのイベントを削除しますか？',
      all: '本当に全ての繰り返しイベントを削除しますか？',
      future: '本当にこのイベントと以降のイベントを全て削除しますか？'
    };

    // 確認ダイアログを表示
    if (!window.confirm(confirmMessages[deleteType])) {
      return;
    }

    try {
      if (deleteType === 'single') {
        const { error } = await supabase
          .from('EVENT_LIST')
          .update({ act_kbn: false })
          .eq('event_id', event.event_id);
        
        if (error) throw error;
      } else if (deleteType === 'all') {
        const { error } = await supabase
          .from('EVENT_LIST')
          .update({ act_kbn: false })
          .eq('repeat_id', event.repeat_id);
        
        if (error) throw error;
      } else if (deleteType === 'future') {
        const { error } = await supabase
          .from('EVENT_LIST')
          .update({ act_kbn: false })
          .eq('repeat_id', event.repeat_id)
          .gte('start_date', event.start_date);
        
        if (error) throw error;
      }

      setShowDeleteOptions(false);  // 削除オプションのポップアップを閉じる
      onEventUpdated();
      onClose();
      router.push('/events/eventListPage');
    } catch (error) {
      console.error('削除エラー:', error);
      setError('イベントの削除に失敗しました');  // エラーメッセージを表示
    }
  };

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
                    {format(new Date(event.start_date), "yyyy/MM/dd (ccc) HH:mm", { locale: enUS })}
                  </div>
                  <div className="text-gray-300">→</div>
                  <div>
                    {format(new Date(event.start_date), 'yyyy/MM/dd') === format(new Date(event.end_date), 'yyyy/MM/dd')
                      ? format(new Date(event.end_date), "HH:mm", { locale: enUS })
                      : format(new Date(event.end_date), "yyyy/MM/dd (ccc) HH:mm", { locale: enUS })
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