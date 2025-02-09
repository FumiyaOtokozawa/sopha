// components/Header.tsx

import { useEffect, useState } from "react";
import { supabase } from '../utils/supabaseClient';
import LogoutButton from "./LogoutButton";

type UserInfo = {
  emp_no: number;
  myoji: string;
  namae: string;
  role?: string;
};

type HeaderProps = {
  isAdmin?: boolean;
};

export default function Header({ isAdmin = false }: HeaderProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // USER_INFOとUSER_ROLEを結合して取得
      const { data, error } = await supabase
        .from("USER_INFO")
        .select(`
          emp_no,
          myoji,
          namae,
          USER_ROLE!inner(role)
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
        role: data.USER_ROLE[0]?.role
      });
    };

    fetchUserInfo();
  }, []);

  return (
    <header className="flex items-center justify-between bg-[#3D3E42] px-6 py-4 text-white">
      {/* 左側：ユーザー情報 */}
      <div className="flex items-center">
        {/* アイコンの丸 */}
        <div className={`w-10 h-10 rounded-full mr-3 ${
          userInfo?.role === "1" ? 'bg-[#eaad99]' : 'bg-[#8E93DA]'
        }`}></div>
        {/* 文字情報 */}
        <div>
          <p className="font-bold">
            {userInfo ? (
              isAdmin ? "Admin" : `${userInfo.myoji} ${userInfo.namae}`
            ) : "Loading..."}
          </p>
          <p className="text-sm">
            {userInfo ? `No.${userInfo.emp_no}` : ""}
          </p>
        </div>
      </div>

      {/* 右側：ログアウトなどのボタン */}
      <div>
        <LogoutButton />
      </div>
    </header>
  );
}
