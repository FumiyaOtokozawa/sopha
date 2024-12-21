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
    <div>
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Log In</button>
      </form>
      {error && <p>{error}</p>}
    </div>
  );
};

export default LoginPage;
