import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";
import LogoutIcon from "@mui/icons-material/Logout";

const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = async () => {
    // ログアウト確認ダイアログを表示
    const isConfirmed = window.confirm("ログアウトしてもよろしいですか？");
    
    if (isConfirmed) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("ログアウトエラー：", error.message);
      } else {
        router.push("/loginPage");
      }
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
