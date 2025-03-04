import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../utils/supabaseClient";
import Header from "../../components/Header";
import type { Event } from "../../types/event";
import { parseISO } from "date-fns";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import PlaceSelectModal from '../../components/PlaceSelectModal';
import UserSelectModal from '../../components/UserSelectModal';
import type { User } from '../../types/user';

const AdmEventEditPage = () => {
  const router = useRouter();
  const { event_id } = router.query;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
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

  // イベント情報を取得
  useEffect(() => {
    const fetchEvent = async () => {
      if (!event_id) return;

      try {
        const { data, error } = await supabase
          .from("EVENT_LIST")
          .select("*")
          .eq("event_id", event_id)
          .single();

        if (error) throw error;

        if (data) {
          setEvent(data);
          
          // 運営メンバーの情報を取得
          if (data.manage_member) {
            const empNos = data.manage_member
              .split(',')
              .filter((no: string) => no.trim() !== '')
              .map((no: string) => parseInt(no.trim(), 10));
            
            if (empNos.length > 0) {
              const { data: userData } = await supabase
                .from('USER_INFO')
                .select('emp_no, myoji, namae, last_nm, first_nm')
                .in('emp_no', empNos);
              
              if (userData) {
                setParticipants(userData);
              }
            }
          }
        }
      } catch (error) {
        console.error("イベントの取得に失敗しました:", error);
        alert("イベントの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [event_id]);

  const validateAbbreviation = (value: string): boolean => {
    if (!value) return true;
    
    if (value.length > 20) {
      return false;
    }

    let byteCount = 0;
    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i);
      if ((charCode >= 0x0001 && charCode <= 0x007e) || (charCode >= 0xff61 && charCode <= 0xff9f)) {
        byteCount += 1;
      } else {
        byteCount += 2;
      }
    }
    return byteCount <= 6;
  };

  const handlePlaceSelect = (venue: { id: number; name: string }) => {
    if (event) {
      setEvent({
        ...event,
        venue_id: venue.id,
        venue_nm: venue.name
      });
    }
  };

  const handleUserSelect = (user: User) => {
    if (!participants.some(p => p.emp_no === user.emp_no)) {
      const newParticipants = [...participants, user];
      setParticipants(newParticipants);
      
      if (event) {
        const memberString = newParticipants.map(p => p.emp_no).join(',') + ',';
        setEvent({
          ...event,
          manage_member: memberString
        });
      }
    }
  };
  
  const handleRemoveParticipant = (empNo: number) => {
    const newParticipants = participants.filter(p => p.emp_no !== empNo);
    setParticipants(newParticipants);
    
    if (event) {
      const memberString = newParticipants.length > 0 ? newParticipants.map(p => p.emp_no).join(',') + ',' : '';
      setEvent({
        ...event,
        manage_member: memberString
      });
    }
  };

  const toDate = (isoString: string) => {
    return parseISO(isoString);
  };

  const handleSave = async () => {
    if (!event || !event_id) return;

    setError('');

    const startDate = toDate(event.start_date);
    const endDate = toDate(event.end_date);

    if (startDate >= endDate) {
      setError('終了日時は開始日時より後に設定してください');
      return;
    }

    if (event.abbreviation) {
      if (!validateAbbreviation(event.abbreviation)) {
        setError('省略名は合計6バイト以内で入力してください（全角文字は2バイト、半角文字は1バイト）');
        return;
      }
    }

    if (event.format === 'online' && !event.url) {
      setError('オンラインイベントの場合はURLを入力してください');
      return;
    }

    try {
      const { error } = await supabase
        .from("EVENT_LIST")
        .update({
          title: event.title,
          description: event.description,
          start_date: event.start_date,
          end_date: event.end_date,
          venue_id: event.venue_id,
          venue_nm: event.venue_nm,
          url: event.url,
          format: event.format,
          genre: event.genre,
          abbreviation: event.abbreviation,
          manage_member: event.manage_member,
        })
        .eq("event_id", event_id);

      if (error) throw error;

      alert("イベントを更新しました。");
      router.push("/adminPages/admEventSearchPage");
    } catch (error) {
      console.error("イベントの更新に失敗しました:", error);
      alert("イベントの更新に失敗しました。");
    }
  };

  const handleDelete = async () => {
    if (!event_id) return;

    if (!confirm("このイベントを削除してもよろしいですか？")) return;

    try {
      const { error } = await supabase
        .from("EVENT_LIST")
        .update({ act_kbn: false })
        .eq("event_id", event_id);

      if (error) throw error;

      alert("イベントを削除しました。");
      router.push("/adminPages/admEventSearchPage");
    } catch (error) {
      console.error("イベントの削除に失敗しました:", error);
      alert("イベントの削除に失敗しました。");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1b1e]">
        <Header />
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-[#ACACAC]">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#1a1b1e]">
        <Header />
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-[#ACACAC]">イベントが見つかりませんでした。</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1b1e]">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="bg-[#2D2D33] rounded-lg p-4">
          {/* ヘッダー部分 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/adminPages/admEventSearchPage")}
                className="w-8 h-8 rounded-full text-[#ACACAC] hover:text-white hover:bg-[#3D3D45] transition-colors flex items-center justify-center"
              >
                <ArrowBackIcon fontSize="small" />
              </button>
              <h2 className="text-base font-medium text-white">イベント編集</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="w-8 h-8 rounded text-red-400 hover:text-red-300 hover:bg-[#3D3D45] transition-colors flex items-center justify-center border border-red-400"
              >
                <DeleteIcon fontSize="small" />
              </button>
              <button
                onClick={handleSave}
                className="w-8 h-8 rounded bg-[#5b63d3] hover:bg-[#7A7FD1] text-white transition-colors flex items-center justify-center"
              >
                <SaveIcon fontSize="small" />
              </button>
            </div>
          </div>

          {/* フォーム部分 */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                  イベント種別<span className="text-red-500">*</span>
                </label>
                <select
                  value={event.genre}
                  onChange={(e) => setEvent({...event, genre: e.target.value})}
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
                  value={event.format}
                  onChange={(e) => setEvent({ 
                    ...event, 
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
                value={event.title}
                onChange={(e) => setEvent({ ...event, title: e.target.value })}
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
                value={event.abbreviation || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 20) {
                    setEvent({ ...event, abbreviation: value });
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
                    value={toDate(event.start_date)}
                    onChange={(date) => {
                      if (date) {
                        setEvent({
                          ...event,
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
                    value={toDate(event.end_date)}
                    onChange={(date) => {
                      if (date) {
                        setEvent({
                          ...event,
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
                value={event.venue_nm || ''}
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
                {event.format === 'online' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="url"
                value={event.url || ''}
                onChange={(e) => setEvent({ ...event, url: e.target.value })}
                className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
                required={event.format === 'online'}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                説明
              </label>
              <textarea
                value={event.description || ''}
                onChange={(e) => setEvent({ ...event, description: e.target.value })}
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
          </div>
        </div>
      </main>

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
};

export default AdmEventEditPage;