import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import Header from '../../components/Header';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import format from 'date-fns/format';

interface Event {
  event_id: number;
  title: string;
  start_date: string;
  end_date: string;
  place: string;
  description?: string;
  owner: string;
  ownerName?: string;
  genre: string;
}

export default function EventDetailPage() {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [editedEvent, setEditedEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    console.log('Router query:', router.query);
    console.log('Event ID:', router.query.event_id);
    
    const fetchEventAndCheckOwner = async () => {
      if (!router.query.event_id) {
        console.log('No event_id yet');
        return;
      }

      try {
        // イベント情報を取得
        const { data: eventData, error: eventError } = await supabase
          .from('EVENT_LIST')
          .select('*')
          .eq('event_id', Number(router.query.event_id))
          .single();

        if (eventError) throw eventError;

        // 現在のユーザー情報を取得
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('ユーザー情報が取得できません');

        // ユーザーのemp_noを取得
        const { data: userData, error: userError } = await supabase
          .from('USER_INFO')
          .select('emp_no')
          .eq('email', user.email)
          .single();

        if (userError) throw userError;

        // オーナー情報を取得
        const { data: ownerData, error: ownerError } = await supabase
          .from('USER_INFO')
          .select('myoji, namae')
          .eq('emp_no', eventData.owner)
          .single();

        if (!ownerError && ownerData) {
          eventData.ownerName = `${ownerData.myoji} ${ownerData.namae}`;
        }

        setEvent(eventData);
        setEditedEvent(eventData);
        setIsOwner(userData.emp_no === eventData.owner);

      } catch (error) {
        console.error('エラー:', error);
        setError('イベント情報の取得に失敗しました');
      }
    };

    fetchEventAndCheckOwner();
  }, [router.query]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedEvent(event);
  };

  const handleSave = async () => {
    if (!editedEvent) return;

    try {
      const { error } = await supabase
        .from('EVENT_LIST')
        .update({
          title: editedEvent.title,
          start_date: editedEvent.start_date,
          end_date: editedEvent.end_date,
          place: editedEvent.place,
          description: editedEvent.description,
          genre: editedEvent.genre
        })
        .eq('event_id', Number(router.query.event_id));

      if (error) throw error;

      setEvent(editedEvent);
      setIsEditing(false);
      router.push('/events/eventListPage');
    } catch (error) {
      console.error('更新エラー:', error);
      setError('イベントの更新に失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('このイベントを削除してもよろしいですか？')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('EVENT_LIST')
        .update({ act_kbn: false })
        .eq('event_id', Number(router.query.event_id));

      if (error) throw error;

      router.push('/events/eventListPage');
    } catch (error) {
      console.error('削除エラー:', error);
      setError('イベントの削除に失敗しました');
    }
  };

  if (!event) {
    return <div>読み込み中...</div>;
  }

  return (
    <div>
      <Header />
      <div className="p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#2D2D33] rounded-lg p-6">
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
                // 編集フォーム
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

                  <div className="flex gap-4">
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-1 text-[#FCFCFC]">
                          開始日時<span className="text-red-500">*</span>
                        </label>
                        <DateTimePicker
                          value={new Date(editedEvent?.start_date || '')}
                          onChange={(date) => setEditedEvent(prev => ({ ...prev!, start_date: date?.toISOString() || '' }))}
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
                          onChange={(date) => setEditedEvent(prev => ({ ...prev!, end_date: date?.toISOString() || '' }))}
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

                  <div className="flex justify-end gap-4 mt-6">
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
                // 詳細表示
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
          </div>
        </div>
      </div>
    </div>
  );
} 