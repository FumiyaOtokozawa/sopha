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

    // 1.Supabaseでメール・パスワードによる認証
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      console.error("ログインエラー：", signInError.message);
    }

    // 2. ログインに成功したら、認証されたユーザー情報を取得
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("ユーザー情報の取得に失敗しました");
      return;
    }

    // 3.USER_INFOテーブルからemp_noを取得
    const { data: userInfo, error: userInfoError } = await supabase
      .from("USER_INFO")
      .select("emp_no")
      .eq("UID", user.id)
      .single();

    if (userInfoError || !userInfo) {
      console.error("USER_INFO取得エラー：", userInfoError);
      setError("ユーザーの権限情報が見つかりませんでした");
      return;
    }

    const empNo = userInfo.emp_no;
    console.log("取得したempNo：", empNo);

    // 4.USER_ROLEテーブルからroleを取得
    const { data: userRole, error: userRoleError } = await supabase
      .from("USER_ROLE")
      .select("role")
      .eq("UID", user.id)
      .single();

    if (userRoleError || !userRole) {
      console.error("USER_ROLE取得エラー：", userRoleError);
      setError("ユーザーの権限情報が見つかりませんでした");
      return;
    }

    const role = userRole.role;
    console.log("取得したrole：", role);

    // 5.roleに応じてページを振り分ける。
    //   0の場合employee,1の場合admin
    if (role === "0") {
      router.push("/employeePages/empMainPage");
    } else if (role === "1") {
      router.push("/adminPages/admMainPage");
    } else {
      setError("不明な権限です");
      console.warn("想定外のrole：", role);
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
