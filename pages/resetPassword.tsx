import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${
          window.location.origin
        }/updatePassword?type=recovery&email=${encodeURIComponent(email)}`,
      });

      if (error) {
        setError("パスワードリセットメールの送信に失敗しました。");
      } else {
        setMessage(
          "パスワードリセット用のメールを送信しました。メールをご確認ください。"
        );
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
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.push("/loginPage")}
            className="text-[#FCFCFC] hover:text-blue-300"
          >
            <ArrowBackIcon />
          </button>
          <h1 className="text-xl font-bold text-center text-[#FCFCFC] flex-grow mr-6">
            パスワードリセット
          </h1>
        </div>

        {error && (
          <p className="mb-4 text-red-500 text-sm text-center">{error}</p>
        )}

        {message && (
          <p className="mb-4 text-green-500 text-sm text-center">{message}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
