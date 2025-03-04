import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import Header from "../../components/Header";
import { format } from "date-fns";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import VerifiedIcon from "@mui/icons-material/Verified";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRouter } from 'next/router';
import type { Event } from '../../types/event';
// @ts-nocheck
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import CategoryIcon from "@mui/icons-material/Category";

const AdmEventSearchPage = () => {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);

  // イベント情報を取得
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("EVENT_LIST")
          .select("*")
          .eq("act_kbn", true)
          .gte("start_date", now)
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

  // 日付のフォーマット関数
  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return "未設定";
    return `${format(new Date(startDate), "yyyy/MM/dd HH:mm")} － ${format(new Date(endDate), "yyyy/MM/dd HH:mm")}`;
  };

  // イベント編集画面に遷移
  const handleEditClick = (eventId: number) => {
    router.push(`/adminPages/admEventEditPage?event_id=${eventId}`);
  };

  return (
    <div className="min-h-screen bg-[#1a1b1e]">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="bg-[#2D2D33] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-white">イベント管理</h2>
            <button className="w-8 h-8 rounded-full bg-[#5b63d3] hover:bg-[#7A7FD1] flex items-center justify-center text-white transition-colors">
              <span className="text-xl">+</span>
            </button>
          </div>

          {/* 検索バー */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="イベント名や場所で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full py-1.5 pl-3 pr-10 bg-[#1D1D21] border border-[#3D3D45] focus:outline-none focus:border-[#8E93DA] text-sm text-white placeholder-gray-400"
                autoFocus
              />
              <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#ACACAC]" fontSize="small" />
            </div>
          </div>

          {loading ? (
            <div className="text-center text-[#ACACAC] text-sm">読み込み中...</div>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map((event) => (
                <div
                  key={event.event_id}
                  className="bg-[#1D1D21] rounded-lg border border-[#3D3D45] hover:border-[#8E93DA] transition-colors"
                >
                  {/* イベントカードヘッダー */}
                  <div className="px-3 py-1 border-b border-[#3D3D45]">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {event.genre === "1" && (
                          <VerifiedIcon 
                            className="w-4 h-4 text-[#8E93DA]" 
                            titleAccess="公式イベント"
                          />
                        )}
                        <div>
                          <h3 className="text-sm font-medium text-white">{event.title}</h3>
                          <span className="text-xs text-[#ACACAC]">ID:{event.event_id}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          className="w-7 h-7 rounded-full text-[#8E93DA] hover:text-[#7A7FD1] hover:bg-[#2D2D33] transition-colors flex items-center justify-center"
                          onClick={() => handleEditClick(event.event_id)}
                        >
                          <EditIcon fontSize="small" />
                        </button>
                        <button className="w-7 h-7 rounded-full text-red-400 hover:text-red-300 hover:bg-[#2D2D33] transition-colors flex items-center justify-center">
                          <DeleteIcon fontSize="small" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* イベント詳細情報 */}
                  <div className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      {/* 日時情報 */}
                      <div className="flex items-center text-[#ACACAC]">
                        <CalendarTodayIcon className="mr-1" fontSize="small" />
                        <span className="text-xs">
                          {formatDateRange(event.start_date, event.end_date)}
                        </span>
                      </div>

                      {/* 場所情報 */}
                      <div className="flex items-center text-[#ACACAC]">
                        <LocationOnIcon className="mr-1" fontSize="small" />
                        <span className="text-xs">{event.place || "場所未設定"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredEvents.length === 0 && (
                <div className="text-center text-[#ACACAC] text-sm py-4">
                  検索結果が見つかりませんでした
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdmEventSearchPage; 