import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";
import { AuthError } from "@supabase/supabase-js";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      // まずUSER_INFOテーブルでメールアドレスの存在確認
      const { data: userInfo, error: userError } = await supabase
        .from("USER_INFO")
        .select("user_id")
        .eq("email", email)
        .single();

      if (userError || !userInfo) {
        setMessage("このメールアドレスは登録されていません。");
        return;
      }

      // パスワードリセットメールの送信
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/updatePassword#access_token={ACCESS_TOKEN}&refresh_token={REFRESH_TOKEN}&type=recovery`,
      });

      if (error) throw error;

      setMessage(
        "パスワードリセット用のメールを送信しました。\nメールに記載されたリンクからパスワードの再設定を行ってください。"
      );
    } catch (error) {
      console.error("Error:", error);
      setMessage(handleError(error as AuthError | Error));
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
          パスワードリセット
        </h1>

        {message && (
          <p
            className={`mb-4 text-center text-xs whitespace-pre-line leading-relaxed ${
              message.includes("送信しました")
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            {message}
          </p>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              className={inputClassName}
              required
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
            {isLoading ? "送信中..." : "リセットメールを送信"}
          </button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push("/loginPage")}
              className="text-blue-400 hover:text-blue-300"
            >
              ログイン画面に戻る
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const handleError = (error: AuthError | Error) => {
  if (error.message.includes("rate limit")) {
    return "メール送信の制限回数を超えました。\nしばらく待ってから再試行してください。";
  }
  if (error.message.includes("Invalid login credentials")) {
    return "メールの送信に失敗しました。\n時間をおいて再度お試しください。";
  }
  return "エラーが発生しました。\n時間をおいて再度お試しください。";
};

export default ResetPassword;
