import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import format from 'date-fns/format';
import { Dialog } from '@mui/material';
import { Event } from '../types/event';

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

  const handleDelete = async () => {
    if (!event || !window.confirm('このイベントを削除してもよろしいですか？')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('EVENT_LIST')
        .update({ act_kbn: false })
        .eq('event_id', event.event_id);

      if (deleteError) throw deleteError;

      onEventUpdated();
      onClose();
    } catch (error) {
      console.error('削除エラー:', error);
      setError('イベントの削除に失敗しました');
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
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded bg-red-500 text-white hover:bg-opacity-80"
              >
                削除
              </button>
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
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-[#4A4B50] text-[#FCFCFC] hover:bg-opacity-80"
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
} 