import { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, ToolbarProps } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import { ja } from "date-fns/locale";
import { supabase } from "../../utils/supabaseClient";
import React from "react";
import { Box } from "@mui/material";
import AddBoxIcon from "@mui/icons-material/AddBox";
import RepeatIcon from "@mui/icons-material/Repeat";
import EventDetailModal from "../../components/EventDetailModal";
import EventForm from "../../components/EventForm";
import { Event } from "../../types/event";
import { motion, AnimatePresence } from "framer-motion";

// カレンダーのローカライズ設定
const locales = {
  ja: ja,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// 月の英語表記を定義
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// カスタムツールバーコンポーネントの型を修正
const CustomToolbar = ({ onNavigate, date }: ToolbarProps<Event>) => {
  const goToBack = () => {
    onNavigate("PREV");
  };

  const goToNext = () => {
    onNavigate("NEXT");
  };

  const goToCurrent = () => {
    onNavigate("TODAY");
  };

  const label = () => {
    return monthNames[date.getMonth()];
  };

  return (
    <div className="rbc-toolbar">
      <span className="rbc-btn-group">
        <button type="button" onClick={goToBack}>
          前月
        </button>
        <button type="button" onClick={goToCurrent}>
          今日
        </button>
        <button type="button" onClick={goToNext}>
          翌月
        </button>
      </span>
      <span className="rbc-toolbar-label">{label()}</span>
    </div>
  );
};

// カスタムイベントコンポーネントの型定義を追加
interface CustomEventProps {
  event: Event;
}

const CustomEvent = React.memo(function CustomEvent({
  event,
}: CustomEventProps) {
  return (
    <div
      className="text-sm line-clamp-2 overflow-hidden"
      style={{
        fontSize: "0.7rem",
        lineHeight: "1.1",
        maxHeight: "2.2em",
        display: "-webkit-box",
        WebkitLineClamp: "2",
        WebkitBoxOrient: "vertical",
      }}
    >
      {event.title}
    </div>
  );
});

export default function EventListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [showAllEvents, setShowAllEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isFetchingEvents, setIsFetchingEvents] = useState(false); // イベント取得中フラグ
  const [isFilteringEvents, setIsFilteringEvents] = useState(false); // フィルタリング中フラグ
  const [isAddMode, setIsAddMode] = useState(false);
  const [newEvent, setNewEvent] = useState<Event>({
    event_id: 0,
    title: "",
    description: "",
    start_date: format(
      new Date().setHours(0, 0, 0, 0),
      "yyyy-MM-dd'T'HH:mm:ss'+09:00'"
    ),
    end_date: format(
      new Date().setHours(23, 59, 59, 999),
      "yyyy-MM-dd'T'HH:mm:ss'+09:00'"
    ),
    venue_id: 0,
    url: "",
    genre: "",
    format: "",
    manage_member: "",
    owner: "0",
  });

  const eventStyleGetter = React.useCallback(
    (event: Event) => ({
      className: `calendar-event ${
        event.genre === "1" ? "official-event" : "normal-event"
      }`,
    }),
    []
  );

  // キャッシュ用のステート
  const [eventCache, setEventCache] = useState<{
    [key: string]: {
      events: Event[];
      timestamp: number;
      range: { start: string; end: string };
    };
  }>({});

  // キャッシュキーを生成する関数
  const getCacheKey = (date: Date, viewType: "calendar" | "list") => {
    if (viewType === "calendar") {
      // カレンダー表示の場合は年月を含める
      return `${date.getFullYear()}-${date.getMonth()}-${viewType}`;
    } else {
      // リスト表示の場合は現在の日付を含める（日本時間基準）
      const today = new Date();
      return `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}-${viewType}`;
    }
  };

  // isCacheValid 関数をuseCallbackでメモ化
  const isCacheValid = React.useCallback(
    (cacheKey: string, startDate: Date, endDate: Date) => {
      const cache = eventCache[cacheKey];
      if (!cache) return false;

      // キャッシュの有効期限（15分）
      const cacheExpiration = 15 * 60 * 1000;
      const now = Date.now();

      // キャッシュが有効期限切れの場合
      if (now - cache.timestamp > cacheExpiration) {
        console.log("キャッシュが有効期限切れ");
        return false;
      }

      // キャッシュの範囲が要求範囲をカバーしているか確認
      const cacheStart = new Date(cache.range.start);
      const cacheEnd = new Date(cache.range.end);
      const isValid = cacheStart <= startDate && cacheEnd >= endDate;

      console.log("キャッシュ有効性チェック:", {
        キャッシュキー: cacheKey,
        キャッシュ有効: isValid,
        キャッシュ期間: `${format(cacheStart, "yyyy/MM/dd")} - ${format(
          cacheEnd,
          "yyyy/MM/dd"
        )}`,
        要求期間: `${format(startDate, "yyyy/MM/dd")} - ${format(
          endDate,
          "yyyy/MM/dd"
        )}`,
      });

      return isValid;
    },
    [eventCache]
  );

  const fetchEvents = React.useCallback(
    async (date: Date, viewType: "calendar" | "list") => {
      // 既に取得中の場合は実行しない
      if (isFetchingEvents) {
        console.log("イベント取得中のため、リクエストをスキップします");
        return;
      }

      try {
        console.log(
          `イベント取得開始: view=${viewType}, month=${format(
            date,
            "yyyy年MM月",
            { locale: ja }
          )}`
        );
        setIsFetchingEvents(true);

        let startDate: Date;
        let endDate: Date;

        if (viewType === "calendar") {
          // カレンダー表示の場合：当月の1日から末日23:59:59まで
          startDate = new Date(date.getFullYear(), date.getMonth(), 1);
          endDate = new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            0,
            23,
            59,
            59
          );
        } else {
          // 予定リスト表示の場合：システム日付のJST 0時から3ヶ月先まで
          const today = new Date();

          // 現在の日付をJST基準で取得
          // 日本時間の0時に設定する
          // 現在のシステムがすでにJST (+09:00) なので、単純に時間を0時に設定
          today.setHours(0, 0, 0, 0);

          // 当日の0時を開始日時として設定
          startDate = today;

          // 3ヶ月後の日付を計算
          const threeMonthsLater = new Date(today);
          threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
          endDate = threeMonthsLater;

          // 取得期間のログ出力を追加（デバッグ用）
          console.log("イベント取得期間（詳細）:", {
            startDateISO: startDate.toISOString(),
            endDateISO: endDate.toISOString(),
            startDateLocal: startDate.toString(),
            endDateLocal: endDate.toString(),
          });
        }

        // 取得期間のログを出力（簡略化）
        console.log(`イベント取得期間 (${viewType}): `, {
          startDate: format(startDate, "yyyy年MM月dd日 HH:mm:ss", {
            locale: ja,
          }),
          endDate: format(endDate, "yyyy年MM月dd日 HH:mm:ss", { locale: ja }),
        });

        const cacheKey = getCacheKey(date, viewType);

        // キャッシュが有効な場合はキャッシュを使用
        if (isCacheValid(cacheKey, startDate, endDate)) {
          console.log("キャッシュからイベントを取得");
          const cachedEvents = eventCache[cacheKey].events;
          setEvents(cachedEvents);
          return;
        }

        console.log("DBからイベントを取得");
        const { data: eventsFromDB, error } = await supabase
          .from("EVENT_LIST")
          .select(
            `
          *,
          venue:EVENT_VENUE!venue_id(venue_nm)
        `
          )
          .gte("start_date", startDate.toISOString())
          .lte("start_date", endDate.toISOString())
          .eq("act_kbn", true)
          .order("start_date", { ascending: true });

        if (error) throw error;

        // デバッグ用：取得したイベントの日時情報をログ出力
        console.log("取得したイベント数:", eventsFromDB?.length);
        if (eventsFromDB?.length) {
          console.log("最初のイベント:", {
            title: eventsFromDB[0].title,
            start_date: eventsFromDB[0].start_date,
            start_date_formatted: format(
              new Date(eventsFromDB[0].start_date),
              "yyyy年MM月dd日 HH:mm:ss",
              { locale: ja }
            ),
          });

          // 取得したイベントの日付をチェック
          const invalidEvents = eventsFromDB.filter(
            (event) => new Date(event.start_date) < startDate
          );
          if (invalidEvents.length > 0) {
            console.warn(
              "警告: 開始日時より前のイベントが含まれています:",
              invalidEvents.length
            );
            console.warn("例:", {
              title: invalidEvents[0].title,
              start_date: invalidEvents[0].start_date,
              start_date_formatted: format(
                new Date(invalidEvents[0].start_date),
                "yyyy年MM月dd日 HH:mm:ss",
                { locale: ja }
              ),
            });
          }
        }

        // 日付の比較を正確に行うため、JavaScriptのDateオブジェクトを使用してフィルタリング
        // これにより、データベースの日付比較で生じる可能性のある問題を回避
        const filteredEvents = eventsFromDB
          ? eventsFromDB.filter((event) => {
              const eventDate = new Date(event.start_date);
              return eventDate >= startDate;
            })
          : [];

        console.log("フィルタリング後のイベント数:", filteredEvents.length);

        const eventsWithOwner = await Promise.all(
          filteredEvents.map(async (event) => {
            const { data: ownerData } = await supabase
              .from("USER_INFO")
              .select("myoji, namae")
              .eq("emp_no", event.owner)
              .single();

            return {
              ...event,
              venue_nm: event.venue?.venue_nm,
              ownerName: ownerData
                ? `${ownerData.myoji} ${ownerData.namae}`
                : undefined,
            };
          })
        );

        // キャッシュを更新
        setEventCache((prev) => ({
          ...prev,
          [cacheKey]: {
            events: eventsWithOwner,
            timestamp: Date.now(),
            range: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
          },
        }));

        // フィルタリングされたイベントをセット
        setEvents(eventsWithOwner);

        console.log(`イベント取得完了: ${eventsWithOwner.length}件`);
      } catch (error) {
        console.error("イベントの取得に失敗:", error);
      } finally {
        setIsFetchingEvents(false);
      }
    },
    [eventCache, isCacheValid, isFetchingEvents]
  );

  // キャッシュをクリアする関数
  const clearEventCache = () => {
    setEventCache({});
  };

  // 15分ごとにキャッシュをクリア
  useEffect(() => {
    const interval = setInterval(clearEventCache, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 月が変更されたときにイベントを再取得
  const handleMonthChange = (date: Date) => {
    console.log(
      "月が変更されました:",
      format(date, "yyyy年MM月", { locale: ja })
    );
    setCurrentMonth(date);
    // 即座にイベントを再取得
    fetchEvents(date, view);
  };

  // イベントをクリックした時の処理を修正
  const handleEventClick = (event: Event) => {
    console.log("Event clicked:", event);
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  // モーダルを閉じる処理
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  // イベントのフィルタリング関数
  const filterRepeatingEvents = React.useCallback(
    (eventsToFilter: Event[]) => {
      if (showAllEvents) return eventsToFilter;

      // 繰り返しイベントのフィルタリング
      const eventGroups = eventsToFilter.reduce((groups, event) => {
        const groupKey = event.repeat_id
          ? `repeat_${event.repeat_id}`
          : `single_${event.event_id}`;
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(event);
        return groups;
      }, {} as { [key: string]: Event[] });

      const groupedEvents = Object.values(eventGroups).map((group) => {
        if (group.length === 1) return group[0];
        return group.reduce((nearest, event) => {
          if (
            !nearest ||
            new Date(event.start_date) < new Date(nearest.start_date)
          )
            return event;
          return nearest;
        });
      });

      return groupedEvents;
    },
    [showAllEvents]
  );

  // eventsまたはshowAllEventsが変更されたときにフィルタリングを実行
  useEffect(() => {
    if (events.length === 0) {
      setFilteredEvents([]);
      setIsFilteringEvents(false);
      return;
    }

    // フィルタリング開始
    setIsFilteringEvents(true);

    // 非同期処理としてフィルタリングを実行（UIブロックを防止）
    const performFiltering = async () => {
      // 少し遅延を入れて、状態の更新が反映されるようにする
      await new Promise((resolve) => setTimeout(resolve, 10));

      const sorted = [...events].sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );

      const filtered = filterRepeatingEvents(sorted);

      // フィルタリング結果のログ（簡略化）
      console.log("フィルタリング結果:", {
        元のイベント数: events.length,
        フィルタリング後: filtered.length,
        繰り返し表示: showAllEvents ? "すべて表示" : "最初のみ表示",
      });

      setFilteredEvents(filtered);
      setIsFilteringEvents(false);
    };

    performFiltering();
  }, [events, showAllEvents, filterRepeatingEvents]);

  // EventListコンポーネントの表示を改善
  const EventList = () => {
    // ローディング表示
    if (isFilteringEvents || isFetchingEvents) {
      return (
        <div
          className="bg-[#2d2d33] rounded-lg p-4 flex flex-col items-center justify-center"
          style={{ minHeight: "200px" }}
        >
          <div className="w-8 h-8 border-t-2 border-b-2 border-[#8E93DA] rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">読み込み中...</p>
        </div>
      );
    }

    // イベントがない場合
    if (filteredEvents.length === 0) {
      return (
        <div
          className="bg-[#2d2d33] rounded-lg p-4 flex flex-col items-center justify-center"
          style={{ minHeight: "200px" }}
        >
          <p className="text-gray-400">表示するイベントがありません</p>
        </div>
      );
    }

    // イベントを日付ごとにグループ化
    const groupedEvents = filteredEvents.reduce((groups, event) => {
      const date = format(new Date(event.start_date), "yyyy年MM月dd日", {
        locale: ja,
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
      return groups;
    }, {} as { [key: string]: Event[] });

    // 日付でソート
    const sortedDates = Object.keys(groupedEvents).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    return (
      <div className="bg-[#2d2d33] rounded-lg p-2 sm:p-3 md:p-4 h-full overflow-y-auto overflow-x-hidden w-full">
        <div className="mb-2 sm:mb-3 md:mb-4 flex justify-end">
          <button
            className={`px-2 sm:px-3 md:px-4 py-0.5 sm:py-0.75 md:py-1 rounded-md transition-colors text-xs sm:text-sm flex items-center gap-1 sm:gap-2 ${
              !showAllEvents
                ? "bg-[#5b63d3] text-white"
                : "bg-[#37373F] text-gray-400 hover:text-white"
            }`}
            onClick={() => setShowAllEvents(!showAllEvents)}
          >
            <span>繰り返しイベントを非表示</span>
            <div
              className={`w-2.5 sm:w-3 md:w-3.5 h-2.5 sm:h-3 md:h-3.5 rounded-full ${
                !showAllEvents ? "bg-white" : "bg-gray-600"
              }`}
            />
          </button>
        </div>
        <div className="w-full">
          {sortedDates.map((date) => (
            <div key={date} className="mb-4 w-full">
              <div className="sticky top-0 bg-[#2d2d33] py-2 px-4 rounded-md z-10 w-full border-l-4 border-[#8E93DA]">
                <h3 className="text-sm font-medium text-[#8E93DA]">{date}</h3>
              </div>
              <div className="p-2 sm:p-3 md:p-4 bg-[#2d2d33] w-full">
                {groupedEvents[date].map((event) => (
                  <div
                    key={event.event_id}
                    className="mb-2 sm:mb-3 md:mb-4 p-2 sm:p-3 md:p-4 bg-[#37373F] rounded-md sm:rounded-lg cursor-pointer hover:bg-[#404049] transition-colors relative last:mb-0"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="text-base sm:text-lg font-medium mb-1 sm:mb-2 flex items-center gap-1 sm:gap-2">
                      {event.genre === "1" && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 sm:h-5 sm:w-5 text-[#8E93DA]"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      {event.title}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400">
                      <div>場　所：{event.venue_nm || "未定"}</div>
                      <div>主催者：{event.ownerName}</div>
                      <div>
                        時　間：
                        {format(new Date(event.start_date), "HH:mm", {
                          locale: ja,
                        })}{" "}
                        -
                        {format(new Date(event.end_date), " HH:mm", {
                          locale: ja,
                        })}
                      </div>
                    </div>
                    {event.repeat_id && (
                      <div className="absolute bottom-2 right-2">
                        <RepeatIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ビュー切り替え時にイベントを再取得
  const handleViewChange = (newView: "calendar" | "list") => {
    if (view === newView) return; // 同じビューの場合は何もしない

    console.log(`ビュー切り替え: ${view} -> ${newView}`);
    // ビュー切り替え時にフィルタリング中フラグをリセット
    setIsFilteringEvents(true);
    setView(newView);
  };

  // viewまたはcurrentMonthが変更されたときにイベントを取得
  useEffect(() => {
    fetchEvents(currentMonth, view);
  }, [currentMonth, view, fetchEvents]);

  // カレンダー表示用のコンポーネント
  const CalendarView = () => {
    if (isFetchingEvents) {
      return (
        <div
          className="bg-[#2d2d33] rounded-lg p-4 flex flex-col items-center justify-center"
          style={{ minHeight: "200px" }}
        >
          <div className="w-8 h-8 border-t-2 border-b-2 border-[#8E93DA] rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">カレンダーを読み込み中...</p>
        </div>
      );
    }

    return (
      <Calendar<Event>
        localizer={localizer}
        events={events}
        startAccessor={(event) => new Date(event.start_date)}
        endAccessor={(event) => new Date(event.end_date)}
        culture="ja"
        onSelectEvent={handleEventClick}
        defaultView="month"
        views={["month"]}
        onNavigate={handleMonthChange}
        date={currentMonth}
        components={{
          toolbar: CustomToolbar,
          event: CustomEvent, // メモ化したコンポーネントを使用
        }}
        eventPropGetter={eventStyleGetter}
        messages={{
          date: "日付",
          time: "時間",
          event: "イベント",
          allDay: "終日",
          week: "週",
          day: "日",
          month: "月",
          previous: "前へ",
          next: "次へ",
          today: "今日",
          showMore: (total) => `他 ${total} 件`,
        }}
        className="custom-calendar"
        popup={true}
        popupOffset={{ x: 10, y: -20 }}
        length={1} // 1日あたりに表示するイベントの最大数を1件に制限
      />
    );
  };

  // アニメーションのバリアント定義
  const viewVariants = {
    calendar: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    list: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    exitCalendar: {
      opacity: 0,
      x: 50,
      transition: { duration: 0.2, ease: "easeInOut" },
    },
    exitList: {
      opacity: 0,
      x: -50,
      transition: { duration: 0.2, ease: "easeInOut" },
    },
    initialCalendar: {
      opacity: 0,
      x: -50,
      transition: { duration: 0.2 },
    },
    initialList: {
      opacity: 0,
      x: 50,
      transition: { duration: 0.2 },
    },
  };

  // イベント追加モードを開始
  const handleAddEventClick = () => {
    setIsAddMode(true);
  };

  // イベント追加をキャンセル
  const handleAddCancel = () => {
    setIsAddMode(false);
    setNewEvent({
      event_id: 0,
      title: "",
      description: "",
      start_date: format(
        new Date().setHours(0, 0, 0, 0),
        "yyyy-MM-dd'T'HH:mm:ss'+09:00'"
      ),
      end_date: format(
        new Date().setHours(23, 59, 59, 999),
        "yyyy-MM-dd'T'HH:mm:ss'+09:00'"
      ),
      venue_id: 0,
      url: "",
      genre: "",
      format: "",
      manage_member: "",
      owner: "0",
    });
  };

  // イベントを保存
  const handleSaveEvent = async () => {
    try {
      // 現在のユーザー情報を取得
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ユーザー情報が取得できません");

      // ユーザーの社員番号を取得
      const { data: userData } = await supabase
        .from("USER_INFO")
        .select("emp_no")
        .eq("email", user.email)
        .single();

      if (!userData) throw new Error("ユーザー情報が取得できません");

      // イベントIDの最大値を取得
      const { data: maxEventId } = await supabase
        .from("EVENT_LIST")
        .select("event_id")
        .order("event_id", { ascending: false })
        .limit(1)
        .single();

      const newEventId = ((maxEventId?.event_id || 0) + 1).toString();

      // データベースに保存するデータを準備
      // venue_nm を除外して保存用データを作成
      const { venue_nm: _unused, ...eventDataWithoutVenueNm } = newEvent; // eslint-disable-line @typescript-eslint/no-unused-vars
      const eventData = {
        ...eventDataWithoutVenueNm,
        event_id: newEventId,
        owner: userData.emp_no.toString(),
        act_kbn: true,
      };

      // イベントを保存
      const { error: insertError } = await supabase
        .from("EVENT_LIST")
        .insert(eventData);

      if (insertError) throw insertError;

      // キャッシュをクリアして強制的に再取得
      clearEventCache();

      // イベントリストを更新
      await fetchEvents(currentMonth, view);

      // フォームを閉じる
      handleAddCancel();
    } catch (error) {
      console.error("イベントの保存に失敗しました:", error);
      alert("イベントの保存に失敗しました");
    }
  };

  return (
    <Box sx={{ position: "relative", width: "100%", overflow: "hidden" }}>
      <div>
        <div className="p-4">
          {isAddMode ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-[#2D2D33] rounded-lg p-4">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-[#FCFCFC]">
                    イベント追加
                  </h2>
                </div>
                <EventForm
                  event={newEvent}
                  setEvent={setNewEvent}
                  onSave={handleSaveEvent}
                  onCancel={handleAddCancel}
                  mode="create"
                />
              </div>
            </motion.div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mb-4"
              >
                <div className="flex justify-center items-center">
                  <div className="w-full border-b border-gray-600">
                    <div className="flex">
                      <button
                        className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                          view === "calendar"
                            ? "text-[#8E93DA]"
                            : "text-[#FCFCFC] hover:text-gray-300"
                        } relative`}
                        onClick={() => handleViewChange("calendar")}
                      >
                        カレンダー
                        {view === "calendar" && (
                          <motion.span
                            className="absolute bottom-0 left-0 w-full h-0.5 bg-[#8E93DA]"
                            layoutId="activeTab"
                            transition={{ duration: 0.3 }}
                          ></motion.span>
                        )}
                      </button>
                      <button
                        className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                          view === "list"
                            ? "text-[#8E93DA]"
                            : "text-[#FCFCFC] hover:text-gray-300"
                        } relative`}
                        onClick={() => handleViewChange("list")}
                      >
                        予定リスト
                        {view === "list" && (
                          <motion.span
                            className="absolute bottom-0 left-0 w-full h-0.5 bg-[#8E93DA]"
                            layoutId="activeTab"
                            transition={{ duration: 0.3 }}
                          ></motion.span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  height: "calc(100vh - 22rem)",
                  minHeight: "50vh",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <AnimatePresence mode="wait">
                  {view === "calendar" ? (
                    <motion.div
                      key="calendar"
                      initial="initialCalendar"
                      animate="calendar"
                      exit="exitCalendar"
                      variants={viewVariants}
                      style={{ width: "100%", height: "100%" }}
                    >
                      <CalendarView />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      initial="initialList"
                      animate="list"
                      exit="exitList"
                      variants={viewVariants}
                      style={{ width: "100%", height: "100%" }}
                    >
                      <EventList />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4"
              >
                <button
                  onClick={handleAddEventClick}
                  className="w-full py-2 rounded-lg bg-[#5b63d3] text-white font-bold hover:bg-opacity-80 flex items-center justify-center gap-2"
                >
                  <AddBoxIcon />
                  イベント追加
                </button>
              </motion.div>
            </>
          )}
        </div>
      </div>

      <EventDetailModal
        eventId={selectedEvent?.event_id.toString() || ""}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </Box>
  );
}
