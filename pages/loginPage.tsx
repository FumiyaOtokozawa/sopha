import { useState } from "react";
import { useRouter } from "next/router";
import supabase from "../supabaseClient";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter(); // ログインのリダイレクト処理

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("ログイン処理開始");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      console.error("ログインエラー：", error.message);
    } else {
      // ログイン成功時にUSER_ROLEテーブルからroleを取得してリダイレクト
      const {
        data: { user },
      } = await supabase.auth.getUser(); // ログインユーザー情報の取得
      console.log("ユーザーID:", user?.id);

      if (user) {
        const { data: linkData, error: linkError } = await supabase
          .from("USER_LINK_EMPLOYEE")
          .select("employee_number")
          .eq("uid", user.id)
          .single();

        console.log(linkData);

        if (linkError || !linkData) {
          console.error("関連データ取得エラー：", linkError);
          setError("関連権限の取得に失敗しました");
          return;
        }

        const employeeNumber = (linkData as { employee_number: number })
          .employee_number;

        // USER_ROLEテーブルからroleを取得
        const { data: roleData, error: roleError } = await supabase
          .from("USER_ROLE")
          .select("role")
          .eq("employee_number", employeeNumber)
          .single();

        if (roleError || !roleData) {
          console.error("Role取得エラー：", roleError);
          setError("権限の取得に失敗しました");
          return;
        }

        const role = roleData.role;
        console.log("取得したrole：", role);

        // 権限に基づくリダイレクト
        if (role === 0) {
          router.push("/employeePages/empMainPage");
        } else if (role === 1) {
          router.push("/adminPages/admMainPage");
        }
      } else {
        setError("ユーザー情報の取得に失敗しました");
      }
    }
  };

  return (
    // 画面中央揃え
    <div className="flex items-center justify-center min-h-screen">
      {/* カード風コンテナ*/}
      <div className="bg-[#FCFCFC19] rounded-lg shadow-md p-8 w-[300px]">
        <h1 className="text-xl font-bold mb-6 text-center text-[#FCFCFC]">
          Welcome to SOPHA
        </h1>

        {/* ログインフォーム */}
        <form onSubmit={handleLogin} className="flex flex-col space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="
              w-full p-2 rounded-md
              bg-[#CFD8DC80] text-[#37373F] placeholder-[#37373F]
              focus:outline-none focus:ring-2 focus:ring-blue-500
              "
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="
              w-full p-2 rounded-md
              bg-[#CFD8DC80] text-[#37373F] placeholder-[#37373F]
              focus:outline-none focus:ring-2 focus:ring-blue-500
              "
          />
          <button
            type="submit"
            className="
              w-full py-2 rounded-md
              bg-[#8E93DA] text-black font-semibold
              hover:bg-opacity-90 transition-colors
              "
          >
            LOGIN
          </button>
        </form>

        {/* エラーがある場合のみ表示 */}
        {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
      </div>
    </div>
  );
};

export default LoginPage;
