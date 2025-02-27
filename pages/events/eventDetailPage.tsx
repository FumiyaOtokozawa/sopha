import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import Header from '../../components/Header';
import { Box, Avatar, Dialog } from '@mui/material';
import FooterMenu from '../../components/FooterMenu';
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';
import { enUS } from 'date-fns/locale';
import { handleAttendanceConfirmation } from '../../utils/attendanceApprovalLogic';
import Tooltip, { tooltipClasses, TooltipProps } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/Info';
import EventEditForm from '../../components/EventEditForm';
import { format } from 'date-fns';
import EventDetailModal from '../../components/EventDetailModal';

interface Event {
  event_id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue_id: number;
  venue_nm?: string;
  description?: string;
  owner: string;
  ownerName?: string;
  genre: string;
  repeat_id?: number | null;
  format: 'offline' | 'online' | 'hybrid';
  url?: string;
  abbreviation?: string;
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
  onClick,
  children 
}: { 
  message?: string;
  isDisabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
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
        {children}
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

// 開発環境用のモック位置情報
const MOCK_POSITIONS = {
  VENUE: { // 会場を想定した位置
    latitude: 35.7030882,
    longitude: 139.7701106
  },
  FAR: { // 会場から離れた位置
    latitude: 35.6895014,
    longitude: 139.7087834
  }
};

// イベント期間内かどうかをチェックする関数
const isWithinEventPeriod = (event: Event | null): boolean => {
  if (!event?.start_date || !event?.end_date) return false;

  // 現在時刻をJSTで取得（UTCからの変換は不要）
  const nowJST = new Date();
  
  // データベースの日時をJSTとして扱う
  const eventStart = new Date(event.start_date);
  const eventEnd = new Date(event.end_date);

  console.log('時間チェック:', {
    現在時刻: format(nowJST, 'yyyy/MM/dd HH:mm:ss'),
    開始時刻: format(eventStart, 'yyyy/MM/dd HH:mm:ss'),
    終了時刻: format(eventEnd, 'yyyy/MM/dd HH:mm:ss'),
    開始時刻より後か: nowJST >= eventStart,
    終了時刻より前か: nowJST <= eventEnd,
    生の開始時刻: event.start_date,
    生の終了時刻: event.end_date
  });

  return nowJST >= eventStart && nowJST <= eventEnd;
};

export default function EventDetailPage() {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [editedEvent, setEditedEvent] = useState<Event | null>(null);
  const [currentUserEmpNo, setCurrentUserEmpNo] = useState<number | null>(null);
  const [entryStatus, setEntryStatus] = useState<'1' | '2' | '11' | null>(null);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [useMockLocation, setUseMockLocation] = useState(false);
  const [mockLocationType, setMockLocationType] = useState<'VENUE' | 'FAR'>('VENUE');

  useEffect(() => {
    const fetchEventAndCheckOwner = async () => {
      if (!router.query.event_id) return;

      try {
        // イベント情報を取得
        const { data: eventData } = await supabase
          .from('EVENT_LIST')
          .select(`
            *,
            venue:EVENT_VENUE!venue_id(venue_nm)
          `)
          .eq('event_id', Number(router.query.event_id))
          .single();

        if (eventData.error) throw eventData.error;

        // オーナー情報を取得
        const { data: ownerData } = await supabase
          .from('USER_INFO')
          .select('myoji, namae')
          .eq('emp_no', eventData.owner)
          .single();

        const formattedEvent = {
          ...eventData,
          venue_nm: eventData.venue?.venue_nm,
          ownerName: ownerData ? `${ownerData.myoji} ${ownerData.namae}` : undefined
        };

        setEvent(formattedEvent);
        setEditedEvent(formattedEvent);

        // ログインユーザーの情報を取得
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from('USER_INFO')
            .select('emp_no')
            .eq('email', user.email)
            .single();
          
          if (userData) {
            setIsOwner(userData.emp_no === eventData.owner);
            setCurrentUserEmpNo(userData.emp_no);

            // 参加者一覧を取得
            const { data: participantsData, error: participantsError } = await supabase
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

            const formattedParticipants = (participantsData as unknown as SupabaseEntry[])?.map(entry => ({
              entry_id: entry.entry_id,
              emp_no: entry.emp_no,
              myoji: entry.USER_INFO.myoji,
              namae: entry.USER_INFO.namae,
              status: entry.status
            })) || [];

            setParticipants(formattedParticipants);

            // 現在のユーザーの参加ステータスを参加者一覧から取得
            const userEntry = formattedParticipants.find(p => p.emp_no === userData.emp_no);
            if (userEntry) {
              setEntryStatus(userEntry.status);
            }
          }
        }

      } catch (error) {
        console.error('エラー:', error);
      }
    };

    fetchEventAndCheckOwner();
  }, [router.query]);

  // 編集ボタンを追加
  const handleEdit = () => {
    setIsEditing(true);
  };

  // 編集キャンセルボタンのハンドラー
  const handleCancel = () => {
    setIsEditing(false);
    setEditedEvent(event);
  };

  // 保存ボタンのハンドラー
  const handleSave = async () => {
    if (!editedEvent) return;

    try {
      const { error: updateError } = await supabase
        .from('EVENT_LIST')
        .update({
          title: editedEvent.title,
          start_date: editedEvent.start_date,
          end_date: editedEvent.end_date,
          venue_id: editedEvent.venue_id,
          description: editedEvent.description,
          genre: editedEvent.genre,
          format: editedEvent.format,
          url: editedEvent.url,
        })
        .eq('event_id', editedEvent.event_id);

      if (updateError) throw updateError;

      setEvent(editedEvent);
      setIsEditing(false);
      router.push('/events/eventListPage');
    } catch (error) {
      console.error('更新エラー:', error);
    }
  };

  const handleEventEntry = async (status: '1' | '2' | '11') => {
    if (!event) return;

    try {
      // ログインユーザーの情報を取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('ユーザー情報が取得できません');
        return;
      }

      // ユーザーのemp_noを取得
      const { data: userData, error: userError } = await supabase
        .from('USER_INFO')
        .select('emp_no')
        .eq('email', user.email)
        .single();

      if (userError) {
        console.error('ユーザー情報の取得に失敗:', userError);
        return;
      }

      // 既存のエントリーを確認
      const { data: existingEntry } = await supabase
        .from('EVENT_TEMP_ENTRY')
        .select('entry_id')
        .eq('event_id', event.event_id)
        .eq('emp_no', userData.emp_no)
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
            event_id: event.event_id,
            emp_no: userData.emp_no,
            status: status,
            updated_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }

      // ステータスを更新
      setEntryStatus(status);

      // 参加者一覧を再取得
      const { data: updatedParticipants, error: participantsError } = await supabase
        .from('EVENT_TEMP_ENTRY')
        .select(`
          entry_id,
          emp_no,
          status,
          USER_INFO!inner(myoji, namae)
        `)
        .eq('event_id', event.event_id)
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
      
    } catch (error) {
      console.error('エントリーの更新に失敗:', error);
    }
  };

  // 位置情報を取得して出席確認を行う関数
  const handleConfirmAttendance = async () => {
    try {
      setIsGettingLocation(true);

      // 位置情報の取得（開発環境用のモック機能を追加）
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (process.env.NODE_ENV === 'development' && useMockLocation) {
          // モックの位置情報を返す
          const mockPosition = {
            coords: {
              latitude: MOCK_POSITIONS[mockLocationType].latitude,
              longitude: MOCK_POSITIONS[mockLocationType].longitude,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          } as GeolocationPosition;

          console.log('モック位置情報:', {
            latitude: mockPosition.coords.latitude,
            longitude: mockPosition.coords.longitude,
            type: mockLocationType
          });

          resolve(mockPosition);
          return;
        }

        if (!navigator.geolocation) {
          reject(new Error('このブラウザは位置情報をサポートしていません'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log('取得した位置情報:', {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            });
            resolve(pos);
          },
          (error) => {
            console.error('位置情報取得エラー:', {
              code: error.code,
              message: error.message
            });
            switch(error.code) {
              case error.PERMISSION_DENIED:
                reject(new Error('位置情報の使用が許可されていません。ブラウザの設定をご確認ください'));
                break;
              case error.POSITION_UNAVAILABLE:
                reject(new Error('位置情報を取得できませんでした'));
                break;
              case error.TIMEOUT:
                reject(new Error('位置情報の取得がタイムアウトしました'));
                break;
              default:
                reject(error);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });

      // 出席確認処理の実行
      const result = await handleAttendanceConfirmation(
        supabase,
        router.query.event_id,
        event,
        currentUserEmpNo,
        position
      );

      if (!result.success) {
        alert(result.message);
        return;
      }

      // 成功時の処理（参加者一覧の更新など）
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

      if (participantsError) {
        console.error('参加者一覧の更新に失敗:', participantsError);
        alert('参加者一覧の更新に失敗しました');
        return;
      }

      const formattedParticipants = (updatedParticipants as unknown as SupabaseEntry[])?.map(entry => ({
        entry_id: entry.entry_id,
        emp_no: entry.emp_no,
        myoji: entry.USER_INFO.myoji,
        namae: entry.USER_INFO.namae,
        status: entry.status
      })) || [];

      setParticipants(formattedParticipants);
      setEntryStatus('11'); // 出席済みステータスに更新
      alert(result.message);

    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('予期せぬエラーが発生しました');
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleDelete = async (deleteType: 'single' | 'all' | 'future') => {
    if (!event) return;
    
    const confirmMessages = {
      single: '本当にこのイベントを削除しますか？',
      all: '本当に全ての繰り返しイベントを削除しますか？',
      future: '本当にこのイベントと以降のイベントを全て削除しますか？'
    };

    if (!window.confirm(confirmMessages[deleteType])) return;

    try {
      let query = supabase
        .from('EVENT_LIST')
        .update({ act_kbn: false });

      if (deleteType === 'single') {
        query = query.eq('event_id', event.event_id);
      } else if (deleteType === 'all') {
        query = query.eq('repeat_id', event.repeat_id);
      } else if (deleteType === 'future') {
        query = query
          .eq('repeat_id', event.repeat_id)
          .gte('start_date', event.start_date);
      }

      const { error } = await query;
      if (error) throw error;
      router.push('/events/eventListPage');
    } catch (error) {
      console.error('削除エラー:', error);
    }
  };

  if (!event) {
    return <div>読み込み中...</div>;
  }

  return (
    <Box sx={{ pb: 7 }}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 p-4">
          <div className="max-w-2xl mx-auto">
            {/* 主催者メッセージ */}
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

            <div className="bg-[#2D2D33] rounded-lg">
              {/* 編集・削除ボタン */}
              {isOwner && !isEditing && (
                <div className="p-4 border-b border-gray-700 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      if (event?.repeat_id) {
                        setShowDeleteDialog(true);
                      } else {
                        handleDelete('single');
                      }
                    }}
                    className="px-4 py-2 rounded bg-red-500 text-white hover:bg-opacity-80 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    削除
                  </button>
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 rounded bg-[#4A4B50] text-[#FCFCFC] hover:bg-opacity-80 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    編集
                  </button>
                </div>
              )}

              {/* イベント詳細内容 */}
              <div className="p-6">
                {/* 編集フォーム */}
                {isEditing ? (
                  <EventEditForm
                    onSave={handleSave}
                    onCancel={handleCancel}
                    editedEvent={editedEvent!}
                    setEditedEvent={setEditedEvent}
                  />
                ) : (
                  <div className="space-y-4">
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
                        at {event.venue_nm || '未定'}
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
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-400 mb-3">
                            出席者 ({participants.filter(p => p.status === '1' || p.status === '11').length})
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {participants
                              .filter(p => p.status === '1' || p.status === '11')
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
                                  {participant.status === '11' && (
                                    <svg 
                                      xmlns="http://www.w3.org/2000/svg" 
                                      className="h-4 w-4 ml-1 text-blue-500" 
                                      viewBox="0 0 20 20" 
                                      fill="currentColor"
                                    >
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              ))}
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
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 出席・欠席ボタンを画面下部に固定 */}
        {!isEditing && (
          <div className="sticky bottom-16 left-0 right-0 bg-[#1D1D21] p-4 border-t border-gray-700 z-50">
            <div className="max-w-2xl mx-auto">
              {!isOwner && (
                <>
                  {entryStatus ? (
                    <>
                      {/* 仮出席状態の時のみ本出席ボタンを表示 */}
                      {entryStatus === '1' && (
                        <div className="flex-1 mb-4">
                          <TooltipButton
                            onClick={handleConfirmAttendance}
                            isDisabled={isGettingLocation || !isWithinEventPeriod(event)}
                            message={!isWithinEventPeriod(event) ? 'イベントの開催時間外です' : undefined}
                          >
                            {isGettingLocation ? (
                              <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                位置情報を確認中...
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                本出席を確定する
                              </>
                            )}
                          </TooltipButton>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div 
                            className={`
                              text-xl font-bold h-12 flex items-center justify-center rounded-lg w-full
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
                        {/* 出席済み（status='11'）以外の場合のみステータス変更ボタンを表示 */}
                        {entryStatus !== '11' && (
                          <button
                            onClick={() => setEntryStatus(null)}
                            className="text-gray-300 hover:text-white transition-colors duration-200"
                            aria-label="ステータスを変更"
                          >
                            <ChangeCircleIcon sx={{ fontSize: 40 }} />
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between gap-4">
                      <button
                        onClick={() => handleEventEntry('1')}
                        className="h-12 px-8 rounded bg-green-600 text-white font-bold hover:bg-opacity-80 flex-1"
                      >
                        出席
                      </button>
                      <button
                        onClick={() => handleEventEntry('2')}
                        className="h-12 px-8 rounded bg-red-600 text-white font-bold hover:bg-opacity-80 flex-1"
                      >
                        欠席
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        <FooterMenu />
        <EventDetailModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          eventId={event?.event_id?.toString() || ''}
        />
        <Dialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          PaperProps={{
            style: {
              backgroundColor: '#2D2D33',
              borderRadius: '0.5rem',
              maxWidth: '20rem',
            },
          }}
        >
          <div className="p-4">
            <h3 className="text-lg font-bold text-white mb-4">削除オプション</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  handleDelete('single');
                  setShowDeleteDialog(false);
                }}
                className="w-full p-3 text-left rounded bg-[#1D1D21] text-[#FCFCFC] hover:bg-[#37373F] transition-colors"
              >
                このイベントのみを削除
              </button>
              <button
                onClick={() => {
                  handleDelete('future');
                  setShowDeleteDialog(false);
                }}
                className="w-full p-3 text-left rounded bg-[#1D1D21] text-[#FCFCFC] hover:bg-[#37373F] transition-colors"
              >
                このイベントと以降のイベントを削除
              </button>
              <button
                onClick={() => {
                  handleDelete('all');
                  setShowDeleteDialog(false);
                }}
                className="w-full p-3 text-left rounded bg-[#1D1D21] text-[#FCFCFC] hover:bg-[#37373F] transition-colors"
              >
                全ての繰り返しイベントを削除
              </button>
            </div>
            <button
              onClick={() => setShowDeleteDialog(false)}
              className="w-full mt-4 p-3 rounded bg-[#4A4B50] text-[#FCFCFC] hover:bg-opacity-80"
            >
              キャンセル
            </button>
          </div>
        </Dialog>
        {/* 開発環境の場合のみモック切り替えボタンを表示 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed top-4 right-4 z-50 space-y-2">
            <button
              onClick={() => setUseMockLocation(!useMockLocation)}
              className={`
                w-full px-4 py-2 rounded text-sm
                ${useMockLocation ? 'bg-green-500' : 'bg-gray-500'}
                text-white
              `}
            >
              モック位置情報: {useMockLocation ? 'ON' : 'OFF'}
            </button>
            {useMockLocation && (
              <button
                onClick={() => setMockLocationType(type => type === 'VENUE' ? 'FAR' : 'VENUE')}
                className="w-full px-4 py-2 rounded text-sm bg-blue-500 text-white"
              >
                現在の位置: {mockLocationType === 'VENUE' ? '会場近く' : '会場から遠い'}
              </button>
            )}
          </div>
        )}
      </div>
    </Box>
  );
} 