import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import Header from '../../components/Header';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import format from 'date-fns/format';
import { Box, Avatar } from '@mui/material';
import FooterMenu from '../../components/FooterMenu';
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';

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
  repeat_id?: number | null;
}

interface EventParticipant {
  emp_no: number;
  myoji: string;
  namae: string;
  status: '1' | '0';
}

interface SupabaseEntry {
  emp_no: number;
  status: '1' | '0';
  USER_INFO: {
    myoji: string;
    namae: string;
  };
}

export default function EventDetailPage() {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [editedEvent, setEditedEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentUserEmpNo, setCurrentUserEmpNo] = useState<number | null>(null);
  const [entryStatus, setEntryStatus] = useState<'1' | '0' | null>(null);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);

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
        setCurrentUserEmpNo(userData.emp_no);

      } catch (error) {
        console.error('エラー:', error);
        setError('イベント情報の取得に失敗しました');
      }
    };

    fetchEventAndCheckOwner();

    // ユーザーの参加ステータスを取得
    const fetchEntryStatus = async () => {
      if (!currentUserEmpNo || !router.query.event_id) return;

      try {
        const { data: entry } = await supabase
          .from('EVENT_TEMP_ENTRY')
          .select('status')
          .eq('event_id', router.query.event_id)
          .eq('emp_no', currentUserEmpNo)
          .single();

        if (entry) {
          setEntryStatus(entry.status as '1' | '0');
        }
      } catch (error) {
        console.error('参加ステータスの取得に失敗:', error);
      }
    };

    fetchEntryStatus();

    // 参加者情報を取得
    const fetchParticipants = async () => {
      if (!router.query.event_id) return;

      try {
        const { data, error } = await supabase
          .from('EVENT_TEMP_ENTRY')
          .select(`
            emp_no,
            status,
            USER_INFO!inner(myoji, namae)
          `)
          .eq('event_id', router.query.event_id);

        if (error) throw error;

        // データの型を明示的に指定
        const formattedParticipants = (data as unknown as SupabaseEntry[])?.map(entry => ({
          emp_no: entry.emp_no,
          myoji: entry.USER_INFO.myoji,
          namae: entry.USER_INFO.namae,
          status: entry.status
        })) || [];

        setParticipants(formattedParticipants);
      } catch (error) {
        console.error('参加者の取得に失敗:', error);
      }
    };

    fetchParticipants();
  }, [router.query, currentUserEmpNo]);

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
    if (!event?.repeat_id) {
      if (!window.confirm('このイベントを削除してもよろしいですか？')) {
        return;
      }
      await deleteEvent('single');
      return;
    }
    
    setShowDeleteModal(true);
  };

  const deleteEvent = async (deleteType: 'single' | 'all' | 'future') => {
    try {
      if (deleteType === 'single') {
        const { error } = await supabase
          .from('EVENT_LIST')
          .update({ act_kbn: false })
          .eq('event_id', Number(router.query.event_id));
        
        if (error) throw error;
      } else if (deleteType === 'all') {
        const { error } = await supabase
          .from('EVENT_LIST')
          .update({ act_kbn: false })
          .eq('repeat_id', event?.repeat_id);
        
        if (error) throw error;
      } else if (deleteType === 'future') {
        const { error } = await supabase
          .from('EVENT_LIST')
          .update({ act_kbn: false })
          .eq('repeat_id', event?.repeat_id)
          .gte('start_date', event?.start_date);
        
        if (error) throw error;
      }

      router.push('/events/eventListPage');
    } catch (error) {
      console.error('削除エラー:', error);
      setError('イベントの削除に失敗しました');
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handleEventEntry = async (status: '1' | '0') => {
    if (!currentUserEmpNo || !router.query.event_id) return;

    try {
      const { data: existingEntry } = await supabase
        .from('EVENT_TEMP_ENTRY')
        .select('entry_id')
        .eq('event_id', router.query.event_id)
        .eq('emp_no', currentUserEmpNo)
        .single();

      if (existingEntry) {
        // 既存のエントリーを更新
        const { error: updateError } = await supabase
          .from('EVENT_TEMP_ENTRY')
          .update({
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('entry_id', existingEntry.entry_id);

        if (updateError) throw updateError;
      } else {
        // 新規エントリーを作成
        const { error: insertError } = await supabase
          .from('EVENT_TEMP_ENTRY')
          .insert({
            event_id: Number(router.query.event_id),
            emp_no: currentUserEmpNo,
            status: status,
            updated_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }

      // 成功時にステータスを更新
      setEntryStatus(status);

    } catch (error) {
      console.error('ステータス登録エラー:', error);
    }
  };

  if (!event) {
    return <div>読み込み中...</div>;
  }

  return (
    <Box sx={{ pb: 7 }}>
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
                {!isEditing ? (
                  <div className="space-y-6 text-[#FCFCFC]">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{event.title}</h2>
                      <p className="text-gray-400 text-sm">{event.ownerName} が主催</p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-300">
                      <div className="text-lg">
                        {format(new Date(event.start_date), 'M/d(E) HH:mm', { locale: ja })}
                      </div>
                      <div className="text-gray-500">→</div>
                      <div className="text-lg">
                        {format(new Date(event.end_date), 'M/d(E) HH:mm', { locale: ja })}
                      </div>
                    </div>

                    <div className="text-lg text-gray-300">
                      @ {event.place || '未定'}
                    </div>

                    {event.description && (
                      <div className="mt-8 pt-6 border-t border-gray-700">
                        <p className="text-gray-300 whitespace-pre-wrap">
                          {event.description}
                        </p>
                      </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-700">
                      <div className="flex gap-8">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-400 mb-3">出席予定 ({participants.filter(p => p.status === '1').length})</h3>
                          <div className="flex flex-wrap gap-2">
                            {participants
                              .filter(p => p.status === '1')
                              .map(participant => (
                                <div
                                  key={participant.emp_no}
                                  className="flex items-center bg-green-600 bg-opacity-10 rounded-full px-3 py-1"
                                >
                                  <Avatar
                                    sx={{
                                      width: 20,
                                      height: 20,
                                      fontSize: '0.75rem',
                                      bgcolor: 'rgba(34, 197, 94, 0.2)',
                                      color: '#22c55e',
                                    }}
                                  >
                                    {participant.myoji[0]}
                                  </Avatar>
                                  <span className="ml-2 text-sm text-green-500">
                                    {participant.myoji} {participant.namae}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>

                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-400 mb-3">欠席予定 ({participants.filter(p => p.status === '0').length})</h3>
                          <div className="flex flex-wrap gap-2">
                            {participants
                              .filter(p => p.status === '0')
                              .map(participant => (
                                <div
                                  key={participant.emp_no}
                                  className="flex items-center bg-red-600 bg-opacity-10 rounded-full px-3 py-1"
                                >
                                  <Avatar
                                    sx={{
                                      width: 20,
                                      height: 20,
                                      fontSize: '0.75rem',
                                      bgcolor: 'rgba(239, 68, 68, 0.2)',
                                      color: '#ef4444',
                                    }}
                                  >
                                    {participant.myoji[0]}
                                  </Avatar>
                                  <span className="ml-2 text-sm text-red-500">
                                    {participant.myoji} {participant.namae}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2D2D33] p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-[#FCFCFC] mb-4">
              削除オプションを選択してください
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => deleteEvent('single')}
                className="w-full p-3 text-left rounded bg-[#1D1D21] text-[#FCFCFC] hover:bg-opacity-80"
              >
                このイベントのみを削除
              </button>
              <button
                onClick={() => deleteEvent('future')}
                className="w-full p-3 text-left rounded bg-[#1D1D21] text-[#FCFCFC] hover:bg-opacity-80"
              >
                このイベントと以降のイベントを削除
              </button>
              <button
                onClick={() => deleteEvent('all')}
                className="w-full p-3 text-left rounded bg-[#1D1D21] text-[#FCFCFC] hover:bg-opacity-80"
              >
                全ての繰り返しイベントを削除
              </button>
            </div>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="w-full mt-4 p-3 rounded bg-[#4A4B50] text-[#FCFCFC] hover:bg-opacity-80"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
      
      {/* 出席・欠席ボタンを画面下部に固定 */}
      <div className="fixed bottom-16 left-0 right-0 bg-[#1D1D21] p-4 border-t border-gray-700">
        <div className="max-w-2xl mx-auto">
          {entryStatus ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div 
                  className={`
                    text-xl font-bold py-3 rounded-lg text-center w-full
                    ${entryStatus === '1' 
                      ? 'bg-green-600 bg-opacity-20 text-green-500' 
                      : 'bg-red-600 bg-opacity-20 text-red-500'
                    }
                  `}
                >
                  {entryStatus === '1' ? '出席予定' : '欠席予定'}
                </div>
              </div>
              <button
                onClick={() => setEntryStatus(null)}
                className="text-gray-300 hover:text-white transition-colors duration-200"
                aria-label="ステータスを変更"
              >
                <ChangeCircleIcon sx={{ fontSize: 40 }} />
              </button>
            </div>
          ) : (
            <div className="flex justify-between gap-4">
              <button
                onClick={() => handleEventEntry('1')}
                className="px-8 py-3 rounded bg-green-600 text-white font-bold hover:bg-opacity-80 flex-1"
              >
                出席
              </button>
              <button
                onClick={() => handleEventEntry('0')}
                className="px-8 py-3 rounded bg-red-600 text-white font-bold hover:bg-opacity-80 flex-1"
              >
                欠席
              </button>
            </div>
          )}
        </div>
      </div>
      
      <FooterMenu />
    </Box>
  );
} 