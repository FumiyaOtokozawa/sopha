// components/Header.tsx

import { useEffect, useState } from "react";
import { supabase } from '../utils/supabaseClient';
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import HomeIcon from "@mui/icons-material/Home";
import CloseIcon from "@mui/icons-material/Close";
import { Menu, MenuItem, IconButton } from "@mui/material";
import { useRouter } from "next/router";

// iOS Safariのnavigator型を拡張
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

type UserInfo = {
  emp_no: number;
  myoji: string;
  namae: string;
  role?: string;
};

export default function Header() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showPWAPrompt, setShowPWAPrompt] = useState(false);
  const open = Boolean(anchorEl);
  const router = useRouter();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

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
    handleMenuClose();
  };

  const handleContactPage = () => {
    router.push("/common/contactBugReportPage");
    handleMenuClose();
  };

  const handleHomeClick = () => {
    router.push("/adminPages/admMainPage");
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // USER_INFOとUSER_ROLEを結合して取得（外部結合）
      const { data, error } = await supabase
        .from("USER_INFO")
        .select(`
          emp_no,
          myoji,
          namae,
          USER_ROLE!left(role)
        `)
        .eq("email", user.email)
        .single();

      if (error) {
        console.error("ユーザー情報の取得エラー:", error);
        return;
      }

      setUserInfo({
        emp_no: data.emp_no,
        myoji: data.myoji,
        namae: data.namae,
        role: data.USER_ROLE?.[0]?.role || "0" // デフォルトは"0"（Employee）
      });
    };

    fetchUserInfo();

    // PWAがインストールされているかどうかを確認
    const isPWAInstalled = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (window.navigator as NavigatorWithStandalone).standalone === true;

    // PWAがインストールされていない場合は常にメッセージを表示
    if (!isPWAInstalled) {
      setShowPWAPrompt(true);
    }
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex flex-col bg-[#3D3E42] text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between px-6 py-4">
          {/* 左側：ユーザー情報 */}
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full mr-3 ${
              userInfo?.role === "1" ? 'bg-[#eaad99]' : 'bg-[#8E93DA]'
            }`}></div>
            <div>
              <p className="font-bold">
                {userInfo ? `${userInfo.myoji} ${userInfo.namae}` : "Loading..."}
              </p>
              <p className="text-sm text-[#FCFCFC]">
                {userInfo ? `No.\u2068${userInfo.emp_no}\u2069` : ""}
              </p>
            </div>
          </div>

          {/* 右側：ハンバーガーメニューまたはホームボタン */}
          <div>
            {userInfo?.role === "1" ? (
              <IconButton
                onClick={handleHomeClick}
                className="p-2 hover:bg-[#4A4B50] rounded-full transition-colors"
                sx={{ color: '#FCFCFC' }}
              >
                <HomeIcon />
              </IconButton>
            ) : (
              <>
                <IconButton
                  onClick={handleMenuOpen}
                  className="p-2 hover:bg-[#4A4B50] rounded-full transition-colors"
                  sx={{ color: '#FCFCFC' }}
                >
                  <MenuIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      backgroundColor: '#3D3E42',
                      color: '#FCFCFC',
                      mt: 1,
                      '& .MuiMenuItem-root:hover': {
                        backgroundColor: '#4A4B50',
                      },
                    },
                  }}
                >
                  <MenuItem onClick={handleContactPage} className="flex items-center gap-2">
                    <HelpOutlineIcon fontSize="small" sx={{ color: '#FCFCFC' }} />
                    <span>お問い合わせ/不具合報告</span>
                  </MenuItem>
                  <MenuItem onClick={handleLogout} className="flex items-center gap-2">
                    <LogoutIcon fontSize="small" sx={{ color: '#FCFCFC' }} />
                    <span>ログアウト</span>
                  </MenuItem>
                </Menu>
              </>
            )}
          </div>
        </div>

        {/* PWAインストールプロンプト */}
        {showPWAPrompt && (
          <div className="bg-[#5b63d3] p-2 relative">
            <div className="container mx-auto relative">
              <button 
                onClick={() => setShowPWAPrompt(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                aria-label="閉じる"
              >
                <CloseIcon fontSize="small" />
              </button>
              <p className="text-xs text-center pr-8">
                SOPHAをホーム画面に追加すると、より快適に利用できます<br/>
                ※ブラウザで利用するとレイアウトが崩れる可能性があります
              </p>
            </div>
          </div>
        )}
      </header>
      {/* ヘッダーの高さ分のスペーサー */}
      <div className="h-20" style={{ marginTop: 'env(safe-area-inset-top)' }}></div>
    </>
  );
}
