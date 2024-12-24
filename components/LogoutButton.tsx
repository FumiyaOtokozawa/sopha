import { useRouter } from "next/router";
import supabase from "../supabaseClient";
import LogoutIcon from "@mui/icons-material/Logout";

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

  return (
    <button
      className="flex items-center gap-2 text-white"
      onClick={handleLogout}
    >
      <LogoutIcon />
    </button>
  );
};

export default LogoutButton;
