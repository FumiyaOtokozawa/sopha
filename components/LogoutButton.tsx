import { useRouter } from "next/router";
import supabase from "../supabaseClient";

const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut(); // ログアウト処理
    if (error) {
      console.error("ログアウトエラー：", error.message);
    } else {
      router.push("/loginPage");
    }
  };

  return <button onClick={handleLogout}>ログアウト</button>;
};

export default LogoutButton;
