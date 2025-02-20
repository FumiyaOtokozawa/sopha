// pages/employeePages/empMainPage.tsx

import { useEffect, useState } from "react";
import { supabase } from '../../utils/supabaseClient';
import Header from "../../components/Header";
import { Dialog, Tabs, Tab } from '@mui/material';
import { useRouter } from 'next/router';
import { Box } from '@mui/material';
import FooterMenu from '../../components/FooterMenu';

type HistoryItem = {
  history_id: number;
  emp_no: number;
  change_type: string;
  ciz: number;
  reason: string;
  created_at: string;
};

type EventParticipation = {
  emp_no: number;
  official_count: number;
  unofficial_count: number;
  updated_at: string;
};

type EventParticipationHistory = {
  history_id: number;
  emp_no: number;
  event_id: number;
  participated_at: string;
  EVENT_LIST: {
    title: string;
    genre: '0' | '1';
  };
};

const ITEMS_PER_PAGE = 20;

const EmpMainPage = () => {
  const [employeeNumber, setEmployeeNumber] = useState<number | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [monthlyChange, setMonthlyChange] = useState<number>(0);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [participation, setParticipation] = useState<{
    official_count: number;
    unofficial_count: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'points' | 'events'>('points');
  const [participationHistory, setParticipationHistory] = useState<EventParticipationHistory[]>([]);
  const router = useRouter();

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

      const { data: userData, error: userDataError } = await supabase
        .from("USER_INFO")
        .select("emp_no, login_count")
        .eq("email", user.email)
        .single();

      if (userDataError) {
        console.error("社員情報の取得エラー：", userDataError.message);
        return;
      }

      setEmployeeNumber(userData.emp_no);
      
      if (userData.login_count === 1) {
        setShowProfileDialog(true);
      }
    };

    fetchEmployeeInfo();
  }, []);

  // ポイント情報を取得
  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!employeeNumber) return;

      try {
        const { data, error } = await supabase
          .from("EMP_CIZ")
          .select("total_ciz")
          .eq("emp_no", employeeNumber)
          .single();

        if (error) throw error;
        setPoints(data?.total_ciz ?? 0);
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
        const { data, error } = await supabase
          .from("EMP_CIZ_HISTORY")
          .select("*")
          .eq("emp_no", employeeNumber)
          .order("created_at", { ascending: false })
          .limit(ITEMS_PER_PAGE);

        if (error) throw error;
        setHistoryList(data || []);
      } catch (error) {
        console.error("履歴取得エラー:", error);
      }
    };

    fetchHistory();
  }, [employeeNumber]);

  // 過去1か月間のポイント増減を計算
  useEffect(() => {
    const fetchMonthlyChange = async () => {
      if (!employeeNumber) return;

      try {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const { data, error } = await supabase
          .from("EMP_CIZ_HISTORY")
          .select("change_type, ciz")
          .eq("emp_no", employeeNumber)
          .gte("created_at", oneMonthAgo.toISOString());

        if (error) throw error;

        const totalChange = (data || []).reduce((acc, curr) => {
          return acc + (curr.change_type === "add" ? curr.ciz : -curr.ciz);
        }, 0);

        setMonthlyChange(totalChange);
      } catch (error) {
        console.error("月間増減の取得エラー:", error);
      }
    };

    fetchMonthlyChange();
  }, [employeeNumber]);

  // イベント参加数を取得
  useEffect(() => {
    const fetchParticipation = async () => {
      if (!employeeNumber) return;

      try {
        const { data, error } = await supabase
          .from("EVENT_PARTICIPATION")
          .select("official_count, unofficial_count")
          .eq("emp_no", employeeNumber)
          .single();

        if (error) throw error;
        setParticipation(data || { official_count: 0, unofficial_count: 0 });
      } catch (error) {
        console.error("参加数取得エラー:", error);
      }
    };

    fetchParticipation();
  }, [employeeNumber]);

  // イベント参加履歴を取得
  useEffect(() => {
    const fetchParticipationHistory = async () => {
      if (!employeeNumber) return;

      try {
        const { data, error } = await supabase
          .from("EVENT_PAR_HISTORY")
          .select(`
            *,
            EVENT_LIST(title, genre)
          `)
          .eq("emp_no", employeeNumber)
          .order("participated_at", { ascending: false })
          .limit(ITEMS_PER_PAGE);

        if (error) throw error;
        setParticipationHistory(data || []);
      } catch (error) {
        console.error("参加履歴取得エラー:", error);
      }
    };

    fetchParticipationHistory();
  }, [employeeNumber]);

  return (
    <Box sx={{ pb: 7 }}>
      <Header />
      
      <div className="p-4">
        <div className="w-full max-w-xl mx-auto space-y-4">
          {/* Total Points Card */}
          <div className="bg-[#2f3033] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 text-[#FCFCFC]">Total Points</h2>
            <div className="text-right">
              <div className="text-[#FCFCFC] text-4xl font-bold mb-2">
                {points !== null ? points.toLocaleString() : "..."} <span className="text-2xl">ciz</span>
              </div>
              <div className={`text-sm ${monthlyChange >= 0 ? 'text-green-400' : 'text-red-400'} mb-3`}>
                {monthlyChange >= 0 ? '+' : ''}{monthlyChange.toLocaleString()} since last month
              </div>
              <div className="flex justify-end items-center gap-4 text-sm text-gray-300 border-t border-gray-600 pt-3">
                <div>
                  公式イベント：<span className="font-medium">{participation?.official_count ?? 0}</span>回
                </div>
                <div>
                  非公式イベント：<span className="font-medium">{participation?.unofficial_count ?? 0}</span>回
                </div>
              </div>
            </div>
          </div>

          {/* History Section */}
          <div className="bg-[#2f3033] rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#FCFCFC]">History</h2>
              <Tabs 
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                sx={{
                  minHeight: '32px',
                  '& .MuiTab-root': {
                    minHeight: '32px',
                    padding: '6px 16px',
                    color: '#FCFCFC',
                    fontSize: '0.875rem',
                    textTransform: 'none',
                  },
                  '& .Mui-selected': {
                    color: '#8E93DA !important',
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#8E93DA',
                  },
                }}
              >
                <Tab value="points" label="ポイント履歴" />
                <Tab value="events" label="参加履歴" />
              </Tabs>
            </div>

            {activeTab === 'points' ? (
              // ポイント履歴
              <div className="space-y-4">
                {historyList.length === 0 ? (
                  <p className="text-gray-400">履歴はありません</p>
                ) : (
                  historyList.map((item) => {
                    const isAdd = item.change_type === "add";
                    const sign = isAdd ? "+ " : "- ";
                    const colorClass = isAdd ? "text-green-400" : "text-red-400";

                    return (
                      <div
                        key={item.history_id}
                        className="bg-[#404040] px-4 py-3 rounded-md"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1 mr-4">
                            <p className="text-sm sm:text-base font-medium break-all text-[#FCFCFC] leading-relaxed">
                              {item.reason}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-400 mt-1.5">
                              {formatDate(item.created_at)}
                            </p>
                          </div>
                          <div className={`${colorClass} text-lg sm:text-xl font-bold flex-shrink-0 ml-2`}>
                            {sign}
                            {item.ciz.toLocaleString()} <span className="text-sm sm:text-base font-medium">ciz</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              // イベント参加履歴
              <div className="space-y-4">
                {participationHistory.length === 0 ? (
                  <p className="text-gray-400">参加履歴はありません</p>
                ) : (
                  participationHistory.map((item) => (
                    <div
                      key={item.history_id}
                      className="bg-[#404040] px-4 py-3 rounded-md"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1 mr-4">
                          <p className="text-sm sm:text-base font-medium break-all text-[#FCFCFC] leading-relaxed">
                            {item.EVENT_LIST.title}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-400 mt-1.5">
                            {formatDate(item.participated_at)}
                          </p>
                        </div>
                        <div className={`text-sm font-medium ${
                          item.EVENT_LIST.genre === '1' ? 'text-blue-400' : 'text-green-400'
                        }`}>
                          {item.EVENT_LIST.genre === '1' ? '公式' : '非公式'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* プロフィール設定ダイアログ */}
      <Dialog
        open={showProfileDialog}
        onClose={() => setShowProfileDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <div className="bg-[#2D2D2D] p-6">
          <h2 className="text-xl font-bold mb-4 text-[#FCFCFC]">プロフィール設定</h2>
          <p className="text-[#FCFCFC] mb-4">
            初回ログインありがとうございます。<br />
            プロフィール情報を設定してください。
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => router.push('/employeePages/empProfSettingPage')}
              className="bg-[#8E93DA] text-black px-4 py-2 rounded-md font-bold"
            >
              設定する
            </button>
          </div>
        </div>
      </Dialog>

      <FooterMenu />
    </Box>
  );
};

export default EmpMainPage;
