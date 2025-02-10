// pages/adminPages/admMainPage.tsx

import { useRouter } from "next/router";
import Header from "../../components/Header";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import LogoutIcon from "@mui/icons-material/Logout";

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
  const navigateToLogout = () => {
    router.push("/loginPage");
  };

  // 共通のメニューボタンスタイル
  const menuButtonClassName = {
    wrapper: "w-full", // 親要素の幅に合わせる
    container: `
      bg-[#2f3033] w-full aspect-square
      flex flex-col items-center justify-center 
      rounded-md hover:opacity-90 transition
      text-[min(1.5vw,14px)]
    `,
    icon: { 
      fontSize: 'min(5vw, 40px)',
      color: "#FCFCFC",
      width: 'min(12vw, 60px)',
      height: 'min(12vw,60px)'
    },
    text: "mt-2 text-[#FCFCFC] text-[min(3vw,18px)]"
  };

  return (
    <div>
      {/* ヘッダー（共通部分） */}
      <Header />

      {/* メインコンテンツ */}
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4">管理者メニュー</h2>

        <div className="w-full max-w-xl mx-auto">
          <div className="grid grid-cols-4 gap-2">
            {/* 社員検索 */}
            <button
              onClick={navigateToEmployeeSelectPage}
              className={menuButtonClassName.wrapper}
            >
              <div className={menuButtonClassName.container}>
                <PersonSearchIcon sx={menuButtonClassName.icon} />
                <span className={menuButtonClassName.text}>社員検索</span>
              </div>
            </button>

            {/* 社員追加 */}
            <button
              onClick={navigateToEmployeeAddPage}
              className={menuButtonClassName.wrapper}
            >
              <div className={menuButtonClassName.container}>
                <PersonAddIcon sx={menuButtonClassName.icon} />
                <span className={menuButtonClassName.text}>社員追加</span>
              </div>
            </button>

            {/* イベント管理 */}
            <button
              onClick={navigateToEventManagePage}
              className={menuButtonClassName.wrapper}
            >
              <div className={menuButtonClassName.container}>
                <EditCalendarIcon sx={menuButtonClassName.icon} />
                <span className={menuButtonClassName.text}>イベント管理</span>
              </div>
            </button>

            {/* ログアウト */}
            <button
              onClick={navigateToLogout}
              className={menuButtonClassName.wrapper}
            >
              <div className={menuButtonClassName.container}>
                <LogoutIcon sx={menuButtonClassName.icon} />
                <span className={menuButtonClassName.text}>ログアウト</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdmMainPage;
