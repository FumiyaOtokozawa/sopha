// pages/registerPages/tempRegistPage.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from '../../utils/supabaseClient';

const SignUpPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // 画面遷移時に入力欄をクリア
  useEffect(() => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setEmployeeId("");
    setErrorMessage(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // ALL_USER_Mテーブルでの存在チェック
      const { data: masterDataEmp } = await supabase
        .from('ALL_USER_M')
        .select('emp_no, email')
        .eq('emp_no', Number(employeeId))
        .single();

      const { data: masterDataEmail } = await supabase
        .from('ALL_USER_M')
        .select('emp_no, email')
        .eq('email', email)
        .single();

      // 社員番号とメールアドレスの存在チェック
      if (!masterDataEmp && !masterDataEmail) {
        setErrorMessage('入力された社員番号とメールアドレスが社員マスタに登録されていません');
        return;
      } else if (!masterDataEmp) {
        setErrorMessage('入力された社員番号が社員マスタに登録されていません');
        return;
      } else if (!masterDataEmail) {
        setErrorMessage('入力されたメールアドレスが社員マスタに登録されていません');
        return;
      }

      // 社員番号とメールアドレスの組み合わせチェック
      if (masterDataEmp.email !== email) {
        setErrorMessage('入力された社員番号とメールアドレスの組み合わせが正しくありません');
        return;
      }

      // USER_INFOテーブルでの重複チェック（既存の処理）
      const { data: existingEmail } = await supabase
        .from('USER_INFO')
        .select('email')
        .eq('email', email)
        .single();

      if (existingEmail) {
        setErrorMessage('このメールアドレスは既に登録されています');
        return;
      }

      const { data: existingEmpNo } = await supabase
        .from('USER_INFO')
        .select('emp_no')
        .eq('emp_no', Number(employeeId))
        .single();

      if (existingEmpNo) {
        setErrorMessage('この社員番号は既に登録されています');
        return;
      }

      // パスワード一致チェック
      if (password !== confirmPassword) {
        setErrorMessage("パスワードが一致しません");
        return;
      }

      // サインアップ処理（既存の処理）
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/registerPages/registConfirmedPage?employeeId=${employeeId}`
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setErrorMessage('このメールアドレスは既に登録されています');
          return;
        }
        setErrorMessage('アカウント登録中にエラーが発生しました');
        return;
      }

      router.push(`/registerPages/registCompletePage?email=${encodeURIComponent(email)}`);

    } catch (error) {
      console.error("登録エラー:", error);
      setErrorMessage("予期せぬエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // 共通の入力欄スタイル
  const inputClassName = `
    w-full p-2 rounded-md
    bg-[#CFD8DC80] text-[#37373F] placeholder-[#37373F]
    focus:outline-none focus:ring-2 focus:ring-blue-500
    focus:bg-[#FCFCFC]
    [&:not(:placeholder-shown)]:bg-[#FCFCFC]
  `;

  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="bg-[#FCFCFC19] rounded-lg shadow-md p-8 w-[400px] mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center text-[#FCFCFC]">
          新規登録
        </h1>
        
        {errorMessage && (
          <div className="bg-red-500 text-white p-3 rounded mb-4">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="relative">
            <input
              id="employeeId"
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              onFocus={() => setFocusedField('employeeId')}
              onBlur={() => setFocusedField(null)}
              placeholder="社員番号"
              className={inputClassName}
              required
              autoComplete="off"
            />
            {focusedField === 'employeeId' && (
              <div className="absolute z-10 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg -top-12 left-0 w-max whitespace-nowrap">
                社員証に記載の社員番号を入力してください
                <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -bottom-1 left-4"></div>
              </div>
            )}
          </div>

          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              placeholder="メールアドレス"
              className={inputClassName}
              required
              autoComplete="off"
            />
            {focusedField === 'email' && (
              <div className="absolute z-10 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg -top-12 left-0 w-max whitespace-nowrap">
                コンサイズのメールアドレスを入力してください
                <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -bottom-1 left-4"></div>
              </div>
            )}
          </div>

          <div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              className={inputClassName}
              required
              autoComplete="new-password"
            />
          </div>

          <div>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="パスワード（確認）"
              className={inputClassName}
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="
              w-full py-2 rounded-md
              bg-[#5b63d3] text-white font-semibold
              hover:bg-opacity-90 transition-colors
              disabled:opacity-50
            "
          >
            {isLoading ? "登録中..." : "登録する"}
          </button>
        </form>

        <button
          onClick={() => router.push("/loginPage")}
          className="
            w-full mt-4 py-2 rounded-md
            bg-[#FCFCFC19] text-[#FCFCFC] font-semibold
            hover:bg-opacity-30 transition-colors
          "
        >
          ログイン画面に戻る
        </button>
      </div>
    </div>
  );
};

export default SignUpPage; 