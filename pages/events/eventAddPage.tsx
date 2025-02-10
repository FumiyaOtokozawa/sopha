import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import Header from '../../components/Header';
import { useRouter } from 'next/router';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';

interface EventForm {
  title: string;
  start: Date | null;
  end: Date | null;
  place: string;
  description?: string;
  genre: string;
}

const EventAddPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<EventForm>({
    title: '',
    start: null,
    end: null,
    place: '',
    description: '',
    genre: '0'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.start || !formData.end || !formData.place) {
      setError('必須項目を入力してください');
      return;
    }

    const startDate = formData.start;
    const endDate = formData.end;

    if (startDate >= endDate) {
      setError('終了日時は開始日時より後に設定してください');
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

      // 最大のevent_idを取得
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
          start_date: startDate?.toISOString(),
          end_date: endDate?.toISOString(),
          place: formData.place,
          description: formData.description,
          owner: userData.emp_no,
          created_by: userData.emp_no,
          updated_by: userData.emp_no,
          act_kbn: true,
          genre: formData.genre
        });

      if (insertError) throw insertError;

      router.push('/events/eventListPage');
    } catch (err) {
      setError('イベントの登録に失敗しました');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen">
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
                      },
                      '& .MuiSvgIcon-root': {
                        color: '#FCFCFC',
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
                      },
                      '& .MuiSvgIcon-root': {
                        color: '#FCFCFC',
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
    </div>
  );
};

export default EventAddPage; 