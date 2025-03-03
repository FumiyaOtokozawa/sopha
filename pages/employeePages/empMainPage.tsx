// pages/employeePages/empMainPage.tsx

import { useEffect, useState, useCallback } from "react";
import { supabase } from '../../utils/supabaseClient';
import Header from "../../components/Header";
import { Dialog, Tabs, Tab, Box } from '@mui/material';
import { useRouter } from 'next/router';
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
  const router = useRouter();
  const [employeeNumber, setEmployeeNumber] = useState<number | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [monthlyChange, setMonthlyChange] = useState<number>(0);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [participation, setParticipation] = useState<EventParticipation | null>(null);
  const [activeTab, setActiveTab] = useState<'points' | 'events'>('points');
  const [participationHistory, setParticipationHistory] = useState<EventParticipationHistory[]>([]);
  const [pointsPage, setPointsPage] = useState<number>(1);
  const [eventsPage, setEventsPage] = useState<number>(1);
  const [hasMorePoints, setHasMorePoints] = useState<boolean>(true);
  const [hasMoreEvents, setHasMoreEvents] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  useEffect(() => {
    const fetchEmployeeInfo = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("ユーザー情報の取得に失敗しました:", userError);
        return;
      }

      const { data: userData, error: userDataError } = await supabase
        .from("USER_INFO")
        .select("emp_no, login_count, myoji, namae")
        .eq("email", user.email)
        .single();

      if (userDataError) {
        console.error("社員情報の取得エラー：", userDataError.message);
        return;
      }

      setEmployeeNumber(userData.emp_no);
      if (userData.login_count === 1 && !userData.myoji && !userData.namae) {
        setShowProfileDialog(true);
      }
    };

    fetchEmployeeInfo();
  }, []);

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

  const fetchHistory = useCallback(async (page: number = 1) => {
    if (!employeeNumber) return;

    try {
      setIsLoadingMore(true);
      const { data, error } = await supabase
        .from("EMP_CIZ_HISTORY")
        .select("*")
        .eq("emp_no", employeeNumber)
        .order("created_at", { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (error) throw error;
      
      if (page === 1) {
        setHistoryList(data || []);
      } else {
        setHistoryList(prev => [...prev, ...(data || [])]);
      }
      
      setHasMorePoints(data?.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("履歴取得エラー:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [employeeNumber]);

  useEffect(() => {
    if (employeeNumber) {
      fetchHistory(1);
    }
  }, [employeeNumber, fetchHistory]);

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

  useEffect(() => {
    const fetchParticipation = async () => {
      if (!employeeNumber) return;

      try {
        const { data, error } = await supabase
          .from("EVENT_PARTICIPATION")
          .select("*")
          .eq("emp_no", employeeNumber)
          .single();

        if (error) throw error;
        setParticipation(data || {
          emp_no: employeeNumber,
          official_count: 0,
          unofficial_count: 0,
          updated_at: new Date().toISOString()
        });
      } catch (error) {
        console.error("参加数取得エラー:", error);
      }
    };

    fetchParticipation();
  }, [employeeNumber]);

  const fetchParticipationHistory = async (page: number = 1) => {
    if (!employeeNumber) return;

    try {
      setIsLoadingMore(true);
      const { data, error } = await supabase
        .from("EVENT_PAR_HISTORY")
        .select(`
          *,
          EVENT_LIST(title, genre)
        `)
        .eq("emp_no", employeeNumber)
        .order("participated_at", { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      if (page === 1) {
        setParticipationHistory(data || []);
      } else {
        setParticipationHistory(prev => [...prev, ...(data || [])]);
      }
      
      setHasMoreEvents(data?.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("参加履歴取得エラー:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = async () => {
    if (activeTab === 'points') {
      const nextPage = pointsPage + 1;
      await fetchHistory(nextPage);
      setPointsPage(nextPage);
    } else {
      const nextPage = eventsPage + 1;
      await fetchParticipationHistory(nextPage);
      setEventsPage(nextPage);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: 'points' | 'events') => {
    setActiveTab(newValue);
    if (newValue === 'points') {
      setPointsPage(1);
      fetchHistory(1);
    } else {
      setEventsPage(1);
      fetchParticipationHistory(1);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <Box sx={{ 
      minHeight: '100vh',
      position: 'relative',
      width: '100%',
      overflow: 'hidden',
    }}>
      <div>
        <Header />
        
        <div className="p-4">
          <div className="w-full max-w-xl mx-auto space-y-3">
            <div className="bg-[#2f3033] rounded-lg shadow-md p-4">
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
                    有志イベント：<span className="font-medium">{participation?.unofficial_count ?? 0}</span>回
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#2f3033] rounded-lg shadow-md p-4 py-2 flex flex-col" style={{ height: 'calc(100vh - 25rem)' }}>
              <div className="flex justify-center items-center mb-2">
                <Tabs 
                  value={activeTab}
                  onChange={handleTabChange}
                  variant="fullWidth"
                  sx={{
                    minHeight: '32px',
                    width: '95%',
                    '& .MuiTab-root': {
                      minHeight: '32px',
                      padding: '6px 16px',
                      color: '#FCFCFC',
                      fontSize: '0.875rem',
                      textTransform: 'none',
                      fontWeight: 'medium',
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

              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent overscroll-contain">
                {activeTab === 'points' ? (
                  <div className="space-y-2">
                    {historyList.length === 0 ? (
                      <p className="text-gray-400">履歴はありません</p>
                    ) : (
                      <>
                        {historyList.map((item) => {
                          const isAdd = item.change_type === "add";
                          const sign = isAdd ? "+ " : "- ";
                          const colorClass = isAdd ? "text-green-400" : "text-red-400";

                          return (
                            <div
                              key={`history-${item.history_id}`}
                              className="bg-[#404040] px-3 py-2 rounded-md"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex-1 mr-4">
                                  <p className="text-xs xs:text-sm sm:text-base font-medium break-all text-[#FCFCFC] leading-relaxed">
                                    {item.reason}
                                  </p>
                                  <p className="text-[10px] xs:text-xs sm:text-sm text-gray-400 mt-1.5">
                                    {formatDate(item.created_at)}
                                  </p>
                                </div>
                                <div className={`${colorClass} text-base xs:text-lg sm:text-xl font-bold flex-shrink-0 ml-2`}>
                                  {sign}
                                  {item.ciz.toLocaleString()} <span className="text-xs xs:text-sm sm:text-base font-medium">ciz</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {hasMorePoints && (
                          <div className="flex justify-center mt-4 mb-1">
                            <button
                              onClick={handleLoadMore}
                              disabled={isLoadingMore}
                              className="bg-[#363636] text-[#FCFCFC] py-2.5 rounded-md text-xs xs:text-sm font-medium hover:bg-[#404040] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 w-full"
                            >
                              {isLoadingMore ? (
                                <span className="flex items-center justify-center gap-2">
                                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#FCFCFC] border-t-transparent"></span>
                                  読み込み中
                                </span>
                              ) : (
                                "さらに読み込む"
                              )}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {participationHistory.length === 0 ? (
                      <p className="text-gray-400">参加履歴はありません</p>
                    ) : (
                      <>
                        {participationHistory.map((item) => (
                          <div
                            key={`event-${item.history_id}`}
                            className="bg-[#404040] px-3 py-2 rounded-md"
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1 mr-4">
                                <p className="text-xs xs:text-sm sm:text-base font-medium break-all text-[#FCFCFC] leading-relaxed">
                                  {item.EVENT_LIST.title}
                                </p>
                                <p className="text-[10px] xs:text-xs sm:text-sm text-gray-400 mt-1.5">
                                  {formatDate(item.participated_at)}
                                </p>
                              </div>
                              <div className={`text-xs xs:text-sm font-medium ${
                                item.EVENT_LIST.genre === '1' ? 'text-blue-400' : 'text-green-400'
                              }`}>
                                {item.EVENT_LIST.genre === '1' ? '公式' : '有志'}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {hasMoreEvents && (
                          <div className="flex justify-center mt-4 mb-1">
                            <button
                              onClick={handleLoadMore}
                              disabled={isLoadingMore}
                              className="bg-[#363636] text-[#FCFCFC] py-2.5 rounded-md text-xs xs:text-sm font-medium hover:bg-[#404040] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 w-full"
                            >
                              {isLoadingMore ? (
                                <span className="flex items-center justify-center gap-2">
                                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#FCFCFC] border-t-transparent"></span>
                                  読み込み中
                                </span>
                              ) : (
                                "さらに読み込む"
                              )}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

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
      </div>
    </Box>
  );
};

export default EmpMainPage;
