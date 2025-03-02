import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import Header from '../../components/Header';
import { Box, Button, Typography, Alert, CircularProgress } from '@mui/material';
import FooterMenu from '../../components/FooterMenu';

type FormData = {
  category: string;
  title: string;
  description: string;
  email: string;
};

export default function ContactBugReportPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    category: '',
    title: '',
    description: '',
    email: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // ユーザーのメールアドレスを取得
  useEffect(() => {
    const fetchUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        setFormData(prev => ({ ...prev, email: user.email || '' }));
      }
    };
    fetchUserEmail();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, category: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // 問い合わせデータをSupabaseに送信
      const { error } = await supabase
        .from('CONTACT_REPORTS')
        .insert([
          {
            category: formData.category,
            title: formData.title,
            description: formData.description,
            email: formData.email,
            status: 'pending', // 初期ステータス
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      // 送信成功
      setSubmitSuccess(true);
      // フォームをリセット
      setFormData({
        category: '',
        title: '',
        description: '',
        email: userEmail,
      });

      // 3秒後に成功メッセージを非表示
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('送信エラー:', error.message);
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ pb: 7 }}>
      <Header />
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4 text-[#FCFCFC]">お問い合わせ / 不具合報告</h1>
        
        {submitSuccess && (
          <Alert severity="success" className="mb-4">
            送信が完了しました。ご報告ありがとうございます。
          </Alert>
        )}

        {submitError && (
          <Alert severity="error" className="mb-4">
            エラーが発生しました: {submitError}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
          <div className="bg-[#2D2D33] rounded-lg p-4 space-y-3">
            {/* カテゴリ */}
            <div>
              <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                カテゴリ<span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleSelectChange}
                className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
                required
              >
                <option value="" disabled>選択してください</option>
                <option value="bug">不具合報告</option>
                <option value="feature">機能リクエスト</option>
                <option value="other">その他</option>
              </select>
            </div>

            {/* タイトル */}
            <div>
              <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                タイトル<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
                required
              />
            </div>

            {/* 詳細内容 */}
            <div>
              <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                詳細内容<span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full bg-[#1D1D21] rounded p-2 h-32 text-[#FCFCFC]"
                required
              />
            </div>

            {/* メールアドレス */}
            <div>
              <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                メールアドレス<span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
                required
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 rounded bg-[#4A4B50] text-[#FCFCFC] hover:bg-opacity-80"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded bg-[#8E93DA] text-black font-bold hover:bg-opacity-80 flex items-center justify-center min-w-[100px]"
              >
                {isSubmitting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  '送信する'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
      <FooterMenu />
    </Box>
  );
} 