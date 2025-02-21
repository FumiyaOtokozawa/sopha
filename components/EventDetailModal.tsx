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

interface EventDetailModalProps {
  event: Event | null;
  open: boolean;
  onClose: () => void;
  onEventUpdated: () => void;
}

export default function EventDetailModal({ event, open, onClose, onEventUpdated }: EventDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkOwner = async () => {
      if (!event) return;
      
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
    };

    checkOwner();
    setEditedEvent(event);
  }, [event]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedEvent(event);
    setError('');
  };

  const handleSave = async () => {
    if (!editedEvent) return;

    try {
      const { error: updateError } = await supabase
        .from('EVENT_LIST')
        .update({
          title: editedEvent.title,
          start_date: editedEvent.start_date,
          end_date: editedEvent.end_date,
          place: editedEvent.place,
          description: editedEvent.description,
          genre: editedEvent.genre
        })
        .eq('event_id', editedEvent.event_id);

      if (updateError) throw updateError;

      setIsEditing(false);
      onEventUpdated();
      onClose();
    } catch (error) {
      console.error('更新エラー:', error);
      setError('イベントの更新に失敗しました');
    }
  };

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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#FCFCFC]">イベント詳細</h1>
          {isOwner && !isEditing && (
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                className="px-4 py-2 rounded bg-[#8E93DA] text-black font-bold hover:bg-opacity-80"
              >
                編集
              </button>
              <div className="relative">
                <button
                  onClick={() => {
                    if (event?.repeat_id) {
                      setShowDeleteOptions(!showDeleteOptions);
                    } else {
                      handleDelete('single');
                    }
                  }}
                  className="px-4 py-2 rounded bg-red-500 text-white hover:bg-opacity-80"
                >
                  削除
                </button>
                {showDeleteOptions && event?.repeat_id && (
                  <div className="absolute right-0 top-12 w-72 bg-[#2D2D33] rounded-lg shadow-lg border border-gray-700 z-50">
                    <div className="p-3 space-y-2">
                      <button
                        onClick={() => handleDelete('single')}
                        className="w-full p-2 text-left rounded bg-[#1D1D21] text-[#FCFCFC] hover:bg-[#37373F] transition-colors"
                      >
                        このイベントのみを削除
                      </button>
                      <button
                        onClick={() => handleDelete('future')}
                        className="w-full p-2 text-left rounded bg-[#1D1D21] text-[#FCFCFC] hover:bg-[#37373F] transition-colors"
                      >
                        このイベントと以降のイベントを削除
                      </button>
                      <button
                        onClick={() => handleDelete('all')}
                        className="w-full p-2 text-left rounded bg-[#1D1D21] text-[#FCFCFC] hover:bg-[#37373F] transition-colors"
                      >
                        全ての繰り返しイベントを削除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 text-red-500">{error}</div>
        )}

        <div className="space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-[#FCFCFC]">
                  タイトル<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editedEvent?.title}
                  onChange={(e) => setEditedEvent(prev => ({ ...prev!, title: e.target.value }))}
                  className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC]"
                  required
                />
              </div>

              <div className="flex gap-4">
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1 text-[#FCFCFC]">
                      開始日時<span className="text-red-500">*</span>
                    </label>
                    <DateTimePicker
                      value={new Date(editedEvent?.start_date || '')}
                      onChange={(date) => setEditedEvent(prev => ({
                        ...prev!,
                        start_date: date?.toISOString() || '',
                        start: date || new Date()
                      }))}
                      sx={{
                        width: '100%',
                        '& .MuiInputBase-root': {
                          backgroundColor: '#1D1D21',
                          color: '#FCFCFC',
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1 text-[#FCFCFC]">
                      終了日時<span className="text-red-500">*</span>
                    </label>
                    <DateTimePicker
                      value={new Date(editedEvent?.end_date || '')}
                      onChange={(date) => setEditedEvent(prev => ({
                        ...prev!,
                        end_date: date?.toISOString() || '',
                        end: date || new Date()
                      }))}
                      sx={{
                        width: '100%',
                        '& .MuiInputBase-root': {
                          backgroundColor: '#1D1D21',
                          color: '#FCFCFC',
                        }
                      }}
                    />
                  </div>
                </LocalizationProvider>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[#FCFCFC]">
                  場所<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editedEvent?.place}
                  onChange={(e) => setEditedEvent(prev => ({ ...prev!, place: e.target.value }))}
                  className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[#FCFCFC]">
                  説明
                </label>
                <textarea
                  value={editedEvent?.description}
                  onChange={(e) => setEditedEvent(prev => ({ ...prev!, description: e.target.value }))}
                  className="w-full bg-[#1D1D21] rounded p-2 h-32 text-[#FCFCFC]"
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 rounded bg-[#4A4B50] text-[#FCFCFC] hover:bg-opacity-80"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded bg-[#8E93DA] text-black font-bold hover:bg-opacity-80"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-[#FCFCFC]">
              <div>
                <h2 className="text-xl font-bold mb-2">{event.title}</h2>
                <p className="text-gray-400">主催者：{event.ownerName}</p>
              </div>
              
              <div>
                <h3 className="font-medium mb-1">日時</h3>
                <p className="text-gray-400">
                  {format(new Date(event.start_date), 'yyyy年M月d日 HH:mm', { locale: ja })} - 
                  {format(new Date(event.end_date), ' yyyy年M月d日 HH:mm', { locale: ja })}
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-1">場所</h3>
                <p className="text-gray-400">{event.place || '未定'}</p>
              </div>

              {event.description && (
                <div>
                  <h3 className="font-medium mb-1">説明</h3>
                  <p className="text-gray-400 whitespace-pre-wrap">{event.description}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => {
                onClose();
                router.push(`/events/eventDetailPage?event_id=${event.event_id}`);
              }}
              className="px-4 py-2 rounded bg-[#8E93DA] text-black font-bold hover:bg-opacity-80 w-3/4"
            >
              イベント詳細へ
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
} 