import { useState, useEffect, useMemo } from 'react';
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
import { enUS } from 'date-fns/locale';
import { handleAttendanceConfirmation } from '../../utils/attendanceApprovalLogic';
import Tooltip, { tooltipClasses, TooltipProps } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/Info';

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
  format: 'offline' | 'online' | 'hybrid';
  url?: string;
}

interface EventParticipant {
  entry_id: number;
  emp_no: number;
  myoji: string;
  namae: string;
  status: '1' | '2' | '11';
}

interface SupabaseEntry {
  entry_id: number;
  emp_no: number;
  status: '1' | '2' | '11';
  USER_INFO: {
    myoji: string;
    namae: string;
  };
}

export const isConfirmationAllowed = (startDate: string): { isValid: boolean; message?: string } => {
  const eventStartTime = new Date(startDate);
  const now = new Date();
  
  const jstOffset = 9 * 60;
  const eventStartTimeJST = new Date(eventStartTime.getTime() + (jstOffset * 60 * 1000));
  const nowJST = new Date(now.getTime() + (jstOffset * 60 * 1000));

  const timeDifference = nowJST.getTime() - eventStartTimeJST.getTime();
  const hoursDifference = timeDifference / (1000 * 60 * 60);

  if (timeDifference < 0) {
    return {
      isValid: false,
      message: 'イベントはまだ開始していません'
    };
  }

  if (hoursDifference > 24) {
    return {
      isValid: false,
      message: 'イベント開始から24時間以上経過しているため、出席確定はできません'
    };
  }

  return { isValid: true };
};

// カスタムTooltipの定義を追加
const CustomTooltip = styled(({ className, ...props }: { className?: string } & TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(() => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: '#2D2D33',
    color: '#FCFCFC',
    maxWidth: 300,
    fontSize: '0.875rem',
    border: '1px solid #4A4B50',
    borderRadius: '8px',
    padding: '12px 16px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: '#2D2D33',
    '&::before': {
      border: '1px solid #4A4B50',
    },
  },
}));

// カスタムTooltipコンポーネントを作成
const TooltipButton = ({ 
  message, 
  isDisabled, 
  onClick 
}: { 
  message?: string;
  isDisabled: boolean;
  onClick: () => void;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative w-full">
      <button
        onClick={() => {
          if (!isDisabled) {
            onClick();
          }
        }}
        disabled={isDisabled}
        className={`
          w-full py-3 rounded font-bold flex items-center justify-center gap-2
          ${!isDisabled 
            ? 'bg-[#5b63d3] text-white hover:bg-opacity-80' 
            : 'bg-gray-500 text-gray-300 cursor-not-allowed'}
        `}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        出席を確定する
      </button>
      {isDisabled && message && (
        <CustomTooltip
          title={message}
          placement="top"
          arrow
          open={showTooltip}
          onClose={() => setShowTooltip(false)}
        >
          <button
            onClick={() => {
              setShowTooltip(true);
              setTimeout(() => setShowTooltip(false), 2000);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300"
          >
            <InfoIcon />
          </button>
        </CustomTooltip>
      )}
    </div>
  );
};

export default function EventDetailPage() {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [editedEvent, setEditedEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string>('');
  const [currentUserEmpNo, setCurrentUserEmpNo] = useState<number | null>(null);
  const [entryStatus, setEntryStatus] = useState<'1' | '2' | '11' | null>(null);
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
          setEntryStatus(entry.status as '1' | '2' | '11');
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
            entry_id,
            emp_no,
            status,
            USER_INFO!inner(myoji, namae)
          `)
          .eq('event_id', router.query.event_id)
          .order('entry_id', { ascending: true });

        if (error) throw error;

        const formattedParticipants = (data as unknown as SupabaseEntry[])?.map(entry => ({
          entry_id: entry.entry_id,
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

  const handleEventEntry = async (status: '1' | '2' | '11') => {
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

      // 参加者一覧を再取得
      const { data, error } = await supabase
        .from('EVENT_TEMP_ENTRY')
        .select(`
          entry_id,
          emp_no,
          status,
          USER_INFO!inner(myoji, namae)
        `)
        .eq('event_id', router.query.event_id)
        .order('entry_id', { ascending: true });

      if (error) throw error;

      const formattedParticipants = (data as unknown as SupabaseEntry[])?.map(entry => ({
        entry_id: entry.entry_id,
        emp_no: entry.emp_no,
        myoji: entry.USER_INFO.myoji,
        namae: entry.USER_INFO.namae,
        status: entry.status
      })) || [];

      setParticipants(formattedParticipants);

    } catch (error) {
      console.error('ステータス登録エラー:', error);
    }
  };

  const handleAttendanceConfirmationClick = async (): Promise<void> => {
    try {
      const result = await handleAttendanceConfirmation(
        supabase,
        router.query.event_id,
        event,
        currentUserEmpNo
      );

      if (!result.success) {
        // エラーではなく警告として表示
        alert(result.message);
        return;
      }

      // 成功時のみ参加者一覧を再取得
      const { data: updatedParticipants, error: participantsError } = await supabase
        .from('EVENT_TEMP_ENTRY')
        .select(`
          entry_id,
          emp_no,
          status,
          USER_INFO!inner(myoji, namae)
        `)
        .eq('event_id', router.query.event_id)
        .order('entry_id', { ascending: true });

      if (participantsError) throw participantsError;

      const formattedParticipants = (updatedParticipants as unknown as SupabaseEntry[])?.map(entry => ({
        entry_id: entry.entry_id,
        emp_no: entry.emp_no,
        myoji: entry.USER_INFO.myoji,
        namae: entry.USER_INFO.namae,
        status: entry.status
      })) || [];

      setParticipants(formattedParticipants);
      alert(result.message);
    } catch (error) {
      console.error('出席確定処理エラー:', error);
      alert('出席確定処理に失敗しました');
    }
  };

  // ボタンの活性状態とメッセージを管理
  const confirmationStatus = useMemo(() => {
    if (!event?.start_date) {
      return {
        isValid: false,
        message: 'イベントの開始日時が設定されていません'
      };
    }
    return isConfirmationAllowed(event.start_date);
  }, [event?.start_date]);

  if (!event) {
    return <div>読み込み中...</div>;
  }

  return (
    <Box sx={{ pb: 7 }}>
      <div>
        <Header />
        <div className="p-4">
          <div className="max-w-2xl mx-auto">
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
            <div className="bg-[#2D2D33] rounded-lg p-6">
              {error && (
                <div className="mb-4 text-red-500">{error}</div>
              )}

              <div className="space-y-4">
                {!isEditing ? (
                  <div className="space-y-4 text-[#FCFCFC]">
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        {event.genre === '1' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#8E93DA]" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {event.title}
                      </h2>
                      
                      <div className="flex items-center gap-2 text-gray-300 text-sm">
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

                      <div className="text-sm text-gray-300">
                        at {event.place || '未定'}
                      </div>
                      
                      <p className="text-sm text-gray-400">主催者：{event.ownerName}</p>
                    </div>

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

                    {event.description && (
                      <div className="mt-6 pt-4 border-t border-gray-700">
                        <p className="text-gray-300 whitespace-pre-wrap">
                          {event.description}
                        </p>
                      </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-700">
                      <div className="flex flex-col gap-8">
                        {/* 出席予定と出席済みを横並びに */}
                        <div className="flex gap-8">
                          {/* 出席予定 */}
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-400 mb-3">
                              出席予定 ({participants.filter(p => p.status === '1').length})
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {participants
                                .filter(p => p.status === '1')
                                .map(participant => (
                                  <div
                                    key={participant.entry_id}
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

                          {/* 出席済み */}
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-400 mb-3">
                              出席済み ({participants.filter(p => p.status === '11').length})
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {participants
                                .filter(p => p.status === '11')
                                .map(participant => (
                                  <div
                                    key={participant.entry_id}
                                    className="flex items-center bg-blue-600 bg-opacity-10 rounded-full px-3 py-1"
                                  >
                                    <Avatar
                                      sx={{
                                        width: 20,
                                        height: 20,
                                        fontSize: '0.75rem',
                                        bgcolor: 'rgba(37, 99, 235, 0.2)',
                                        color: '#2563eb',
                                      }}
                                    >
                                      {participant.myoji[0]}
                                    </Avatar>
                                    <span className="ml-2 text-sm text-blue-500">
                                      {participant.myoji} {participant.namae}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>

                        {/* 欠席予定を下に配置 */}
                        <div className="w-full">
                          <h3 className="text-sm font-medium text-gray-400 mb-3">
                            欠席予定 ({participants.filter(p => p.status === '2').length})
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {participants
                              .filter(p => p.status === '2')
                              .map(participant => (
                                <div
                                  key={participant.entry_id}
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
                        onClick={() => setIsEditing(false)}
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
      
      {/* 出席・欠席ボタンを画面下部に固定 */}
      <div className="fixed bottom-16 left-0 right-0 bg-[#1D1D21] p-4 border-t border-gray-700">
        <div className="max-w-2xl mx-auto">
          {isOwner ? (
            <TooltipButton
              message={!confirmationStatus.isValid ? confirmationStatus.message : undefined}
              isDisabled={!confirmationStatus.isValid}
              onClick={handleAttendanceConfirmationClick}
            />
          ) : (
            <>
              {entryStatus ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div 
                      className={`
                        text-xl font-bold py-3 rounded-lg text-center w-full
                        ${entryStatus === '1' 
                          ? 'bg-green-600 bg-opacity-20 text-green-500' 
                          : entryStatus === '2' 
                            ? 'bg-red-600 bg-opacity-20 text-red-500'
                            : 'bg-blue-600 bg-opacity-20 text-blue-500'
                        }
                      `}
                    >
                      {entryStatus === '1' ? '出席予定' : entryStatus === '2' ? '欠席予定' : '出席済み'}
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
                    onClick={() => handleEventEntry('2')}
                    className="px-8 py-3 rounded bg-red-600 text-white font-bold hover:bg-opacity-80 flex-1"
                  >
                    欠席
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <FooterMenu />
    </Box>
  );
} 