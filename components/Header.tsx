// components/Header.tsx

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../utils/supabaseClient";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import HomeIcon from "@mui/icons-material/Home";
import UpdateIcon from "@mui/icons-material/Update";
import { Menu, MenuItem, IconButton, Badge } from "@mui/material";
import { useRouter } from "next/router";
import Image from "next/image";

type UserInfo = {
  emp_no: number;
  myoji: string;
  namae: string;
  role?: string;
  icon_url: string | null;
};

export default function Header() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  // safe-area-inset-topの検出と設定
  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      const safeAreaInsetTop = computedStyle.getPropertyValue("--sait").trim();

      if (safeAreaInsetTop && safeAreaInsetTop !== "0px") {
        document.documentElement.style.setProperty(
          "--header-spacing",
          safeAreaInsetTop
        );
      } else {
        document.documentElement.style.setProperty("--header-spacing", "0px");
      }
    };

    // 初期設定
    document.documentElement.style.setProperty(
      "--sait",
      "env(safe-area-inset-top)"
    );
    updateSafeArea();

    // リサイズ時に再計算
    window.addEventListener("resize", updateSafeArea);
    return () => window.removeEventListener("resize", updateSafeArea);
  }, []);

  // プロフィール更新イベントのリスナーを追加
  useEffect(() => {
    const handleProfileUpdate = (
      event: CustomEvent<{
        myoji: string;
        namae: string;
        icon_url: string | null;
      }>
    ) => {
      if (userInfo) {
        setUserInfo({
          ...userInfo,
          myoji: event.detail.myoji,
          namae: event.detail.namae,
          icon_url: event.detail.icon_url,
        });
      }
    };

    // イベントリスナーを追加
    window.addEventListener(
      "userProfileUpdate",
      handleProfileUpdate as EventListener
    );

    // クリーンアップ関数
    return () => {
      window.removeEventListener(
        "userProfileUpdate",
        handleProfileUpdate as EventListener
      );
    };
  }, [userInfo]); // userInfoが変更されたときにリスナーを再設定

  // 未読数を取得する関数
  const fetchUnreadCount = useCallback(() => {
    try {
      const readNotes = JSON.parse(localStorage.getItem("readNotes") || "[]");
      const allNotes = JSON.parse(
        localStorage.getItem("allUpdateNotes") || "[]"
      );
      const unreadCount = allNotes.filter(
        (noteId: number) => !readNotes.includes(noteId)
      ).length;
      setUnreadCount(unreadCount);
    } catch (error) {
      console.error("未読数の取得に失敗しました:", error);
      setUnreadCount(0);
    }
  }, []);

  // 未読数を更新するイベントリスナーを設定
  useEffect(() => {
    // 初回読み込み時に未読数を取得
    fetchUnreadCount();

    // ローカルストレージの変更を監視
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "readNotes" || e.key === "allUpdateNotes") {
        fetchUnreadCount();
      }
    };

    // イベントリスナーを設定
    window.addEventListener("updateNotesChanged", fetchUnreadCount);
    window.addEventListener("storage", handleStorageChange);

    // コンポーネントのアンマウント時にイベントリスナーを削除
    return () => {
      window.removeEventListener("updateNotesChanged", fetchUnreadCount);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [fetchUnreadCount]);

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

  const handleUpdateNotes = () => {
    router.push("/common/updateNotesPage");
    handleMenuClose();
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // USER_INFOとUSER_ROLEを結合して取得（外部結合）
      const { data, error } = await supabase
        .from("USER_INFO")
        .select(
          `
          emp_no,
          myoji,
          namae,
          icon_url,
          USER_ROLE!left(role)
        `
        )
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
        icon_url: data.icon_url,
        role: data.USER_ROLE?.[0]?.role || "0", // デフォルトは"0"（Employee）
      });
    };

    fetchUserInfo();
  }, []);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex flex-col bg-[#3D3E42] text-white"
        style={{
          paddingTop: "var(--header-spacing, 0px)",
        }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          {/* 左側：ユーザー情報 */}
          <div
            className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push("/employeePages/empProfilePage")}
            role="button"
            aria-label="プロフィールを表示"
          >
            <div className="w-10 h-10 rounded-full mr-3 overflow-hidden bg-[#8E93DA]">
              {userInfo?.icon_url ? (
                <Image
                  src={userInfo.icon_url}
                  alt={`${userInfo.myoji} ${userInfo.namae}のアイコン`}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-base font-medium">
                  {userInfo?.myoji && userInfo?.namae
                    ? `${userInfo.myoji.charAt(0)}${userInfo.namae.charAt(0)}`
                    : ""}
                </div>
              )}
            </div>
            <div>
              <p className="font-bold">
                {userInfo?.myoji && userInfo?.namae
                  ? `${userInfo.myoji} ${userInfo.namae}`
                  : "Loading..."}
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
                sx={{ color: "#FCFCFC" }}
              >
                <HomeIcon />
              </IconButton>
            ) : (
              <>
                <IconButton
                  onClick={handleMenuOpen}
                  className="p-2 hover:bg-[#4A4B50] rounded-full transition-colors"
                  sx={{ color: "#FCFCFC" }}
                >
                  <Badge
                    badgeContent={unreadCount}
                    color="error"
                    sx={{
                      "& .MuiBadge-badge": {
                        backgroundColor: "#5b63d3",
                      },
                    }}
                  >
                    <MenuIcon />
                  </Badge>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      backgroundColor: "#3D3E42",
                      color: "#FCFCFC",
                      mt: 1,
                      "& .MuiMenuItem-root:hover": {
                        backgroundColor: "#4A4B50",
                      },
                    },
                  }}
                >
                  <MenuItem
                    onClick={handleContactPage}
                    className="flex items-center gap-2"
                  >
                    <HelpOutlineIcon
                      fontSize="small"
                      sx={{ color: "#FCFCFC" }}
                    />
                    <span>お問い合わせ/不具合報告</span>
                  </MenuItem>
                  <MenuItem
                    onClick={handleUpdateNotes}
                    className="flex items-center gap-2"
                  >
                    <Badge
                      badgeContent={unreadCount}
                      color="error"
                      sx={{
                        "& .MuiBadge-badge": {
                          backgroundColor: "#5b63d3",
                        },
                      }}
                    >
                      <UpdateIcon fontSize="small" sx={{ color: "#FCFCFC" }} />
                    </Badge>
                    <span>アップデートノート</span>
                  </MenuItem>
                  <MenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2"
                  >
                    <LogoutIcon fontSize="small" sx={{ color: "#FCFCFC" }} />
                    <span>ログアウト</span>
                  </MenuItem>
                </Menu>
              </>
            )}
          </div>
        </div>
      </header>
      {/* ヘッダーの高さ分のスペーサー */}
      <div
        style={{
          height: "calc(76px + var(--header-spacing, 0px))",
          marginTop: 0,
        }}
      ></div>
    </>
  );
}
