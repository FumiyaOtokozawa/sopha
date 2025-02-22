import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import Header from '../../components/Header';
import { useRouter } from 'next/router';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { Box } from '@mui/material';
import FooterMenu from '../../components/FooterMenu';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

interface EventForm {
  title: string;
  start: Date | null;
  end: Date | null;
  place: string;
  description?: string;
  genre: string;
  isRecurring: boolean;
  recurringType: string;
  recurringEndDate: Date | null;
  abbreviation: string;
}

const EventAddPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<EventForm>({
    title: '',
    start: null,
    end: null,
    place: '',
    description: '',
    genre: '0',
    isRecurring: false,
    recurringType: 'weekly',
    recurringEndDate: null,
    abbreviation: '',
  });
  const [error, setError] = useState<string>('');

  // ポータル用のdivをマウント時に作成
  useEffect(() => {
    const portalRoot = document.createElement('div');
    portalRoot.setAttribute('id', 'date-picker-portal');
    document.body.appendChild(portalRoot);
    return () => {
      document.body.removeChild(portalRoot);
    };
  }, []);

  // 省略名のバリデーション関数を追加
  const validateAbbreviation = (value: string): boolean => {
    const length = [...value].length; // 文字列を配列に分解して長さを取得
    return length <= 3;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.start || !formData.end || !formData.place) {
      setError('必須項目を入力してください');
      return;
    }

    if (formData.isRecurring && !formData.recurringEndDate) {
      setError('繰り返し終了日を設定してください');
      return;
    }

    if (formData.abbreviation && !validateAbbreviation(formData.abbreviation)) {
      setError('省略名は全角3文字以内で入力してください');
      return;
    }

    const startDate = formData.start;
    const endDate = formData.end;

    if (startDate >= endDate) {
      setError('終了日時は開始日時より後に設定してください');
      return;
    }

    if (formData.isRecurring && formData.recurringEndDate && formData.recurringEndDate < endDate) {
      setError('繰り返し終了日はイベント終了日より後に設定してください');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ユーザー情報が取得できません');

      // ユーザーのemp_noを取得
      const { data: userData, error: userError } = await supabase
        .from('USER_INFO')
        .select('emp_no')
        .eq('email', user.email)
        .single();

      if (userError) throw new Error('ユーザー情報の取得に失敗しました');

      // 繰り返しイベントの作成
      if (formData.isRecurring && formData.start && formData.end && formData.recurringEndDate) {
        // 新しいrepeat_idを生成（タイムスタンプを使用）
        const repeat_id = Date.now();
        
        const events = [];
        let currentStart = new Date(formData.start.getTime());
        let currentEnd = new Date(formData.end.getTime());
        const endDate = new Date(formData.recurringEndDate.getTime());
        
        while (currentStart <= endDate) {
          events.push({
            title: formData.title,
            start_date: new Date(currentStart.getTime() - (currentStart.getTimezoneOffset() * 60000)).toISOString(),
            end_date: new Date(currentEnd.getTime() - (currentEnd.getTimezoneOffset() * 60000)).toISOString(),
            place: formData.place,
            description: formData.description,
            owner: userData.emp_no,
            created_by: userData.emp_no,
            updated_by: userData.emp_no,
            act_kbn: true,
            genre: formData.genre,
            repeat_id: repeat_id,
            abbreviation: formData.abbreviation,
          });

          // 次の日付を計算
          if (formData.recurringType === 'daily') {
            currentStart = new Date(currentStart.setDate(currentStart.getDate() + 1));
            currentEnd = new Date(currentEnd.setDate(currentEnd.getDate() + 1));
          } else if (formData.recurringType === 'weekly') {
            currentStart = new Date(currentStart.setDate(currentStart.getDate() + 7));
            currentEnd = new Date(currentEnd.setDate(currentEnd.getDate() + 7));
          } else if (formData.recurringType === 'monthly') {
            currentStart = new Date(currentStart.setMonth(currentStart.getMonth() + 1));
            currentEnd = new Date(currentEnd.setMonth(currentEnd.getMonth() + 1));
          }
        }

        // 一括登録
        for (const event of events) {
          const { data: maxEventData } = await supabase
            .from('EVENT_LIST')
            .select('event_id')
            .order('event_id', { ascending: false })
            .limit(1);

          const nextEventId = maxEventData && maxEventData.length > 0 
            ? maxEventData[0].event_id + 1 
            : 1;

          const { error: insertError } = await supabase
            .from('EVENT_LIST')
            .insert({ ...event, event_id: nextEventId });

          if (insertError) throw insertError;
        }
      } else {
        // 新しいイベントIDを設定（既存の最大値 + 1）
        const { data: maxEventData, error: maxEventError } = await supabase
          .from('EVENT_LIST')
          .select('event_id')
          .order('event_id', { ascending: false })
          .limit(1);

        if (maxEventError) throw new Error('イベントIDの取得に失敗しました');

        // 新しいイベントIDを設定（既存の最大値 + 1）
        const nextEventId = maxEventData && maxEventData.length > 0 
          ? maxEventData[0].event_id + 1 
          : 1;

        const { error: insertError } = await supabase
          .from('EVENT_LIST')
          .insert({
            event_id: nextEventId,
            title: formData.title,
            start_date: startDate ? new Date(startDate.getTime() - (startDate.getTimezoneOffset() * 60000)).toISOString() : null,
            end_date: endDate ? new Date(endDate.getTime() - (endDate.getTimezoneOffset() * 60000)).toISOString() : null,
            place: formData.place,
            description: formData.description,
            owner: userData.emp_no,
            created_by: userData.emp_no,
            updated_by: userData.emp_no,
            act_kbn: true,
            genre: formData.genre,
            repeat_id: null,
            abbreviation: formData.abbreviation,
          });

        if (insertError) throw insertError;
      }

      router.push('/events/eventListPage');
    } catch (err) {
      setError('イベントの登録に失敗しました');
      console.error(err);
    }
  };

  // 日付選択時のハンドラーを追加
  const handleRecurringEndDateChange = (date: Date | null) => {
    if (date) {
      // 選択された日の23:59:59に設定
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      setFormData({ ...formData, recurringEndDate: endOfDay });
    } else {
      setFormData({ ...formData, recurringEndDate: null });
    }
  };

  return (
    <Box sx={{ pb: 7 }}>
      <Header />
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4 text-[#FCFCFC]">イベント追加</h1>
        
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
          <div className="bg-[#2D2D33] rounded-lg p-6 space-y-4">
            {/* イベント種別 */}
            <div>
              <label className="block text-sm font-medium mb-1 text-[#FCFCFC]">
                イベント種別<span className="text-red-500">*</span>
              </label>
              <select
                value={formData.genre}
                onChange={(e) => setFormData({...formData, genre: e.target.value})}
                className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
                required
              >
                <option value="0">非公式イベント</option>
                <option value="1">公式イベント</option>
              </select>
            </div>

            {/* タイトル */}
            <div>
              <label className="block text-sm font-medium mb-1 text-[#FCFCFC]">
                タイトル<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
                required
              />
            </div>

            {/* 省略名入力フィールドを追加 */}
            <div>
              <label className="block text-sm font-medium mb-1 text-[#FCFCFC]">
                省略名（全角3文字以内）
              </label>
              <input
                type="text"
                value={formData.abbreviation}
                onChange={(e) => {
                  const value = e.target.value;
                  if (validateAbbreviation(value)) {
                    setFormData({...formData, abbreviation: value});
                  }
                }}
                className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px] placeholder-[#6B7280]"
                placeholder="例：懇親会、ポケカ、など"
              />
            </div>

            {/* 日時選択 */}
            <div className="flex flex-row gap-4 w-full">
              <div className="w-1/2">
                <label className="block text-sm font-medium mb-1 text-[#FCFCFC]">
                  開始日時<span className="text-red-500">*</span>
                </label>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
                  <DateTimePicker
                    value={formData.start}
                    onChange={(date) => setFormData({...formData, start: date})}
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
                          color: '#6B7280',  // gray-500相当の色
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
                <label className="block text-sm font-medium mb-1 text-[#FCFCFC]">
                  終了日時<span className="text-red-500">*</span>
                </label>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
                  <DateTimePicker
                    value={formData.end}
                    onChange={(date) => setFormData({...formData, end: date})}
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
                          color: '#6B7280',  // gray-500相当の色
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

            {/* 場所 */}
            <div>
              <label className="block text-sm font-medium mb-1 text-[#FCFCFC]">
                場所<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.place}
                onChange={(e) => setFormData({...formData, place: e.target.value})}
                className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
                required
              />
            </div>

            {/* 説明 */}
            <div>
              <label className="block text-sm font-medium mb-1 text-[#FCFCFC]">
                説明
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-[#1D1D21] rounded p-2 h-32 text-[#FCFCFC]"
              />
            </div>

            {/* 繰り返し設定 */}
            <div>
              <label className="flex items-center text-sm font-medium text-[#FCFCFC]">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                  className="mr-2"
                />
                繰り返し設定
              </label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-[#FCFCFC]">
                    繰り返しタイプ
                  </label>
                  <select
                    value={formData.recurringType}
                    onChange={(e) => setFormData({...formData, recurringType: e.target.value})}
                    className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
                  >
                    <option value="daily">毎日</option>
                    <option value="weekly">毎週</option>
                    <option value="monthly">毎月</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-[#FCFCFC]">
                    繰り返し終了日<span className="text-red-500">*</span>
                  </label>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
                    <DatePicker
                      value={formData.recurringEndDate}
                      onChange={handleRecurringEndDateChange}
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
                            color: '#6B7280',  // gray-500相当の色
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
            )}

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 rounded bg-[#4A4B50] text-[#FCFCFC] hover:bg-opacity-80"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-[#8E93DA] text-black font-bold hover:bg-opacity-80"
              >
                登録
              </button>
            </div>
          </div>
        </form>
      </div>
      <FooterMenu />
    </Box>
  );
};

export default EventAddPage; 