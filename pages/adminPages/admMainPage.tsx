// pages/adminPages/admMainPage.tsx

import { useRouter } from "next/router";
import Header from "../../components/Header";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";

const AdmMainPage = () => {
  const router = useRouter();

  const navigateToEmployeeSelectPage = () => {
    router.push("/adminPages/admSearchEmpPage");
  };

  const navigateToEmployeeAddPage = () => {
    router.push("/adminPages/admAddEmpMPage");
  };

  // 今回はイベント管理のバックエンド未実装のため、ただのダミー
  const navigateToEventManagePage = () => {
    alert("イベント管理機能は現在準備中です。");
  };

  return (
    <div>
      {/* ヘッダー（共通部分） */}
      <Header isAdmin={true} />

      {/* メインコンテンツ */}
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4">管理者メニュー</h2>

        {/* アイコン風ボタンたち */}
        <div className="flex space-x-4">
          {/* 社員検索 */}
          <button
            onClick={navigateToEmployeeSelectPage}
            className="flex flex-col items-center gap-1"
          >
            <div className="bg-[#2f3033] w-24 h-24 flex flex-col items-center justify-center rounded shadow-md hover:opacity-90 transition">
              <PersonSearchIcon sx={{ fontSize: 60, color: "#FCFCFC" }} />
            </div>
            <p className="mt-1 text-base">社員検索</p>
          </button>

          {/* 社員追加 */}
          <button
            onClick={navigateToEmployeeAddPage}
            className="flex flex-col items-center gap-1"
          >
            <div className="bg-[#2f3033] w-24 h-24 flex flex-col items-center justify-center rounded shadow-md hover:opacity-90 transition">
              <PersonAddIcon sx={{ fontSize: 60, color: "#FCFCFC" }} />
            </div>
            <p className="mt-1 text-base ">社員追加</p>
          </button>

          {/* イベント管理（未実装） */}
          <button
            onClick={navigateToEventManagePage}
            className="flex flex-col items-center gap-1"
          >
            <div className="bg-[#2f3033] w-24 h-24 flex flex-col items-center justify-center rounded shadow-md hover:opacity-90 transition">
              <EditCalendarIcon sx={{ fontSize: 60, color: "#FCFCFC" }} />
            </div>
            <p className="mt-1 text-base">イベント管理</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdmMainPage;
