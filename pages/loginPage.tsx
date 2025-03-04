import { useState } from "react";
import { useRouter } from "next/router";
import supabase from "../supabaseClient";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // ログイン処理
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // ログイン回数を更新
      const { data: userData, error: userError } = await supabase
        .from('USER_INFO')
        .select('emp_no, login_count')
        .eq('email', email)
        .single();

      if (userError) throw userError;

      // login_countを+1
      const { error: updateError } = await supabase
        .from('USER_INFO')
        .update({ login_count: (userData.login_count || 0) + 1 })
        .eq('emp_no', userData.emp_no);

      if (updateError) throw updateError;

      // ロール判定して遷移先を決定
      const { data: roleData, error: roleError } = await supabase
        .from('USER_ROLE')
        .select('role')
        .eq('emp_no', userData.emp_no)
        .single();

      if (roleError) throw roleError;

      // 遷移先の決定
      const path = roleData.role === '1' ? '/adminPages/admMainPage' : '/employeePages/empMainPage';
      router.push(path);

    } catch (error) {
      console.error('ログインエラー:', error);
      setError('メールアドレスまたはパスワードが正しくありません');
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
    // 画面中央揃え
    <div className="flex items-center justify-center min-h-screen">
      {/* カード風コンテナ*/}
      <div className="bg-[#FCFCFC19] rounded-lg shadow-md p-8 w-[300px]">
        <h1 className="text-xl font-bold mb-6 text-center text-[#FCFCFC]">
          Welcome to SOPHA
        </h1>

        {/* ログインフォーム */}
        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
          <div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className={inputClassName}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={inputClassName}
              required
              autoComplete="current-password"
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
            {isLoading ? "ログイン中..." : "LOGIN"}
          </button>
        </form>

        {/* 新規登録リンクを追加 */}
        <div className="mt-4 text-center">
          <p className="text-white text-sm">アカウントをお持ちでない方は</p>
          <button
            onClick={() => router.push("/registerPages/tempRegistPage")}
            className="text-blue-400 hover:text-blue-300"
          >
            新規登録
          </button>
        </div>

        {/* エラーメッセージをカスタマイズ */}
        {error && (
          <p className="mt-4 text-red-500 text-center">
            {error === "Email not confirmed" 
              ? "メールアドレスの確認が完了していません。確認メールのリンクをクリックしてください。"
              : error}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
