// pages/employeePages/empMainPage.tsx

import { useEffect, useState } from "react";
import { supabase } from '../../utils/supabaseClient';
import { Dialog, Tabs, Tab, Box} from '@mui/material';
import { useRouter } from 'next/router';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import EventIcon from '@mui/icons-material/Event';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import EventDetailModal from '../../components/EventDetailModal';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

type HistoryItem = {
  history_id: number;
  emp_no: number;
  change_type: string;
  ciz: number;
  reason: string;
  created_at: string;
  event_id: number;
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
    event_id: number;
  };
};

type ScheduledEvent = {
  entry_id: number;
  emp_no: number;
  event_id: number;
  status: string;
  updated_at: string;
  EVENT_LIST: {
    title: string;
    genre: string;
    event_id: number;
    start_date: string;
    end_date: string;
    venue_id: number;
    venue: {
      venue_nm: string;
    }
  };
};

type TodayEvent = {
  event_id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue_nm: string;
  ownerName?: string;
  genre: '0' | '1';
};

type QueryResult<T> = {
  data: T[];
  nextPage: number | null;
};

const ITEMS_PER_PAGE = 10;

const QUERY_KEYS = {
  HISTORY: 'empCizHistory',
  PARTICIPATION: 'eventParHistory',
  SCHEDULED_EVENTS: 'scheduledEvents',
  TODAY_EVENTS: 'todayEvents',
  MONTHLY_CHANGE: 'monthlyChange',
} as const;

const EmpMainPage = () => {
  const router = useRouter();
  const [employeeNumber, setEmployeeNumber] = useState<number | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [participation, setParticipation] = useState<EventParticipation | null>(null);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'points' | 'events'>('scheduled');
  const [showTodayEventsModal, setShowTodayEventsModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isEventDetailModalOpen, setIsEventDetailModalOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  // CIZ履歴の取得
  const {
    data: historyData,
    fetchNextPage: fetchNextHistory,
    hasNextPage: hasMoreHistory,
    isFetchingNextPage: isLoadingMoreHistory
  } = useInfiniteQuery({
    queryKey: [QUERY_KEYS.HISTORY, employeeNumber],
    queryFn: async ({ pageParam = 0 }): Promise<QueryResult<HistoryItem>> => {
      if (!employeeNumber) return { data: [], nextPage: null };
      
      const from = pageParam * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, error } = await supabase
        .from("EMP_CIZ_HISTORY")
        .select("*")
        .eq("emp_no", employeeNumber)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      return {
        data: data || [],
        nextPage: data?.length === ITEMS_PER_PAGE ? pageParam + 1 : null,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!employeeNumber,
  });

  // イベント参加履歴の取得
  const {
    data: participationData,
    fetchNextPage: fetchNextParticipation,
    hasNextPage: hasMoreParticipation,
    isFetchingNextPage: isLoadingMoreParticipation
  } = useInfiniteQuery({
    queryKey: [QUERY_KEYS.PARTICIPATION, employeeNumber],
    queryFn: async ({ pageParam = 0 }): Promise<QueryResult<EventParticipationHistory>> => {
      if (!employeeNumber) return { data: [], nextPage: null };
      
      const from = pageParam * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, error } = await supabase
        .from("EVENT_PAR_HISTORY")
        .select(`
          *,
          EVENT_LIST(title, genre, event_id)
        `)
        .eq("emp_no", employeeNumber)
        .order("participated_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      return {
        data: data || [],
        nextPage: data?.length === ITEMS_PER_PAGE ? pageParam + 1 : null,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!employeeNumber,
  });

  // スケジュールされたイベントの取得
  const { data: scheduledEvents = [] } = useQuery({
    queryKey: [QUERY_KEYS.SCHEDULED_EVENTS, employeeNumber],
    queryFn: async (): Promise<ScheduledEvent[]> => {
      if (!employeeNumber) return [];
      
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("EVENT_TEMP_ENTRY")
        .select(`
          *,
          EVENT_LIST!inner (
            title,
            genre,
            event_id,
            start_date,
            end_date,
            venue_id,
            venue:EVENT_VENUE!inner (
              venue_nm
            )
          )
        `)
        .eq("emp_no", employeeNumber)
        .eq("status", '1')
        .gte("EVENT_LIST.start_date", now)
        .order("EVENT_LIST(start_date)", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeNumber && activeTab === 'scheduled',
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    gcTime: 0,
    staleTime: 0
  });

  // 本日のイベントの取得
  const { data: todayEvents = [], isLoading: isLoadingTodayEvents } = useQuery({
    queryKey: [QUERY_KEYS.TODAY_EVENTS],
    queryFn: async (): Promise<TodayEvent[]> => {
      const today = new Date();
      today.setHours(9, 0, 0, 0);
      
      const todayEnd = new Date(today);
      todayEnd.setHours(32, 59, 59, 999);

      const { data: events, error } = await supabase
        .from('EVENT_LIST')
        .select(`
          *,
          venue:EVENT_VENUE!venue_id(venue_nm)
        `)
        .gte('start_date', today.toISOString())
        .lte('start_date', todayEnd.toISOString())
        .eq('act_kbn', true)
        .order('start_date', { ascending: true });

      if (error) throw error;

      // イベントの主催者情報を取得
      const eventsWithOwner = await Promise.all(
        (events || []).map(async (event) => {
          const { data: ownerData } = await supabase
            .from('USER_INFO')
            .select('myoji, namae')
            .eq('emp_no', event.owner)
            .single();

          return {
            event_id: event.event_id,
            title: event.title,
            start_date: event.start_date,
            end_date: event.end_date,
            venue_nm: event.venue?.venue_nm,
            ownerName: ownerData ? `${ownerData.myoji} ${ownerData.namae}` : undefined,
            genre: event.genre
          };
        })
      );

      return eventsWithOwner;
    },
    enabled: showTodayEventsModal,
  });

  // 月間変更の取得
  const { data: monthlyChange = 0 } = useQuery({
    queryKey: [QUERY_KEYS.MONTHLY_CHANGE, employeeNumber],
    queryFn: async (): Promise<number> => {
      if (!employeeNumber) return 0;

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const { data, error } = await supabase
        .from("EMP_CIZ_HISTORY")
        .select("change_type, ciz")
        .eq("emp_no", employeeNumber)
        .gte("created_at", oneMonthAgo.toISOString());

      if (error) throw error;

      return (data || []).reduce((acc, curr) => {
        return acc + (curr.change_type === "add" ? curr.ciz : -curr.ciz);
      }, 0);
    },
    enabled: !!employeeNumber,
  });

  // 履歴データの整形
  const historyList = historyData?.pages.flatMap(page => page.data) ?? [];
  const participationHistory = participationData?.pages.flatMap(page => page.data) ?? [];

  // さらに読み込むボタンのハンドラー
  const handleLoadMore = async () => {
    if (activeTab === 'points') {
      await fetchNextHistory();
    } else {
      await fetchNextParticipation();
    }
  };

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
        .select("emp_no, myoji, namae")
        .eq("email", user.email)
        .single();

      if (userDataError) {
        console.error("社員情報の取得エラー：", userDataError.message);
        return;
      }

      setEmployeeNumber(userData.emp_no);
      if (!userData.myoji && !userData.namae) {
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

        monthlyChangeMotionValue.set(0);
        animate(monthlyChangeMotionValue, totalChange, { duration: 1, ease: "easeOut" });
      } catch (error) {
        console.error("月間増減の取得エラー:", error);
      }
    };

    fetchMonthlyChange();
  }, [employeeNumber, monthlyChangeMotionValue]);

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

  // モーダルを開く際にイベントを取得
  const handleOpenTodayEventsModal = () => {
    setShowTodayEventsModal(!showTodayEventsModal);
  };

  // イベント詳細モーダルを開く関数
  const handleOpenEventDetail = (eventId: string) => {
    setSelectedEventId(eventId);
    setIsEventDetailModalOpen(true);
  };

  // イベント詳細モーダルを閉じる関数
  const handleCloseEventDetail = () => {
    setIsEventDetailModalOpen(false);
    setSelectedEventId(null);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: 'scheduled' | 'points' | 'events') => {
    setActiveTab(newValue);
  };

  // カウントダウン計算用の関数
  const calculateTimeRemaining = (startDate: string) => {
    const start = new Date(startDate);
    const diffMs = start.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMs <= 0) {
      return "開催中";
    }
    
    if (diffMs > 24 * 60 * 60 * 1000) {
      return `${diffDays}日前`;
    }
    
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}時間`);
    if (minutes > 0) parts.push(`${minutes}分`);
    parts.push(`${seconds}秒前`);
    
    return parts.join('');
  };

  // 1秒ごとにカウントダウンを更新
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
                  <motion.span>{animatedPoints}</motion.span> <span className="text-2xl">CIZ</span>
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
              className="bg-[#2f3033] rounded-lg shadow-md p-4 py-2 flex flex-col items-center"
            >
              <button
                onClick={handleOpenTodayEventsModal}
                className="w-full py-2.5 px-2.5 bg-[#5b63d3] text-white font-bold rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <EventIcon />
                本日のイベント
                <motion.span
                  animate={{ 
                    scaleY: showTodayEventsModal ? -1 : 1,
                    y: showTodayEventsModal ? -2 : 0
                  }}
                  transition={{ duration: 0.3 }}
                  className="ml-auto"
                >
                  ▼
                </motion.span>
              </button>

              {/* イベントリスト */}
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ 
                  height: showTodayEventsModal ? "auto" : 0,
                  opacity: showTodayEventsModal ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
                className="w-full overflow-hidden"
              >
                {isLoadingTodayEvents ? (
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="w-5 h-5 border-t-2 border-b-2 border-[#8E93DA] rounded-full animate-spin mb-2"></div>
                    <p className="text-gray-400 text-xs">読み込み中...</p>
                  </div>
                ) : todayEvents.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-xs">本日開催予定のイベントはありません</p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {todayEvents.map((event) => (
                      <div
                        key={event.event_id}
                        className="bg-[#37373F] p-2.5 rounded-md transition-colors cursor-pointer"
                        onClick={() => handleOpenEventDetail(event.event_id.toString())}
                      >
                        <div className="flex items-center gap-2">
                          {event.genre === '1' && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-[#8E93DA]" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className="text-[#FCFCFC] text-sm font-medium">{event.title}</span>
                          <span className="text-xs text-gray-400 ml-auto">
                            {format(new Date(event.start_date), 'HH:mm', { locale: ja })} - 
                            {format(new Date(event.end_date), ' HH:mm', { locale: ja })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-[#2f3033] rounded-lg shadow-md p-4 py-2 flex flex-col"
              style={{ height: 'calc(100vh - 30rem)' }}
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
                  <Tab value="scheduled" label="参加予定" />
                  <Tab value="points" label="CIZ履歴" />
                  <Tab value="events" label="参加履歴" />
                </Tabs>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent overscroll-contain"
              >
                {activeTab === 'scheduled' ? (
                  <div className="space-y-2">
                    {scheduledEvents.length === 0 ? (
                      <p className="text-gray-400">参加予定のイベントはありません</p>
                    ) : (
                      scheduledEvents.map((event, index) => (
                        <motion.div
                          key={`scheduled-${event.entry_id}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="bg-[#404040] px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-[#454545]"
                          onClick={() => handleOpenEventDetail(event.EVENT_LIST.event_id.toString())}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1 mr-4">
                              <p className="text-xs xs:text-sm sm:text-base font-medium break-all text-[#FCFCFC] leading-relaxed">
                                {event.EVENT_LIST.title}
                              </p>
                              <p className="text-[10px] xs:text-xs sm:text-sm text-gray-400 mt-1.5">
                                {format(new Date(event.EVENT_LIST.start_date), 'yyyy年MM月dd日 HH:mm', { locale: ja })} - 
                                {format(new Date(event.EVENT_LIST.end_date), ' HH:mm', { locale: ja })}
                              </p>
                            </div>
                            <div className="flex flex-col items-end">
                              <div className="text-xs xs:text-sm font-medium text-yellow-400 flex items-center justify-end">
                                <span className="font-mono tracking-wider tabular-nums whitespace-nowrap">
                                  {calculateTimeRemaining(event.EVENT_LIST.start_date)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                ) : activeTab === 'points' ? (
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
                              className="bg-[#404040] px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-[#454545]"
                              onClick={() => handleOpenEventDetail(item.event_id.toString())}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex-1 mr-4">
                                  <p className="text-xs xs:text-sm sm:text-base font-medium break-all text-[#FCFCFC] leading-relaxed">
                                    {item.reason}
                                  </p>
                                  <p className="text-[10px] xs:text-xs sm:text-sm text-gray-400 mt-1.5">
                                    {format(new Date(item.created_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                                  </p>
                                </div>
                                <div className={`${colorClass} text-base xs:text-lg sm:text-xl font-bold flex-shrink-0 ml-2 flex items-center`}>
                                  {sign}
                                  {item.ciz.toLocaleString()} <span className="text-xs xs:text-sm sm:text-base font-medium ml-1">ciz</span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                        
                        {hasMoreHistory && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.3 }}
                            className="flex justify-center mt-4 mb-1"
                          >
                            <button
                              onClick={handleLoadMore}
                              disabled={isLoadingMoreHistory}
                              className="bg-[#363636] text-[#FCFCFC] py-2.5 rounded-md text-xs xs:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 w-full hover:bg-[#404040]"
                            >
                              {isLoadingMoreHistory ? (
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
                      <p className="text-gray-400">履歴はありません</p>
                    ) : (
                      <>
                        {participationHistory.map((item, index) => (
                          <motion.div
                            key={`event-${item.history_id}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="bg-[#404040] px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-[#454545]"
                            onClick={() => handleOpenEventDetail(item.EVENT_LIST.event_id.toString())}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1 mr-4">
                                <p className="text-xs xs:text-sm sm:text-base font-medium break-all text-[#FCFCFC] leading-relaxed">
                                  {item.EVENT_LIST.title}
                                </p>
                                <p className="text-[10px] xs:text-xs sm:text-sm text-gray-400 mt-1.5">
                                  {format(new Date(item.participated_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                                </p>
                              </div>
                              <div className={`text-xs xs:text-sm font-medium px-2.5 py-1 rounded-full ${
                                item.EVENT_LIST.genre === '1' 
                                  ? 'bg-blue-400/20 text-blue-400' 
                                  : 'bg-green-400/20 text-green-400'
                              }`}>
                                {item.EVENT_LIST.genre === '1' ? '公式' : '有志'}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        
                        {hasMoreParticipation && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.3 }}
                            className="flex justify-center mt-4 mb-1"
                          >
                            <button
                              onClick={handleLoadMore}
                              disabled={isLoadingMoreParticipation}
                              className="bg-[#363636] text-[#FCFCFC] py-2.5 rounded-md text-xs xs:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 w-full hover:bg-[#404040]"
                            >
                              {isLoadingMoreParticipation ? (
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
            <h2 className="text-xl font-bold mb-2 text-[#FCFCFC]">プロフィール設定</h2>
            <p className="text-sm text-[#FCFCFC] mb-3">
              初回ログインありがとうございます。<br />
              プロフィール情報を設定してください。
            </p>
            <div>
              <button
                onClick={() => router.push('/employeePages/empProfSettingPage')}
                className="w-full bg-[#5b63d3] text-white px-4 py-2 rounded-md font-bold"
              >
                設定する
              </button>
            </div>
          </motion.div>
        </Dialog>

        {/* イベント詳細モーダル */}
        <EventDetailModal
          isOpen={isEventDetailModalOpen}
          onClose={handleCloseEventDetail}
          eventId={selectedEventId || ''}
        />
      </div>
    </Box>
  );
};

export default EmpMainPage;
