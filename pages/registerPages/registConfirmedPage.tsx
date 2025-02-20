import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';

const RegistConfirmedPage = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { employeeId } = router.query; // URLパラメータから社員番号を取得

  useEffect(() => {
    const checkSessionAndAddRole = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setError('セッションの確認中にエラーが発生しました');
        return;
      }

      if (!session) {
        setError('無効なセッションです');
        return;
      }

      // メールアドレス確認済みかチェック
      if (!session.user.email_confirmed_at) {
        setError('メールアドレスが確認できていません');
        return;
      }

      try {
        // 先にUSER_INFOテーブルに基本情報を登録
        const { error: userInfoError } = await supabase
          .from('USER_INFO')
          .insert([
            {
              emp_no: Number(employeeId),
              email: session.user.email,
              act_kbn: true
            }
          ]);

        if (userInfoError) {
          console.error('ユーザー情報登録エラー:', userInfoError);
          setError('ユーザー情報の登録中にエラーが発生しました');
          return;
        }

        // USER_ROLEテーブルにユーザー情報を追加
        const { error: insertError } = await supabase
          .from('USER_ROLE')
          .insert([
            {
              emp_no: Number(employeeId),
              role: '0',
              act_kbn: true,
              updated_at: new Date().toISOString(),
              updated_by: Number(employeeId)
            }
          ]);

        if (insertError) {
          console.error('ロール登録エラー:', insertError);
          setError('ユーザー情報の登録中にエラーが発生しました');
          return;
        }

        // EMP_CIZテーブルに初期ポイント情報を追加
        // まず最大のciz_idを取得
        const { data: maxCizData, error: maxCizError } = await supabase
          .from('EMP_CIZ')
          .select('ciz_id')
          .order('ciz_id', { ascending: false })
          .limit(1)
          .single();

        if (maxCizError && !maxCizError.message.includes('No rows found')) {
          console.error('CIZ ID取得エラー:', maxCizError);
          setError('ユーザー情報の登録中にエラーが発生しました');
          return;
        }

        // 新しいciz_idを設定（既存データがない場合は1から開始）
        const nextCizId = maxCizData ? maxCizData.ciz_id + 1 : 1;

        // EMP_CIZテーブルに登録
        const { error: cizError } = await supabase
          .from('EMP_CIZ')
          .insert([
            {
              ciz_id: nextCizId,
              emp_no: Number(employeeId),
              total_ciz: 0,
              act_kbn: true,
              updated_at: new Date().toISOString(),
              updated_by: 0  // 0 = admin
            }
          ]);

        if (cizError) {
          console.error('ポイント情報登録エラー:', cizError);
          setError('ユーザー情報の登録中にエラーが発生しました');
          return;
        }

        // EVENT_PARTICIPATIONテーブルに初期データを登録
        const { error: participationError } = await supabase
          .from('EVENT_PARTICIPATION')
          .insert([
            {
              emp_no: Number(employeeId),
              official_count: 0,
              unofficial_count: 0,
              updated_at: new Date().toISOString()
            }
          ]);

        if (participationError) {
          console.error('イベント参加情報登録エラー:', participationError);
          setError('ユーザー情報の登録中にエラーが発生しました');
          return;
        }

      } catch (error) {
        console.error('登録エラー:', error);
        setError('ユーザー情報の登録中にエラーが発生しました');
      }
    };

    if (employeeId) { // 社員番号が存在する場合のみ処理を実行
      checkSessionAndAddRole();
    }
  }, [employeeId]); // employeeIdを依存配列に追加

  const handleLoginClick = () => {
    router.push('/loginPage');
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-[#FCFCFC19] rounded-lg shadow-md p-8 w-[400px]">
        {error ? (
          <>
            <h1 className="text-2xl font-bold mb-6 text-center text-[#FCFCFC]">
              エラー
            </h1>
            <div className="bg-red-500 text-white p-3 rounded mb-4">
              {error}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-6 text-center text-[#FCFCFC]">
              メール確認完了
            </h1>
            <p className="text-[#FCFCFC] text-center mb-6">
              メールアドレスの確認が完了しました。<br />
              ログインページからログインしてください。
            </p>
          </>
        )}

        <button
          onClick={handleLoginClick}
          className="
            w-full py-2 rounded-md
            bg-[#8E93DA] text-black font-semibold
            hover:bg-opacity-90 transition-colors
          "
        >
          ログインページへ
        </button>
      </div>
    </div>
  );
};

export default RegistConfirmedPage; 