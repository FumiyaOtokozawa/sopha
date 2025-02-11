import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import Header from "../../components/Header";
import { format } from "date-fns";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import VerifiedIcon from "@mui/icons-material/Verified";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
// @ts-nocheck
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import CategoryIcon from "@mui/icons-material/Category";

// イベント情報の型定義
type Event = {
  event_id: number;
  title: string;
  place: string | null;
  description: string | null;
  genre: string | null;
  start_date: string | null;
  end_date: string | null;
};

const AdmEventEditPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: number]: boolean }>({});

  // イベント情報を取得
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from("EVENT_LIST")
          .select("*")
          .eq("act_kbn", true)
          .order("start_date", { ascending: true });

        if (error) throw error;
        setEvents(data || []);
        setFilteredEvents(data || []);
      } catch (error) {
        console.error("イベントの取得に失敗しました:", error);
        alert("イベントの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // 検索機能
  useEffect(() => {
    const filtered = events.filter(event => 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.place && event.place.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredEvents(filtered);
  }, [searchQuery, events]);

  // 日付のフォーマット関数を修正
  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return "未設定";
    return `${format(new Date(startDate), "yyyy/MM/dd HH:mm")} － ${format(new Date(endDate), "yyyy/MM/dd HH:mm")}`;
  };

  // 説明文の展開/折りたたみを切り替える関数
  const toggleDescription = (eventId: number) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  return (
    <div>
      <Header />
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">イベント管理</h2>

        {/* 検索バー */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="イベント名や場所で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#2f3033] text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center">読み込み中...</div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {filteredEvents.map((event) => (
              <div
                key={event.event_id}
                className="bg-[#2f3033] rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 text-white"
              >
                {/* イベントカードヘッダー */}
                <div className="px-6 py-3 border-b border-gray-600">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {event.genre === "1" && (
                          <VerifiedIcon 
                            className="w-5 h-5 text-blue-400" 
                            titleAccess="公式イベント"
                          />
                        )}
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold">{event.title}</h3>
                          <span className="text-sm text-gray-400">ID:{event.event_id}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="text-blue-400 hover:text-blue-300 px-3 py-1 rounded text-sm flex items-center gap-1 border border-blue-400">
                          編集
                        </button>
                        <button className="text-red-400 hover:text-red-300 px-3 py-1 rounded text-sm flex items-center gap-1 border border-red-400">
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* イベント詳細情報 */}
                <div className="px-6 py-3">
                  <div className="flex flex-col gap-2">
                    {/* 日時情報 */}
                    <div className="flex items-center text-gray-300">
                      <CalendarTodayIcon className="w-5 h-5 mr-2" />
                      <span className="text-sm">
                        {formatDateRange(event.start_date, event.end_date)}
                      </span>
                    </div>

                    {/* 場所情報 */}
                    <div className="flex items-center text-gray-300">
                      <LocationOnIcon className="w-4 h-4 mr-2" />
                      <span className="text-sm">{event.place || "場所未設定"}</span>
                    </div>
                  </div>

                  {event.description && (
                    <div className="mt-3 text-gray-300 border-t border-gray-600 pt-3">
                      <div className="relative">
                        <p className={`text-sm whitespace-pre-wrap ${!expandedDescriptions[event.event_id] ? 'h-[3em] overflow-hidden' : ''}`}>
                          {event.description}
                        </p>
                        <button
                          onClick={() => toggleDescription(event.event_id)}
                          className="text-gray-500 hover:text-gray-400 text-sm flex items-center gap-1 mt-1"
                        >
                          {expandedDescriptions[event.event_id] ? (
                            <>
                              <KeyboardArrowUpIcon className="w-4 h-4" />
                              <span>折りたたむ</span>
                            </>
                          ) : (
                            <>
                              <KeyboardArrowDownIcon className="w-4 h-4" />
                              <span>続きを読む</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filteredEvents.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                検索結果が見つかりませんでした
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdmEventEditPage; 