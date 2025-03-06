// pages/employeePages/empMainPage.tsx

import { useEffect, useState, useCallback } from "react";
import { supabase } from '../../utils/supabaseClient';
import { Dialog, Tabs, Tab, Box } from '@mui/material';
import { useRouter } from 'next/router';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

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

  // アニメーション用の値
  const pointsMotionValue = useMotionValue(0);
  const monthlyChangeMotionValue = useMotionValue(0);
  const officialCountMotionValue = useMotionValue(0);
  const unofficialCountMotionValue = useMotionValue(0);

  // アニメーション値の変換
  const animatedPoints = useTransform(pointsMotionValue, (latest) => Math.round(latest).toLocaleString());
  const animatedMonthlyChange = useTransform(monthlyChangeMotionValue, (latest) => {
    const value = Math.round(latest);
    return `${value >= 0 ? '+' : ''}${value.toLocaleString()} since last month`;
  });
  const animatedOfficialCount = useTransform(officialCountMotionValue, (latest) => Math.round(latest));
  const animatedUnofficialCount = useTransform(unofficialCountMotionValue, (latest) => Math.round(latest));

  // アニメーションの実行
  useEffect(() => {
    if (points !== null) {
      pointsMotionValue.set(0);
      animate(pointsMotionValue, points, { duration: 1, ease: "easeOut" });
    }
  }, [points, pointsMotionValue]);

  useEffect(() => {
    monthlyChangeMotionValue.set(0);
    animate(monthlyChangeMotionValue, monthlyChange, { duration: 1, ease: "easeOut" });
  }, [monthlyChange, monthlyChangeMotionValue]);

  useEffect(() => {
    if (participation) {
      officialCountMotionValue.set(0);
      unofficialCountMotionValue.set(0);
      animate(officialCountMotionValue, participation.official_count, { duration: 1, ease: "easeOut" });
      animate(unofficialCountMotionValue, participation.unofficial_count, { duration: 1, ease: "easeOut" });
    }
  }, [participation, officialCountMotionValue, unofficialCountMotionValue]);

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
      position: 'relative',
      width: '100%',
      overflow: 'hidden',
    }}>
      <div>
        <div className="p-4">
          <div className="w-full max-w-xl mx-auto space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-[#2f3033] rounded-lg shadow-md p-4"
            >
              <div className="text-right">
                <div className="text-[#FCFCFC] text-4xl font-bold mb-2">
                  <motion.span>{animatedPoints}</motion.span> <span className="text-2xl">ciz</span>
                </div>
                <div className={`text-sm ${monthlyChange >= 0 ? 'text-green-400' : 'text-red-400'} mb-3`}>
                  <motion.span>{animatedMonthlyChange}</motion.span>
                </div>
                <div className="flex justify-end items-center gap-4 text-sm text-gray-300 border-t border-gray-600 pt-3">
                  <div>
                    公式イベント：<motion.span className="font-medium">{animatedOfficialCount}</motion.span>回
                  </div>
                  <div>
                    有志イベント：<motion.span className="font-medium">{animatedUnofficialCount}</motion.span>回
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-[#2f3033] rounded-lg shadow-md p-4 py-2 flex flex-col"
              style={{ height: 'calc(100vh - 25rem)' }}
            >
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

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent overscroll-contain"
              >
                {activeTab === 'points' ? (
                  <div className="space-y-2">
                    {historyList.length === 0 ? (
                      <p className="text-gray-400">履歴はありません</p>
                    ) : (
                      <>
                        {historyList.map((item, index) => {
                          const isAdd = item.change_type === "add";
                          const sign = isAdd ? "+ " : "- ";
                          const colorClass = isAdd ? "text-green-400" : "text-red-400";

                          return (
                            <motion.div
                              key={`history-${item.history_id}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
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
                            </motion.div>
                          );
                        })}
                        
                        {hasMorePoints && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.3 }}
                            className="flex justify-center mt-4 mb-1"
                          >
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
                          </motion.div>
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
                        {participationHistory.map((item, index) => (
                          <motion.div
                            key={`event-${item.history_id}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
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
                          </motion.div>
                        ))}
                        
                        {hasMoreEvents && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.3 }}
                            className="flex justify-center mt-4 mb-1"
                          >
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
                          </motion.div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          </div>
        </div>

        <Dialog
          open={showProfileDialog}
          onClose={() => setShowProfileDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-[#2D2D2D] p-6"
          >
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
          </motion.div>
        </Dialog>
      </div>
    </Box>
  );
};

export default EmpMainPage;
