import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import Header from '../../components/Header';
import { Box, Avatar, Dialog, CircularProgress } from '@mui/material';
import FooterMenu from '../../components/FooterMenu';
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';
import { ja } from 'date-fns/locale';
import { handleAttendanceConfirmation } from '../../utils/attendanceApprovalLogic';
import Tooltip, { tooltipClasses, TooltipProps } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/Info';
import EventEditForm from '../../components/EventEditForm';
import { format } from 'date-fns';
import EventDetailModal from '../../components/EventDetailModal';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import GroupIcon from '@mui/icons-material/Group';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import VerifiedIcon from '@mui/icons-material/Verified';
import VideocamIcon from '@mui/icons-material/Videocam';
import PeopleIcon from '@mui/icons-material/People';

interface Event {
  event_id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue_id: number;
  venue_nm?: string;
  venue_address?: string;
  description?: string;
  owner: string;
  ownerName?: string;
  genre: string;
  repeat_id?: number | null;
  format: 'offline' | 'online' | 'hybrid';
  url?: string;
  abbreviation?: string;
  manage_member?: string;
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
          w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2
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

// 出席確定完了ダイアログ用のインターフェース
interface ConfirmationDialogProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

// 出席確定完了ダイアログコンポーネント
const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ open, message, onClose }) => {
  // 3秒後に自動的に閉じる
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  // 改行コードを<br>タグに変換する
  const formattedMessage = message.split('\n').map((line, index) => (
    <React.Fragment key={index}>
      {line}
      {index < message.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        style: {
          backgroundColor: '#2D2D33',
          borderRadius: '1rem',
          maxWidth: '20rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        },
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-blue-500/20 p-3 rounded-full">
            <CheckCircleIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <h3 className="text-sm font-bold text-white text-center mb-2">{formattedMessage}</h3>
      </div>
    </Dialog>
  );
};

const EventDetailPage: React.FC = () => {
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
  const [isCopied, setIsCopied] = useState(false);
  const [manageMembers, setManageMembers] = useState<string[]>([]);
  const [confirmationDialog, setConfirmationDialog] = useState<{open: boolean, message: string}>({
    open: false,
    message: ''
  });

  useEffect(() => {
    const fetchEventAndCheckOwner = async () => {
      if (!router.query.event_id) return;

      try {
        // イベント情報を取得
        const { data: eventData } = await supabase
          .from('EVENT_LIST')
          .select(`
            *,
            venue:EVENT_VENUE!venue_id(venue_nm, address)
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
          venue_address: eventData.venue?.address,
          ownerName: ownerData ? `${ownerData.myoji} ${ownerData.namae}` : undefined
        };

        setEvent(formattedEvent);
        setEditedEvent(formattedEvent);

        // 運営メンバーの情報を取得
        if (eventData.manage_member) {
          const memberIds = eventData.manage_member.split(',').map((id: string) => id.trim()).filter(Boolean);
          
          if (memberIds.length > 0) {
            const { data: membersData } = await supabase
              .from('USER_INFO')
              .select('emp_no, myoji, namae')
              .in('emp_no', memberIds);
            
            if (membersData && membersData.length > 0) {
              // 社員番号順に並べ替え
              const sortedMembers = memberIds.map((id: string) => {
                const member = membersData.find(m => m.emp_no.toString() === id);
                return member ? `${member.myoji} ${member.namae}` : `未登録(${id})`;
              });
              
              setManageMembers(sortedMembers);
            }
          }
        }

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
          abbreviation: editedEvent.abbreviation,
          manage_member: editedEvent.manage_member,
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
    if (!event || !currentUserEmpNo) return;

    try {
      // 先にUIを更新して体感速度を向上
      setEntryStatus(status);

      // 既存の参加者リストから自分のエントリーを探す
      const existingParticipantIndex = participants.findIndex(p => p.emp_no === currentUserEmpNo);
      const existingParticipant = existingParticipantIndex >= 0 ? participants[existingParticipantIndex] : null;

      // 参加者リストを先に更新（楽観的更新）
      const updatedParticipants = [...participants];
      
      // JSTの現在時刻を取得
      const now = new Date();
      const jstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
      const jstDateString = jstDate.toISOString();

      if (existingParticipant) {
        // 既存の参加者情報を更新
        updatedParticipants[existingParticipantIndex] = {
          ...existingParticipant,
          status: status
        };
      } else if (currentUserEmpNo) {
        // 現在のユーザー情報を取得
        const { data: userData } = await supabase
          .from('USER_INFO')
          .select('myoji, namae')
          .eq('emp_no', currentUserEmpNo)
          .single();

        if (userData) {
          // 新しい参加者として追加（仮のentry_idを設定）
          updatedParticipants.push({
            entry_id: -1, // 仮のID（バックエンドで実際のIDが生成される）
            emp_no: currentUserEmpNo,
            myoji: userData.myoji,
            namae: userData.namae,
            status: status
          });
        }
      }

      // UIを先に更新
      setParticipants(updatedParticipants);

      // バックグラウンドでデータベース更新を実行
      if (existingParticipant) {
        // 既存のエントリーを更新
        await supabase
          .from('EVENT_TEMP_ENTRY')
          .update({
            status: status,
            updated_at: jstDateString
          })
          .eq('entry_id', existingParticipant.entry_id);
      } else {
        // 新規エントリーを作成
        await supabase
          .from('EVENT_TEMP_ENTRY')
          .insert({
            event_id: event.event_id,
            emp_no: currentUserEmpNo,
            status: status,
            updated_at: jstDateString
          });
      }

      // エラーが発生しなければ、最新の参加者リストを非同期で取得（UIブロックなし）
      supabase
        .from('EVENT_TEMP_ENTRY')
        .select(`
          entry_id,
          emp_no,
          status,
          USER_INFO!inner(myoji, namae)
        `)
        .eq('event_id', event.event_id)
        .order('entry_id', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            const formattedParticipants = (data as unknown as SupabaseEntry[])?.map(entry => ({
              entry_id: entry.entry_id,
              emp_no: entry.emp_no,
              myoji: entry.USER_INFO.myoji,
              namae: entry.USER_INFO.namae,
              status: entry.status
            })) || [];
            
            setParticipants(formattedParticipants);
          }
        });
      
    } catch (error) {
      console.error('エントリーの更新に失敗:', error);
      // エラーが発生した場合は元の状態に戻す
      setEntryStatus(null);
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
                reject(new Error('位置情報の使用が許可されていません。\nブラウザの設定をご確認ください'));
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
        setConfirmationDialog({
          open: true,
          message: result.message || 'エラーが発生しました'
        });
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
        setConfirmationDialog({
          open: true,
          message: '参加者一覧の更新に失敗しました'
        });
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
      setConfirmationDialog({
        open: true,
        message: result.message || '出席を確定しました'
      });

    } catch (error) {
      if (error instanceof Error) {
        setConfirmationDialog({
          open: true,
          message: error.message
        });
      } else {
        setConfirmationDialog({
          open: true,
          message: '予期せぬエラーが発生しました'
        });
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

    let query = supabase
      .from('EVENT_LIST')
      .update({ act_kbn: false });

    if (deleteType === 'single') {
      query = query.eq('event_id', event.event_id);
    } else if (deleteType === 'all') {
      // repeat_idがnullまたはundefinedの場合はエラーメッセージを表示
      if (!event.repeat_id) {
        throw new Error('このイベントは繰り返しイベントではありません');
      }
      query = query.eq('repeat_id', event.repeat_id);
    } else if (deleteType === 'future') {
      // repeat_idがnullまたはundefinedの場合はエラーメッセージを表示
      if (!event.repeat_id) {
        throw new Error('このイベントは繰り返しイベントではありません');
      }
      query = query
        .eq('repeat_id', event.repeat_id)
        .gte('start_date', event.start_date);
    }

    const { error } = await query;
    if (error) {
      console.error('削除エラー:', error);
      alert(`削除処理に失敗しました: ${error.message}`);
      throw error;
    }
    
    // 削除成功時のみリダイレクト
    router.push('/events/eventListPage');
  };

  // 住所をクリップボードにコピーする関数
  const copyToClipboard = (text: string) => {
    if (!text || text === '未定') return;
    
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        })
        .catch(err => {
          console.error('コピーに失敗しました:', err);
        });
    } else {
      // フォールバック方法（セキュアコンテキストでない場合）
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('コピーに失敗しました:', err);
      }
      
      document.body.removeChild(textArea);
    }
  };

  if (!event) {
    return <div>読み込み中...</div>;
  }

  return (
    <Box sx={{ pb: 7 }}>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#1D1D21] to-[#2D2D33]">
        <Header />
        <div className="flex-1 p-3 md:p-4">
          <div className="max-w-2xl mx-auto">
            {/* 主催者メッセージ */}
            {isOwner && (
              <div className="mb-4 bg-[#8E93DA]/20 border border-[#8E93DA]/40 rounded-xl p-3 flex items-center justify-center transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center gap-2">
                  <span className="text-[#8E93DA] font-medium">あなたが主催しているイベントです</span>
                </div>
              </div>
            )}

            <div className="bg-[#2D2D33] rounded-2xl shadow-xl border border-[#3D3D45]">
              {/* イベント詳細内容 */}
              <div className="p-4 md:p-5">
                {isEditing ? (
                  <EventEditForm
                    onSave={handleSave}
                    onCancel={handleCancel}
                    editedEvent={editedEvent!}
                    setEditedEvent={setEditedEvent}
                  />
                ) : (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          {/* 編集・削除ボタンをタイトルの上に移動 */}
                          {isOwner && !isEditing && (
                            <div className="mb-3 grid grid-cols-5 gap-2">
                              <button
                                onClick={() => {
                                  if (event?.repeat_id) {
                                    setShowDeleteDialog(true);
                                  } else {
                                    handleDelete('single');
                                  }
                                }}
                                className="col-span-1 p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all duration-300 flex items-center justify-center group"
                                aria-label="削除"
                              >
                                <DeleteIcon className="h-5 w-5 transform group-hover:rotate-12 transition-transform duration-300" />
                              </button>
                              <button
                                onClick={handleEdit}
                                className="col-span-4 p-2 rounded-lg bg-[#4A4B50]/50 text-[#FCFCFC] hover:bg-[#4A4B50]/70 transition-all duration-300 flex items-center justify-center gap-2 group"
                                aria-label="編集"
                              >
                                <EditIcon className="h-5 w-5 transform group-hover:rotate-45 transition-transform duration-300" />
                                <span>編集する</span>
                              </button>
                            </div>
                          )}
                          
                          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-white">
                            {event.genre === '1' && (
                              <VerifiedIcon className="h-6 w-7 text-[#8E93DA]" />
                            )}
                            {event.title}
                          </h2>
                          
                          {/* 日程表示 */}
                          <div className="mt-3 flex items-center gap-2">
                            <div className="p-2 bg-[#37373F] rounded-lg">
                              <CalendarMonthIcon className="h-4 w-4 text-[#8E93DA]" fontSize="small" />
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-400 leading-tight">開催日時</div>
                              <div className="text-gray-300 text-sm">
                                {(() => {
                                  const startDate = new Date(event.start_date);
                                  const endDate = new Date(event.end_date);
                                  const isSameDay = 
                                    startDate.getFullYear() === endDate.getFullYear() &&
                                    startDate.getMonth() === endDate.getMonth() &&
                                    startDate.getDate() === endDate.getDate();
                                  
                                  if (isSameDay) {
                                    return (
                                      <>
                                        {format(startDate, "yyyy年MM月dd日", { locale: ja })}
                                        <span className="ml-1">({format(startDate, "E", { locale: ja })})</span>
                                        {" "}
                                        {format(startDate, "HH:mm")} → {format(endDate, "HH:mm")}
                                      </>
                                    );
                                  } else {
                                    return (
                                      <>
                                        {format(startDate, "yyyy年MM月dd日", { locale: ja })}
                                        <span className="ml-1">({format(startDate, "E", { locale: ja })})</span>
                                        {" "}
                                        {format(startDate, "HH:mm")} → 
                                        {" "}
                                        {format(endDate, "yyyy年MM月dd日", { locale: ja })}
                                        <span className="ml-1">({format(endDate, "E", { locale: ja })})</span>
                                        {" "}
                                        {format(endDate, "HH:mm")}
                                      </>
                                    );
                                  }
                                })()}
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <div className="p-2 bg-[#37373F] rounded-lg">
                              <LocationOnIcon className="h-4 w-4 text-[#8E93DA]" fontSize="small" />
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-400 leading-tight">開催場所</div>
                              <div className="relative flex items-center gap-2">
                                <span className="text-gray-300 text-sm">{event.venue_nm || '未定'}</span>
                                {event.venue_address && (
                                  <button 
                                    onClick={() => copyToClipboard(event.venue_address || '')}
                                    className="text-gray-400 hover:text-white flex items-center justify-center p-[2px] rounded-full hover:bg-[#4A4B50]/50 transition-all scale-75"
                                    title="住所をコピー"
                                  >
                                    <ContentCopyIcon className="h-1.5 w-1.5" fontSize="small" />
                                  </button>
                                )}
                                {isCopied && (
                                  <div className="absolute top-0 left-full ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded-md whitespace-nowrap">
                                    住所をコピーしました
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-2 flex items-center gap-2">
                            <div className="p-2 bg-[#37373F] rounded-lg">
                              <PersonIcon className="h-4 w-4 text-[#8E93DA]" fontSize="small" />
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-400 leading-tight">主催者</div>
                              <span className="text-gray-300 text-sm">{event.ownerName}</span>
                            </div>
                          </div>
                          
                          {event.manage_member && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="p-2 bg-[#37373F] rounded-lg">
                                <PeopleIcon className="h-4 w-4 text-[#8E93DA]" fontSize="small" />
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-400 leading-tight">運営メンバー</div>
                                <div className="text-gray-300 text-sm">
                                  {manageMembers.length > 0 
                                    ? manageMembers.join(' / ') 
                                    : event.manage_member}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {event.format && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="p-2 bg-[#37373F] rounded-lg">
                                <VideocamIcon className="h-4 w-4 text-[#8E93DA]" fontSize="small" />
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-400 leading-tight">開催形式</div>
                                <span className="text-gray-300 text-sm">
                                  {event.format === 'offline' ? 'オフライン' :
                                   event.format === 'online' ? 'オンライン' : 'ハイブリッド'}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {event.url && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="p-2 bg-[#37373F] rounded-lg">
                                <LinkIcon className="h-4 w-4 text-[#8E93DA]" fontSize="small" />
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-400 leading-tight">参加URL</div>
                                <a 
                                  href={event.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#8E93DA] hover:underline break-all text-sm"
                                >
                                  {event.url}
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* イベント詳細説明を上に移動 */}
                      {event.description && (
                        <div className="mt-4 pt-4 border-t border-gray-700/70">
                          <div className="bg-[#37373F] rounded-xl p-4">
                            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-gray-700/70">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-[#37373F]/50 rounded-xl p-3 border border-[#4A4B50]/30">
                            <h3 className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-2">
                              <GroupIcon className="h-3 w-3 text-green-500" fontSize="small" />
                              <span className="text-green-400">出席者</span>
                              <span className="bg-green-500/20 text-green-400 text-xs px-1.5 py-0.5 rounded-full">
                                {participants.filter(p => p.status === '1' || p.status === '11').length}
                              </span>
                            </h3>
                            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                              {participants
                                .filter(p => p.status === '1' || p.status === '11')
                                .map(participant => (
                                  <div
                                    key={participant.entry_id}
                                    className="flex items-center bg-green-600/20 rounded-full px-2 py-1 group hover:bg-green-600/30 transition-all duration-300"
                                  >
                                    <Avatar
                                      sx={{
                                        width: 20,
                                        height: 20,
                                        fontSize: '0.65rem',
                                        bgcolor: 'rgba(34, 197, 94, 0.3)',
                                        color: '#22c55e',
                                      }}
                                    >
                                      {participant.myoji[0]}
                                    </Avatar>
                                    <span className="ml-1.5 text-xs text-green-500 group-hover:text-green-400 transition-colors duration-300">
                                      {participant.myoji} {participant.namae}
                                    </span>
                                    {participant.status === '11' && (
                                      <CheckCircleIcon 
                                        className="h-4 w-4 ml-1 text-blue-500"
                                        fontSize="small"
                                      />
                                    )}
                                  </div>
                                ))}
                            </div>
                          </div>

                          <div className="bg-[#37373F]/50 rounded-xl p-3 border border-[#4A4B50]/30">
                            <h3 className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-2">
                              <CancelIcon className="h-3 w-3 text-red-500" fontSize="small" />
                              <span className="text-red-400">欠席予定</span>
                              <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded-full">
                                {participants.filter(p => p.status === '2').length}
                              </span>
                            </h3>
                            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                              {participants
                                .filter(p => p.status === '2')
                                .map(participant => (
                                  <div
                                    key={participant.entry_id}
                                    className="flex items-center bg-red-600/20 rounded-full px-2 py-1 group hover:bg-red-600/30 transition-all duration-300"
                                  >
                                    <Avatar
                                      sx={{
                                        width: 20,
                                        height: 20,
                                        fontSize: '0.65rem',
                                        bgcolor: 'rgba(239, 68, 68, 0.3)',
                                        color: '#ef4444',
                                      }}
                                    >
                                      {participant.myoji[0]}
                                    </Avatar>
                                    <span className="ml-1.5 text-xs text-red-500 group-hover:text-red-400 transition-colors duration-300">
                                      {participant.myoji} {participant.namae}
                                    </span>
                                  </div>
                                ))}
                            </div>
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
          <div className="sticky bottom-16 left-0 right-0 bg-[#1D1D21] border-t border-gray-700/70 z-50">
            <div className="max-w-2xl mx-auto p-3">
              {entryStatus ? (
                <>
                  {entryStatus === '1' && (
                    <div className="flex-1 mb-3">
                      <TooltipButton
                        onClick={handleConfirmAttendance}
                        isDisabled={isGettingLocation || !isWithinEventPeriod(event)}
                        message={!isWithinEventPeriod(event) ? 'イベントの開催時間外です' : undefined}
                      >
                        {isGettingLocation ? (
                          <>
                            <CircularProgress size={20} className="text-white" />
                            <span className="ml-2">位置情報を確認中...</span>
                          </>
                        ) : (
                          <>
                            <CheckIcon className="h-5 w-5" />
                            <span className="ml-2">本出席を確定する</span>
                          </>
                        )}
                      </TooltipButton>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div 
                        className={`
                          text-lg font-bold h-12 flex items-center justify-center rounded-xl w-full
                          ${entryStatus === '1' 
                            ? 'bg-green-600/30 text-green-400' 
                            : entryStatus === '2' 
                              ? 'bg-red-600/30 text-red-400'
                              : 'bg-blue-600/30 text-blue-400'
                          }
                        `}
                      >
                        {entryStatus === '1' ? '出席予定' : entryStatus === '2' ? '欠席予定' : '出席済み'}
                      </div>
                    </div>
                    {entryStatus !== '11' && (
                      <button
                        onClick={() => setEntryStatus(null)}
                        className="p-2 rounded-xl bg-[#37373F] text-gray-300 hover:bg-[#4A4B50] hover:text-white transition-all duration-300"
                        aria-label="ステータスを変更"
                      >
                        <ChangeCircleIcon sx={{ fontSize: 32 }} />
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex justify-between gap-3">
                  <button
                    onClick={() => handleEventEntry('1')}
                    className="h-12 px-8 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white font-bold hover:opacity-90 transition-opacity duration-300 flex-1 flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                  >
                    <CheckIcon className="h-5 w-5" />
                    出席
                  </button>
                  <button
                    onClick={() => handleEventEntry('2')}
                    className="h-12 px-8 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold hover:opacity-90 transition-opacity duration-300 flex-1 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                  >
                    <CancelIcon className="h-5 w-5" />
                    欠席
                  </button>
                </div>
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
              borderRadius: '1rem',
              maxWidth: '20rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            },
          }}
        >
          <div className="p-4">
            <h3 className="text-lg font-bold text-white mb-4">削除オプション</h3>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  try {
                    await handleDelete('single');
                    setShowDeleteDialog(false);
                  } catch (error) {
                    // エラーが発生した場合はダイアログを閉じない
                    console.error('削除エラー:', error);
                  }
                }}
                className="w-full p-2.5 text-left rounded-lg bg-[#1D1D21] text-[#FCFCFC] hover:bg-[#37373F] transition-colors"
              >
                このイベントのみを削除
              </button>
              <button
                onClick={async () => {
                  try {
                    await handleDelete('future');
                    setShowDeleteDialog(false);
                  } catch (error) {
                    // エラーが発生した場合はダイアログを閉じない
                    console.error('削除エラー:', error);
                  }
                }}
                className="w-full p-2.5 text-left rounded-lg bg-[#1D1D21] text-[#FCFCFC] hover:bg-[#37373F] transition-colors"
              >
                このイベントと以降のイベントを削除
              </button>
              <button
                onClick={async () => {
                  try {
                    await handleDelete('all');
                    setShowDeleteDialog(false);
                  } catch (error) {
                    // エラーが発生した場合はダイアログを閉じない
                    console.error('削除エラー:', error);
                  }
                }}
                className="w-full p-2.5 text-left rounded-lg bg-[#1D1D21] text-[#FCFCFC] hover:bg-[#37373F] transition-colors"
              >
                全ての繰り返しイベントを削除
              </button>
            </div>
            <button
              onClick={() => setShowDeleteDialog(false)}
              className="w-full mt-4 p-2.5 rounded-lg bg-[#4A4B50] text-[#FCFCFC] hover:bg-opacity-80 transition-all duration-300"
            >
              キャンセル
            </button>
          </div>
        </Dialog>
        {/* 出席確定完了ダイアログ */}
        <ConfirmationDialog
          open={confirmationDialog.open}
          message={confirmationDialog.message}
          onClose={() => setConfirmationDialog({ open: false, message: '' })}
        />
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
};

export default EventDetailPage; 