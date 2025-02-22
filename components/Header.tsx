// components/Header.tsx

import { useEffect, useState } from "react";
import { supabase } from '../utils/supabaseClient';
import { useRouter } from 'next/router';
import LogoutButton from './LogoutButton';

type UserInfo = {
  emp_no: number;
  myoji: string;
  namae: string;
  role?: string;
};

export default function Header() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const router = useRouter();

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
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-[#3D3E42] px-6 py-4 text-white">
        {/* 左側：ユーザー情報 */}
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full mr-3 ${
            userInfo?.role === "1" ? 'bg-[#eaad99]' : 'bg-[#8E93DA]'
          }`}></div>
          <div>
            <p className="font-bold">
              {userInfo ? `${userInfo.myoji} ${userInfo.namae}` : "Loading..."}
            </p>
            <p className="text-sm">
              {userInfo ? `No.${userInfo.emp_no}` : ""}
            </p>
          </div>
        </div>

        {/* 右側：LogoutButtonコンポーネントを使用 */}
        <div className="p-2 hover:bg-[#4A4B50] rounded-full transition-colors">
          <LogoutButton />
        </div>
      </header>
      {/* ヘッダーの高さ分のスペーサー */}
      <div className="h-20"></div>
    </>
  );
}
