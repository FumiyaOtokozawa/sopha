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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      // ログイン成功時にUSER_ROLEテーブルからroleを取得してリダイレクト
      const {
        data: { user },
      } = await supabase.auth.getUser(); // ログインユーザー情報の取得

      if (user) {
        const { data, error: roleError } = await supabase
          .from("USER_ROLE")
          .select("role")
          .eq("user_id", user.id)
          .single(); // USER_ROLEテーブルからroleを取得

        if (roleError) {
          console.error("Role retrieval error:", roleError);
          setError("権限の取得に失敗しました");
        } else {
          // 権限に基づくリダイレクト
          if (data.role === 0) {
            router.push("/employeeMenuPage");
          } else if (data.role === 1) {
            router.push("/adminMenuPage");
          }
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
