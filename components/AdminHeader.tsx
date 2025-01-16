// components/AdminHeader.tsx

import LogoutButton from "./LogoutButton";

export default function AdminHeader() {
  return (
    <header className="flex items-center justify-between bg-[#3D3E42] px-6 py-4 text-white">
      {/* 左側：管理者情報 */}
      <div className="flex items-center">
        {/* アイコンの丸*/}
        <div className="w-10 h-10 rounded-full bg-[#eaad99] mr-3"></div>
        {/* 文字情報 */}
        <div>
          <p className="font-bold">Admin</p>
          <p className="text-sm">No.xxx</p>
        </div>
      </div>

      {/* 右側：ログアウトなどのボタン */}
      <div>
        {/* ログアウトボタンを配置 */}
        <LogoutButton />
      </div>
    </header>
  );
}
