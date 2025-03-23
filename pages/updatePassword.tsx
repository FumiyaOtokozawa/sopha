import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";

const UpdatePassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // URLからハッシュパラメータを取得
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    // トークンが存在する場合、セッションを設定
    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("パスワードが一致しません");
      setIsLoading(false);
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session.session) {
        setMessage(
          "セッションが無効です。パスワードリセットのリンクから再度アクセスしてください。"
        );
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setMessage("パスワードを更新しました。ログイン画面に移動します。");
      setTimeout(() => {
        router.push("/loginPage");
      }, 2000);
    } catch (error) {
      console.error("パスワード更新エラー:", error);
      setMessage(
        "パスワードの更新に失敗しました。パスワードリセットのリンクから再度アクセスしてください。"
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
      <div className="bg-[#FCFCFC19] rounded-lg shadow-md p-8 w-[300px]">
        <h1 className="text-xl font-bold mb-6 text-center text-[#FCFCFC]">
          新しいパスワードの設定
        </h1>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
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

          <div className="mt-4 text-center">
            <button
              onClick={() => router.push("/loginPage")}
              className="text-blue-400 hover:text-blue-300"
            >
              ログイン画面に戻る
            </button>
          </div>
        </form>

        {message && (
          <p
            className={`mt-4 text-center ${
              message.includes("失敗") ? "text-red-500" : "text-green-500"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default UpdatePassword;
