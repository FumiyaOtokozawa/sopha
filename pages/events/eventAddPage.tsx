import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";
import { useRouter } from "next/router";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ja } from "date-fns/locale";
import { Box } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import PlaceSelectModal from "../../components/PlaceSelectModal";
import UserSelectModal from "../../components/UserSelectModal";
import type { User } from "../../types/user";

interface EventForm {
  title: string;
  start: Date | null;
  end: Date | null;
  venue_id: number | null;
  venue_nm: string;
  description?: string;
  genre: string;
  isRecurring: boolean;
  recurringType: string;
  recurringEndDate: Date | null;
  format: "offline" | "online" | "hybrid";
  url?: string;
  participants: User[];
}

const EventAddPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<EventForm>({
    title: "",
    start: null,
    end: null,
    venue_id: null,
    venue_nm: "",
    description: "",
    genre: "0",
    isRecurring: false,
    recurringType: "weekly",
    recurringEndDate: null,
    format: "offline",
    url: "",
    participants: [],
  });
  const [error, setError] = useState<string>("");
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // クエリパラメータから初期値を設定
  useEffect(() => {
    if (
      router.query.title ||
      router.query.description ||
      router.query.start_date ||
      router.query.end_date
    ) {
      setFormData((prev) => ({
        ...prev,
        title: (router.query.title as string) || prev.title,
        description: (router.query.description as string) || prev.description,
        start: router.query.start_date
          ? new Date(router.query.start_date as string)
          : prev.start,
        end: router.query.end_date
          ? new Date(router.query.end_date as string)
          : prev.end,
      }));
    }
  }, [router.query]);

  // ポータル用のdivをマウント時に作成
  useEffect(() => {
    const portalRoot = document.createElement("div");
    portalRoot.setAttribute("id", "date-picker-portal");
    document.body.appendChild(portalRoot);
    return () => {
      document.body.removeChild(portalRoot);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !formData.title ||
      !formData.start ||
      !formData.end ||
      !formData.venue_id
    ) {
      setError("必須項目を入力してください");
      return;
    }

    if (formData.isRecurring && !formData.recurringEndDate) {
      setError("繰り返し終了日を設定してください");
      return;
    }

    const startDate = formData.start;
    const endDate = formData.end;

    if (startDate >= endDate) {
      setError("終了日時は開始日時より後に設定してください");
      return;
    }

    if (
      formData.isRecurring &&
      formData.recurringEndDate &&
      formData.recurringEndDate < endDate
    ) {
      setError("繰り返し終了日はイベント終了日より後に設定してください");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ユーザー情報が取得できません");

      // ユーザーのemp_noを取得
      const { data: userData, error: userError } = await supabase
        .from("USER_INFO")
        .select("emp_no")
        .eq("email", user.email)
        .single();

      if (userError) throw new Error("ユーザー情報の取得に失敗しました");

      // 繰り返しイベントの作成
      if (
        formData.isRecurring &&
        formData.start &&
        formData.end &&
        formData.recurringEndDate
      ) {
        // 新しいrepeat_idを生成（タイムスタンプを使用）
        const repeat_id = Date.now();

        // 最大のevent_idを取得
        const { data: maxEventData, error: maxEventError } = await supabase
          .from("EVENT_LIST")
          .select("event_id")
          .order("event_id", { ascending: false })
          .limit(1);

        if (maxEventError) throw new Error("イベントIDの取得に失敗しました");

        let nextEventId =
          maxEventData && maxEventData.length > 0
            ? maxEventData[0].event_id + 1
            : 1;

        const events = [];
        let currentStart = new Date(formData.start.getTime());
        let currentEnd = new Date(formData.end.getTime());
        const endDate = new Date(formData.recurringEndDate.getTime());

        // 自分自身（ログインユーザー）を除外した運営メンバーリストを作成
        const filteredParticipants = formData.participants.filter(
          (p) => p.emp_no !== userData.emp_no
        );
        // 社員番号をカンマ区切りのテキストに変換
        const memberString =
          filteredParticipants.length > 0
            ? filteredParticipants.map((p) => p.emp_no).join(",") + ","
            : "";

        while (currentStart <= endDate) {
          events.push({
            event_id: nextEventId++,
            title: formData.title,
            start_date: new Date(
              currentStart.getTime() - currentStart.getTimezoneOffset() * 60000
            ).toISOString(),
            end_date: new Date(
              currentEnd.getTime() - currentEnd.getTimezoneOffset() * 60000
            ).toISOString(),
            venue_id: formData.venue_id,
            description: formData.description,
            owner: userData.emp_no,
            created_by: userData.emp_no,
            updated_by: userData.emp_no,
            act_kbn: true,
            genre: formData.genre,
            repeat_id: repeat_id,
            format: formData.format,
            url: formData.url,
            manage_member: memberString,
          });

          // 次の日付を計算
          if (formData.recurringType === "daily") {
            currentStart = new Date(
              currentStart.setDate(currentStart.getDate() + 1)
            );
            currentEnd = new Date(currentEnd.setDate(currentEnd.getDate() + 1));
          } else if (formData.recurringType === "weekly") {
            currentStart = new Date(
              currentStart.setDate(currentStart.getDate() + 7)
            );
            currentEnd = new Date(currentEnd.setDate(currentEnd.getDate() + 7));
          } else if (formData.recurringType === "monthly") {
            currentStart = new Date(
              currentStart.setMonth(currentStart.getMonth() + 1)
            );
            currentEnd = new Date(
              currentEnd.setMonth(currentEnd.getMonth() + 1)
            );
          }
        }

        // 一括登録
        for (const event of events) {
          const { error: insertError } = await supabase
            .from("EVENT_LIST")
            .insert(event);

          if (insertError) throw insertError;
        }
      } else {
        // 新しいイベントIDを設定（既存の最大値 + 1）
        const { data: maxEventData, error: maxEventError } = await supabase
          .from("EVENT_LIST")
          .select("event_id")
          .order("event_id", { ascending: false })
          .limit(1);

        if (maxEventError) throw new Error("イベントIDの取得に失敗しました");

        // 自分自身（ログインユーザー）を除外した運営メンバーリストを作成
        const filteredParticipants = formData.participants.filter(
          (p) => p.emp_no !== userData.emp_no
        );
        // 社員番号をカンマ区切りのテキストに変換
        const memberString =
          filteredParticipants.length > 0
            ? filteredParticipants.map((p) => p.emp_no).join(",") + ","
            : "";

        const eventData = {
          event_id:
            maxEventData && maxEventData.length > 0
              ? maxEventData[0].event_id + 1
              : 1,
          title: formData.title,
          start_date: startDate
            ? new Date(
                startDate.getTime() - startDate.getTimezoneOffset() * 60000
              ).toISOString()
            : null,
          end_date: endDate
            ? new Date(
                endDate.getTime() - endDate.getTimezoneOffset() * 60000
              ).toISOString()
            : null,
          venue_id: formData.venue_id,
          description: formData.description,
          owner: userData.emp_no,
          created_by: userData.emp_no,
          updated_by: userData.emp_no,
          act_kbn: true,
          genre: formData.genre,
          repeat_id: null,
          format: formData.format,
          url: formData.url,
          manage_member: memberString,
        };

        const { error: insertError } = await supabase
          .from("EVENT_LIST")
          .insert(eventData);

        if (insertError) throw insertError;
      }

      router.push("/events/eventListPage");
    } catch (err) {
      setError("イベントの登録に失敗しました");
      console.error(err);
    }
  };

  // 日付選択時のハンドラーを追加
  const handleRecurringEndDateChange = (date: Date | null) => {
    if (date) {
      // 選択された日の23:59:59に設定
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      setFormData({ ...formData, recurringEndDate: endOfDay });
    } else {
      setFormData({ ...formData, recurringEndDate: null });
    }
  };

  // 場所選択時のハンドラーを追加
  const handlePlaceSelect = (venue: { id: number; name: string }) => {
    setFormData({
      ...formData,
      venue_id: venue.id,
      venue_nm: venue.name,
    });
  };

  // ユーザー選択時のハンドラーを追加
  const handleUserSelect = (user: User) => {
    // 既に追加されているユーザーは追加しない
    if (!formData.participants.some((p) => p.emp_no === user.emp_no)) {
      setFormData({
        ...formData,
        participants: [...formData.participants, user],
      });
    }
  };

  // 参加者削除のハンドラーを追加
  const handleRemoveParticipant = (empNo: number) => {
    setFormData({
      ...formData,
      participants: formData.participants.filter((p) => p.emp_no !== empNo),
    });
  };

  return (
    <Box sx={{ pb: 7 }} component="div" role="main">
      <div className="p-4 mb-[30px]">
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
          <div
            className="bg-[#2D2D33] rounded-lg p-4 space-y-3"
            role="region"
            aria-label="イベント登録フォーム"
          >
            {/* イベント種別と開催形式を横並びに */}
            <div className="grid grid-cols-2 gap-3">
              {/* イベント種別 */}
              <div>
                <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                  イベント種別<span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.genre}
                  onChange={(e) =>
                    setFormData({ ...formData, genre: e.target.value })
                  }
                  className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
                  required
                >
                  <option value="0">有志イベント</option>
                  <option value="1">公式イベント</option>
                </select>
              </div>

              {/* 開催形式 */}
              <div>
                <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                  開催形式<span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.format}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      format: e.target.value as "offline" | "online" | "hybrid",
                    })
                  }
                  className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
                  required
                >
                  <option value="offline">オフライン</option>
                  <option value="online">オンライン</option>
                  <option value="hybrid">ハイブリッド</option>
                </select>
              </div>
            </div>

            {/* タイトル */}
            <div>
              <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                タイトル<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
                required
              />
            </div>

            {/* 日時選択 */}
            <div className="flex flex-row gap-3 w-full">
              <div className="w-1/2">
                <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                  開始日時<span className="text-red-500">*</span>
                </label>
                <LocalizationProvider
                  dateAdapter={AdapterDateFns}
                  adapterLocale={ja}
                >
                  <DateTimePicker
                    value={formData.start}
                    onChange={(date) =>
                      setFormData({ ...formData, start: date })
                    }
                    sx={{
                      width: "100%",
                      "& .MuiInputBase-root": {
                        backgroundColor: "#1D1D21",
                        color: "#FCFCFC",
                        height: "40px",
                        fontSize: "14px",
                      },
                      "& .MuiInputBase-input": {
                        padding: "8px 8px",
                        height: "24px",
                        "&::placeholder": {
                          color: "#6B7280",
                          opacity: 1,
                          fontSize: "12px",
                        },
                      },
                      "& .MuiSvgIcon-root": {
                        color: "#FCFCFC",
                        fontSize: "20px",
                      },
                    }}
                  />
                </LocalizationProvider>
              </div>
              <div className="w-1/2">
                <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                  終了日時<span className="text-red-500">*</span>
                </label>
                <LocalizationProvider
                  dateAdapter={AdapterDateFns}
                  adapterLocale={ja}
                >
                  <DateTimePicker
                    value={formData.end}
                    onChange={(date) => setFormData({ ...formData, end: date })}
                    sx={{
                      width: "100%",
                      "& .MuiInputBase-root": {
                        backgroundColor: "#1D1D21",
                        color: "#FCFCFC",
                        height: "40px",
                        fontSize: "14px",
                      },
                      "& .MuiInputBase-input": {
                        padding: "8px 8px",
                        height: "24px",
                        "&::placeholder": {
                          color: "#6B7280",
                          opacity: 1,
                          fontSize: "12px",
                        },
                      },
                      "& .MuiSvgIcon-root": {
                        color: "#FCFCFC",
                        fontSize: "20px",
                      },
                    }}
                  />
                </LocalizationProvider>
              </div>
            </div>

            {/* 繰り返し設定 - 日時選択の下に移動 */}
            <div>
              <label className="flex items-center text-xs font-medium text-[#ACACAC]">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) =>
                    setFormData({ ...formData, isRecurring: e.target.checked })
                  }
                  className="mr-2"
                />
                繰り返し設定
              </label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                    繰り返しタイプ
                  </label>
                  <select
                    value={formData.recurringType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurringType: e.target.value,
                      })
                    }
                    className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
                  >
                    <option value="daily">毎日</option>
                    <option value="weekly">毎週</option>
                    <option value="monthly">毎月</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                    繰り返し終了日<span className="text-red-500">*</span>
                  </label>
                  <LocalizationProvider
                    dateAdapter={AdapterDateFns}
                    adapterLocale={ja}
                  >
                    <DatePicker
                      value={formData.recurringEndDate}
                      onChange={handleRecurringEndDateChange}
                      sx={{
                        width: "100%",
                        "& .MuiInputBase-root": {
                          backgroundColor: "#1D1D21",
                          color: "#FCFCFC",
                          height: "40px",
                          fontSize: "14px",
                        },
                        "& .MuiInputBase-input": {
                          padding: "8px 14px",
                          height: "24px",
                          "&::placeholder": {
                            color: "#6B7280",
                            opacity: 1,
                            fontSize: "14px",
                          },
                        },
                        "& .MuiSvgIcon-root": {
                          color: "#FCFCFC",
                          fontSize: "20px",
                        },
                      }}
                    />
                  </LocalizationProvider>
                </div>
              </div>
            )}

            {/* 場所 */}
            <div>
              <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                場所<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.venue_nm}
                onClick={() => setIsPlaceModalOpen(true)}
                readOnly
                className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px] cursor-pointer placeholder-[#6B7280]"
                placeholder="クリックして場所を選択"
                required
              />
            </div>

            {/* URL - 場所の直後に移動 */}
            <div>
              <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                URL
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px] placeholder-[#6B7280]"
                placeholder="https://..."
              />
            </div>

            {/* 説明 */}
            <div>
              <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                説明
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full bg-[#1D1D21] rounded p-2 h-32 text-[#FCFCFC]"
              />
            </div>

            {/* 運営メンバー */}
            <div>
              <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                運営メンバー
              </label>
              <div className="flex flex-col space-y-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(true)}
                  className="flex items-center bg-[#3D3D45] rounded-full pl-3 pr-3 py-1.5 text-[#FCFCFC] hover:bg-[#4D4D55] w-auto inline-block"
                >
                  <span className="text-sm">+ 運営メンバーを追加</span>
                </button>

                {formData.participants.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.participants.map((user) => (
                      <div
                        key={user.emp_no}
                        className="flex items-center bg-[#3D3D45] rounded-full pl-2 pr-1.5 py-0.5 text-xs"
                      >
                        <span className="text-[#FCFCFC] mr-1.5">
                          {user.myoji} {user.namae}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(user.emp_no)}
                          className="w-4 h-4 flex items-center justify-center rounded-full bg-[#5D5D65] text-[#FCFCFC] hover:bg-[#8E93DA] hover:text-black text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 rounded bg-[#4A4B50] text-[#FCFCFC] hover:bg-opacity-80"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-[#5b63d3] text-white font-bold hover:bg-opacity-80"
              >
                登録
              </button>
            </div>
          </div>
        </form>
      </div>
      <PlaceSelectModal
        open={isPlaceModalOpen}
        onClose={() => setIsPlaceModalOpen(false)}
        onSelect={handlePlaceSelect}
      />
      <UserSelectModal
        open={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSelect={handleUserSelect}
      />
    </Box>
  );
};

export default EventAddPage;
