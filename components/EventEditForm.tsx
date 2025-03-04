import { useState, useEffect } from 'react';
import PlaceSelectModal from './PlaceSelectModal';
import UserSelectModal from './UserSelectModal';
import { Event } from '../types/event';
import { User } from '../types/user';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { supabase } from '../utils/supabaseClient';
import { parseISO } from 'date-fns';

interface EventEditFormProps {
  onSave: () => Promise<void>;
  onCancel: () => void;
  editedEvent: Event;
  setEditedEvent: (event: Event) => void;
}

const EventEditForm: React.FC<EventEditFormProps> = ({
  onSave,
  onCancel,
  editedEvent,
  setEditedEvent,
}) => {
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [participants, setParticipants] = useState<User[]>([]);
  const [currentUserEmpNo, setCurrentUserEmpNo] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  // 現在のユーザー情報を取得
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('USER_INFO')
          .select('emp_no')
          .eq('email', user.email)
          .single();
        
        if (data) {
          setCurrentUserEmpNo(data.emp_no);
        }
      }
    };
    
    fetchCurrentUser();
  }, []);

  // 運営メンバーの情報を取得
  useEffect(() => {
    const fetchParticipants = async () => {
      if (editedEvent && editedEvent.manage_member) {
        // カンマ区切りの社員番号を配列に変換
        const empNos = editedEvent.manage_member
          .split(',')
          .filter((no: string) => no.trim() !== '')
          .map((no: string) => parseInt(no.trim(), 10));
        
        if (empNos.length > 0) {
          const { data } = await supabase
            .from('USER_INFO')
            .select('emp_no, myoji, namae, last_nm, first_nm')
            .in('emp_no', empNos);
          
          if (data) {
            setParticipants(data);
          }
        }
      }
    };
    
    fetchParticipants();
  }, [editedEvent]);

  const validateAbbreviation = (value: string): boolean => {
    if (!value) return true;
    
    // 文字数チェック（20文字まで）
    if (value.length > 20) {
      return false;
    }

    // バイト数を計算（全角文字は2バイト、半角文字は1バイト）
    let byteCount = 0;
    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i);
      // 半角文字（ASCII文字とカタカナ）は1バイト、それ以外は2バイト
      if ((charCode >= 0x0001 && charCode <= 0x007e) || (charCode >= 0xff61 && charCode <= 0xff9f)) {
        byteCount += 1;
      } else {
        byteCount += 2;
      }
    }
    return byteCount <= 6;
  };

  const handlePlaceSelect = (venue: { id: number; name: string }) => {
    setEditedEvent({
      ...editedEvent,
      venue_id: venue.id,
      venue_nm: venue.name
    });
  };

  // ユーザー選択時のハンドラー
  const handleUserSelect = (user: User) => {
    // 既に追加されているユーザーは追加しない
    if (!participants.some(p => p.emp_no === user.emp_no)) {
      const newParticipants = [...participants, user];
      setParticipants(newParticipants);
      
      // 社員番号をカンマ区切りのテキストに変換
      const memberString = newParticipants.map(p => p.emp_no).join(',') + ',';
      
      setEditedEvent({
        ...editedEvent,
        manage_member: memberString
      });
    }
  };
  
  // 参加者削除のハンドラー
  const handleRemoveParticipant = (empNo: number) => {
    const newParticipants = participants.filter(p => p.emp_no !== empNo);
    setParticipants(newParticipants);
    
    // 社員番号をカンマ区切りのテキストに変換
    const memberString = newParticipants.length > 0 ? newParticipants.map(p => p.emp_no).join(',') + ',' : '';
    
    setEditedEvent({
      ...editedEvent,
      manage_member: memberString
    });
  };

  // ISO文字列をDateオブジェクトに変換する関数
  const toDate = (isoString: string) => {
    return parseISO(isoString);
  };

  // 保存前に呼び出す関数
  const handleSave = async () => {
    // エラーをリセット
    setError('');

    // 開始日時と終了日時の前後関係をチェック
    const startDate = toDate(editedEvent.start_date);
    const endDate = toDate(editedEvent.end_date);

    if (startDate >= endDate) {
      setError('終了日時は開始日時より後に設定してください');
      return;
    }

    // 省略名のバリデーション
    if (editedEvent.abbreviation) {
      if (!validateAbbreviation(editedEvent.abbreviation)) {
        setError('省略名は合計6バイト以内で入力してください（全角文字は2バイト、半角文字は1バイト）');
        return;
      }
    }

    // 保存前に日時のタイムゾーンオフセットを調整
    if (editedEvent.start_date) {
      editedEvent.start_date = new Date(startDate.getTime() - (startDate.getTimezoneOffset() * 60000)).toISOString();
    }
    
    if (editedEvent.end_date) {
      editedEvent.end_date = new Date(endDate.getTime() - (endDate.getTimezoneOffset() * 60000)).toISOString();
    }
    
    // 元の保存処理を呼び出す
    await onSave();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 ">
        <div>
          <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
            イベント種別<span className="text-red-500">*</span>
          </label>
          <select
            value={editedEvent?.genre}
            onChange={(e) => setEditedEvent({...editedEvent, genre: e.target.value})}
            className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
            required
          >
            <option value="0">有志イベント</option>
            <option value="1">公式イベント</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
            開催形式<span className="text-red-500">*</span>
          </label>
          <select
            value={editedEvent?.format}
            onChange={(e) => setEditedEvent({ 
              ...editedEvent, 
              format: e.target.value as 'offline' | 'online' | 'hybrid'
            })}
            className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
            required
          >
            <option value="offline">オフライン</option>
            <option value="online">オンライン</option>
            <option value="hybrid">ハイブリッド</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
          タイトル<span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={editedEvent?.title}
          onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
          className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
          省略名（6バイト以内：全角=2バイト、半角=1バイト）
        </label>
        <input
          type="text"
          value={editedEvent?.abbreviation || ''}
          onChange={(e) => {
            const value = e.target.value;
            if (value.length <= 20) {
              setEditedEvent({ ...editedEvent, abbreviation: value });
            }
          }}
          className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px] placeholder-[#6B7280]"
          placeholder="例：懇親会、ポケカ、ああaa など"
        />
      </div>

      <div className="flex flex-row gap-3 w-full">
        <div className="w-1/2">
          <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
            開始日時<span className="text-red-500">*</span>
          </label>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
            <DateTimePicker
              value={toDate(editedEvent?.start_date)}
              onChange={(date) => {
                if (date) {
                  setEditedEvent({
                    ...editedEvent,
                    start_date: date.toISOString()
                  });
                }
              }}
              sx={{
                width: '100%',
                '& .MuiInputBase-root': {
                  backgroundColor: '#1D1D21',
                  color: '#FCFCFC',
                  height: '40px',
                  fontSize: '14px',
                },
                '& .MuiInputBase-input': {
                  padding: '8px 14px',
                  height: '24px',
                  '&::placeholder': {
                    color: '#6B7280',
                    opacity: 1,
                    fontSize: '12px',
                  },
                },
                '& .MuiSvgIcon-root': {
                  color: '#FCFCFC',
                  fontSize: '20px',
                }
              }}
            />
          </LocalizationProvider>
        </div>
        <div className="w-1/2">
          <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
            終了日時<span className="text-red-500">*</span>
          </label>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
            <DateTimePicker
              value={toDate(editedEvent?.end_date)}
              onChange={(date) => {
                if (date) {
                  setEditedEvent({
                    ...editedEvent,
                    end_date: date.toISOString()
                  });
                }
              }}
              sx={{
                width: '100%',
                '& .MuiInputBase-root': {
                  backgroundColor: '#1D1D21',
                  color: '#FCFCFC',
                  height: '40px',
                  fontSize: '14px',
                },
                '& .MuiInputBase-input': {
                  padding: '8px 14px',
                  height: '24px',
                  '&::placeholder': {
                    color: '#6B7280',
                    opacity: 1,
                    fontSize: '12px',
                  },
                },
                '& .MuiSvgIcon-root': {
                  color: '#FCFCFC',
                  fontSize: '20px',
                }
              }}
            />
          </LocalizationProvider>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
          場所<span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={editedEvent?.venue_nm}
          onClick={() => setIsPlaceModalOpen(true)}
          readOnly
          className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px] cursor-pointer"
          placeholder="クリックして場所を選択"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
          URL
          {editedEvent?.format === 'online' && <span className="text-red-500">*</span>}
        </label>
        <input
          type="url"
          value={editedEvent?.url || ''}
          onChange={(e) => setEditedEvent({ ...editedEvent, url: e.target.value })}
          className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
          required={editedEvent?.format === 'online'}
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
          説明
        </label>
        <textarea
          value={editedEvent?.description || ''}
          onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
          className="w-full bg-[#1D1D21] rounded p-2 h-32 text-[#FCFCFC]"
        />
      </div>
      
      {/* 運営メンバー */}
      <div>
        <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
          運営メンバー
        </label>
        <div className="flex flex-col space-y-2">
          <button
            type="button"
            onClick={() => setIsUserModalOpen(true)}
            className="flex items-center bg-[#3D3D45] rounded-full pl-3 pr-3 py-1.5 text-[#FCFCFC] hover:bg-[#4D4D55] w-auto inline-block"
          >
            <span className="text-sm">+ 運営メンバーを追加</span>
          </button>
          
          {participants.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {participants.map(user => (
                <div 
                  key={user.emp_no} 
                  className="flex items-center bg-[#3D3D45] rounded-full pl-2 pr-1.5 py-0.5 text-xs"
                >
                  <span className="text-[#FCFCFC] mr-1.5">{user.myoji} {user.namae}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(user.emp_no)}
                    className="w-4 h-4 flex items-center justify-center rounded-full bg-[#5D5D65] text-[#FCFCFC] hover:bg-[#8E93DA] hover:text-black text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm mt-2">{error}</div>
      )}

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded bg-[#4A4B50] text-[#FCFCFC] hover:bg-opacity-80"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded bg-[#5b63d3] text-white font-bold hover:bg-opacity-80"
        >
          保存
        </button>
      </div>

      <PlaceSelectModal
        open={isPlaceModalOpen}
        onClose={() => setIsPlaceModalOpen(false)}
        onSelect={handlePlaceSelect}
      />
      
      <UserSelectModal
        open={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSelect={handleUserSelect}
        excludeEmpNo={currentUserEmpNo || undefined}
      />
    </div>
  );
}

export default EventEditForm; 