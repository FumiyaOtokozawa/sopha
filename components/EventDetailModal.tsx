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

    if (!editedEvent.abbreviation) {
      setError('省略名は必須項目です');
      return;
    }

    if ([...editedEvent.abbreviation].length > 3) {
      setError('省略名は全角3文字以内で入力してください');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('EVENT_LIST')
        .update({
          title: editedEvent.title,
          start_date: editedEvent.start_date,
          end_date: editedEvent.end_date,
          place: editedEvent.place,
          description: editedEvent.description,
          genre: editedEvent.genre,
          abbreviation: editedEvent.abbreviation,
          format: editedEvent.format,
          url: editedEvent.url,
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
        {isOwner && !isEditing && (
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
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-400">
                  タイトル<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editedEvent?.title}
                  onChange={(e) => setEditedEvent(prev => ({ ...prev!, title: e.target.value }))}
                  className="w-full h-10 bg-[#1D1D21] rounded px-3 text-[#FCFCFC]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-400">
                  省略名（全角3文字以内）<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editedEvent?.abbreviation || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if ([...value].length <= 3) {
                      setEditedEvent(prev => ({ ...prev!, abbreviation: value }))
                    }
                  }}
                  className="w-full h-10 bg-[#1D1D21] rounded px-3 text-[#FCFCFC] placeholder-[#6B7280]"
                  placeholder="例：懇親会、ポケカ、など"
                  required
                />
              </div>

              <div className="flex gap-4">
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1 text-gray-400">
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
                          height: '40px',
                          backgroundColor: '#1D1D21',
                          color: '#FCFCFC',
                          fontSize: '14px',
                          padding: '0 8px'
                        },
                        '& .MuiInputBase-input': {
                          padding: '0',
                          height: '40px',
                          lineHeight: '40px'
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1 text-gray-400">
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
                          height: '40px',
                          backgroundColor: '#1D1D21',
                          color: '#FCFCFC',
                          fontSize: '14px',
                          padding: '0 8px'
                        },
                        '& .MuiInputBase-input': {
                          padding: '0',
                          height: '40px',
                          lineHeight: '40px'
                        }
                      }}
                    />
                  </div>
                </LocalizationProvider>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-400">
                  場所<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editedEvent?.place}
                  onChange={(e) => setEditedEvent(prev => ({ ...prev!, place: e.target.value }))}
                  className="w-full h-10 bg-[#1D1D21] rounded px-3 text-[#FCFCFC]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-400">
                  説明
                </label>
                <textarea
                  value={editedEvent?.description}
                  onChange={(e) => setEditedEvent(prev => ({ ...prev!, description: e.target.value }))}
                  className="w-full bg-[#1D1D21] rounded p-2 h-32 text-[#FCFCFC]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-400">
                  開催形式<span className="text-red-500">*</span>
                </label>
                <select
                  value={editedEvent?.format}
                  onChange={(e) => setEditedEvent(prev => ({ 
                    ...prev!, 
                    format: e.target.value as 'offline' | 'online' | 'hybrid'
                  }))}
                  className="w-full h-10 bg-[#1D1D21] rounded px-3 text-[#FCFCFC]"
                  required
                >
                  <option value="offline">オフライン</option>
                  <option value="online">オンライン</option>
                  <option value="hybrid">ハイブリッド</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-400">
                  URL
                  {editedEvent?.format === 'online' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="url"
                  value={editedEvent?.url}
                  onChange={(e) => setEditedEvent(prev => ({ ...prev!, url: e.target.value }))}
                  className="w-full h-10 bg-[#1D1D21] rounded px-3 text-[#FCFCFC]"
                  required={editedEvent?.format === 'online'}
                  placeholder="https://..."
                />
              </div>

              <div className="flex justify-end gap-4">
                <div className="flex-1 flex justify-start">
                  <button
                    onClick={() => {
                      if (event?.repeat_id) {
                        setShowDeleteOptions(!showDeleteOptions);
                      } else {
                        handleDelete('single');
                      }
                    }}
                    className="h-10 w-10 rounded bg-red-500 hover:bg-opacity-80 flex items-center justify-center relative"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {showDeleteOptions && event?.repeat_id && (
                      <div className="absolute left-0 top-12 w-72 bg-[#2D2D33] rounded-lg shadow-lg border border-gray-700 z-50">
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
                  </button>
                </div>
                <button
                  onClick={handleCancel}
                  className="w-24 h-10 rounded bg-[#4A4B50] text-[#FCFCFC] hover:bg-opacity-80"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  className="w-24 h-10 rounded bg-[#8E93DA] text-black font-bold hover:bg-opacity-80"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
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
                <p className="text-gray-300">at {event.place || '未定'}</p>
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
          )}
        </div>

        {!isEditing && (
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
            {isOwner && (
              <button
                onClick={handleEdit}
                className="flex-1 h-10 px-4 rounded bg-[#4A4B50] hover:bg-opacity-80 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#FCFCFC]" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
} 