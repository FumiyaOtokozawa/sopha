import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";

const UpdatePassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { type, email } = router.query;

      // リカバリータイプでない、またはメールアドレスがない場合はログインページにリダイレクト
      if (!type || type !== "recovery" || !email || typeof email !== "string") {
        router.push("/loginPage");
        return;
      }

      // セッションの確認
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError(
          "無効なリセットリンクです。再度パスワードリセットを実行してください。"
        );
        setTimeout(() => router.push("/loginPage"), 3000);
      }
    };

    if (router.isReady) {
      checkSession();
    }
  }, [router, router.isReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    // パスワードの一致確認
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError("パスワードの更新に失敗しました");
      } else {
        setMessage("パスワードを更新しました");
        // 3秒後にログインページに遷移
        setTimeout(() => {
          router.push("/loginPage");
        }, 3000);
      }
    } catch {
      setError(
        "予期せぬエラーが発生しました。しばらく時間をおいて再度お試しください。"
      );
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
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden touch-none">
      <div className="bg-[#FCFCFC19] rounded-lg shadow-md p-6 w-[300px]">
        <h1 className="text-xl font-bold mb-6 text-center text-[#FCFCFC]">
          新しいパスワードの設定
        </h1>

        {error && (
          <p className="mb-4 text-red-500 text-sm text-center">{error}</p>
        )}

        {message && (
          <p className="mb-4 text-green-500 text-sm text-center">{message}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="新しいパスワード"
              className={inputClassName}
              required
              minLength={6}
            />
          </div>

          <div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="新しいパスワード（確認）"
              className={inputClassName}
              required
              minLength={6}
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
            {isLoading ? "更新中..." : "パスワードを更新"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePassword;
