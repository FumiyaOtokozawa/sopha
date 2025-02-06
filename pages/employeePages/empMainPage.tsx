// pages/employeePages/empMainPage.tsx

import { useEffect, useState } from "react";
import { supabase } from '../../utils/supabaseClient';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AddBoxIcon from '@mui/icons-material/AddBox';
import AdminHeader from "../../components/AdminHeader";


type Employee = {
  emp_no: number;
  email: string;
};

type HistoryItem = {
  history_id: number;
  emp_no: number;
  change_type: string;
  ciz: number;
  reason: string;
  created_at: string;
};

const ITEMS_PER_PAGE = 5; // 1ページあたりの表示件数

const EmpMainPage = () => {
  const [employeeNumber, setEmployeeNumber] = useState<number | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 日付表示用フォーマット
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const HH = String(d.getHours()).padStart(2, "0");
    const MM = String(d.getMinutes()).padStart(2, "0");
    const SS = String(d.getSeconds()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd} ${HH}:${MM}:${SS}`;
  };

  // ログインユーザーからemployeeNumberを取得する
  useEffect(() => {
    const fetchEmployeeInfo = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("ユーザー情報の取得に失敗しました:", userError);
        return;
      }

      // USER_INFOからemp_noを取得
      const { data: userData, error: userDataError } = await supabase
        .from("USER_INFO")
        .select("emp_no")
        .eq("email", user.email)
        .single();

      if (userDataError) {
        console.error("社員情報の取得エラー：", userDataError.message);
        return;
      }

      setEmployeeNumber(userData.emp_no);
    };

    fetchEmployeeInfo();
  }, []);

  // 社員情報とポイント情報を取得
  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!employeeNumber) return;

      try {
        const [employeeResponse, pointsResponse] = await Promise.all([
          supabase
            .from("USER_INFO")
            .select("*")
            .eq("emp_no", employeeNumber)
            .single(),
          supabase
            .from("EMP_CIZ")
            .select("total_ciz")
            .eq("emp_no", employeeNumber)
            .single(),
        ]);

        if (employeeResponse.error) throw employeeResponse.error;
        if (pointsResponse.error) throw pointsResponse.error;

        setEmployee(employeeResponse.data);
        setPoints(pointsResponse.data?.total_ciz ?? 0);
      } catch (error) {
        console.error("データ取得エラー:", error);
      }
    };

    fetchEmployeeData();
  }, [employeeNumber]);

  // ポイント履歴を取得
  useEffect(() => {
    const fetchHistory = async () => {
      if (!employeeNumber) return;

      try {
        // 総件数を取得
        const { count: totalRecords } = await supabase
          .from("EMP_CIZ_HISTORY")
          .select("*", { count: "exact" })
          .eq("emp_no", employeeNumber);
        
        setTotalCount(totalRecords || 0);

        // ページに応じたデータを取得
        const { data, error } = await supabase
          .from("EMP_CIZ_HISTORY")
          .select("*")
          .eq("emp_no", employeeNumber)
          .order("created_at", { ascending: false })
          .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

        if (error) throw error;
        setHistoryList(data || []);
      } catch (error) {
        console.error("履歴取得エラー:", error);
      }
    };

    fetchHistory();
  }, [employeeNumber, currentPage]);

  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div>
      <AdminHeader />
      
      <div className="p-4">
        {/* メニューボタン */}
        <div className="w-full max-w-xl mx-auto space-y-8">
          <div className={`bg-[#8E93DA] rounded-md transition-all duration-300 overflow-hidden ${
            isMenuOpen ? 'pb-4' : ''
          }`}>
            {/* メニューヘッダー */}
            <button
              onClick={handleMenuClick}
              className="w-full text-black py-2 font-bold"
            >
              MENU
            </button>

            {/* メニュー展開部分 */}
            <div className={`transition-all duration-300 ${
              isMenuOpen ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'
            }`}>
              <div className="px-4">
                <div className="grid grid-cols-3 gap-4">
                  {/* ポイント履歴 */}
                  <button className="flex flex-col items-center gap-2">
                    <div className="bg-[#404040] w-20 h-20 rounded-md flex items-center justify-center">
                      <CurrencyExchangeIcon sx={{ fontSize: 40, color: "#FCFCFC" }} />
                    </div>
                    <span className="text-black text-sm">ポイント履歴</span>
                  </button>

                  {/* イベント確認 */}
                  <button className="flex flex-col items-center gap-2">
                    <div className="bg-[#404040] w-20 h-20 rounded-md flex items-center justify-center">
                      <CalendarMonthIcon sx={{ fontSize: 40, color: "#FCFCFC" }} />
                    </div>
                    <span className="text-black text-sm">イベント確認</span>
                  </button>

                  {/* イベント追加 */}
                  <button className="flex flex-col items-center gap-2">
                    <div className="bg-[#404040] w-20 h-20 rounded-md flex items-center justify-center">
                      <AddBoxIcon sx={{ fontSize: 40, color: "#FCFCFC" }} />
                    </div>
                    <span className="text-black text-sm">イベント追加</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Total Points Card */}
          <div className="bg-[#2f3033] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 text-[#FCFCFC]">Total Points</h2>
            <div className="text-right">
              <div className="text-[#FCFCFC] text-4xl font-bold mb-2">
                {points !== null ? points.toLocaleString() : "..."} <span className="text-2xl">ciz</span>
              </div>
              <div className="text-green-400 text-sm">
                +50 since last month
              </div>
            </div>
          </div>

          {/* Points History */}
          <div className="bg-[#2f3033] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 text-[#FCFCFC]">Points History</h2>

            {historyList.length === 0 ? (
              <p className="text-gray-400">履歴はありません</p>
            ) : (
              <>
                {/* ページネーションコントロール */}
                <div className="flex justify-center mb-4">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded ${
                      currentPage === 1
                        ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-[#8E93DA] text-black font-bold hover:bg-opacity-90'
                    }`}
                  >
                    Prev
                  </button>
                  <span className="flex items-center mx-4 text-[#FCFCFC]">
                    {currentPage} / {Math.ceil(totalCount / ITEMS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)}
                    className={`px-4 py-2 rounded ${
                      currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)
                        ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-[#8E93DA] text-black font-bold hover:bg-opacity-90'
                    }`}
                  >
                    Next
                  </button>
                </div>

                {/* 履歴リスト */}
                <div>
                  {historyList.map((item) => {
                    const isAdd = item.change_type === "add";
                    const sign = isAdd ? "+ " : "- ";
                    const colorClass = isAdd ? "text-green-400" : "text-red-400";

                    return (
                      <div
                        key={item.history_id}
                        className="flex justify-between items-center bg-[#404040] px-4 py-2 mb-3 rounded-md"
                      >
                        <div>
                          <p className="font-medium text-[#FCFCFC]">{item.reason}</p>
                          <p className="text-sm text-gray-400">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                        <p className={`font-bold ${colorClass}`}>
                          {sign}{item.ciz.toLocaleString()} ciz
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmpMainPage;
