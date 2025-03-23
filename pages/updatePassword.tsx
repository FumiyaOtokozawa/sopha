import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";
import { AuthError } from "@supabase/supabase-js";

const UpdatePassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        // ハッシュパラメータの確認
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        // パスワードリセットフローの確認
        if (type !== "recovery" || !accessToken || !refreshToken) {
          console.error("Invalid reset flow");
          router.push("/resetPassword");
          return;
        }

        // セッションの設定を試みる
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error || !data.session) {
          console.error("Session error:", error);
          router.push("/resetPassword");
          return;
        }

        // ユーザー情報の取得
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("User error:", userError);
          router.push("/resetPassword");
          return;
        }

        // USER_INFOテーブルでの確認
        const { data: userInfo, error: userInfoError } = await supabase
          .from("USER_INFO")
          .select("user_id")
          .eq("user_id", user.id)
          .single();

        if (userInfoError || !userInfo) {
          console.error("User info error:", userInfoError);
          router.push("/resetPassword");
          return;
        }
      } catch (error) {
        console.error("Error checking session:", error);
        router.push("/resetPassword");
      }
    };

    checkSession();
  }, [router]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    if (password.length < 8) {
      setMessage("パスワードは8文字以上で入力してください。");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("パスワードが一致しません。");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setMessage("パスワードを更新しました。\nログイン画面に移動します。");

      // セッションをクリアしてログイン画面へ
      await supabase.auth.signOut();
      setTimeout(() => {
        router.push("/loginPage");
      }, 2000);
    } catch (error) {
      console.error("Password update error:", error);
      setMessage(handleError(error as AuthError | Error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (error: AuthError | Error) => {
    if (error.message.includes("auth")) {
      return "認証エラーが発生しました。\nパスワードリセットのリンクから再度アクセスしてください。";
    }
    return "エラーが発生しました。\n時間をおいて再度お試しください。";
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden touch-none">
      <div className="bg-[#FCFCFC19] rounded-lg shadow-md p-8 w-[300px]">
        <h1 className="text-xl font-bold mb-6 text-center text-[#FCFCFC]">
          新しいパスワードの設定
        </h1>

        {message && (
          <p
            className={`mb-4 text-center text-xs whitespace-pre-line leading-relaxed ${
              message.includes("更新しました")
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            {message}
          </p>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="新しいパスワード（8文字以上）"
              className="w-full p-2 rounded-md bg-[#CFD8DC80] text-[#37373F] placeholder-[#37373F] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-[#FCFCFC] [&:not(:placeholder-shown)]:bg-[#FCFCFC]"
              required
              minLength={8}
            />
          </div>

          <div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="新しいパスワード（確認）"
              className="w-full p-2 rounded-md bg-[#CFD8DC80] text-[#37373F] placeholder-[#37373F] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-[#FCFCFC] [&:not(:placeholder-shown)]:bg-[#FCFCFC]"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 rounded-md bg-[#5b63d3] text-white font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50"
          >
            {isLoading ? "更新中..." : "パスワードを更新"}
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

export default UpdatePassword;
