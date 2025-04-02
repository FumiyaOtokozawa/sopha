import { NextPage } from "next";
import React from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Button,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import CircleOutlined from "@mui/icons-material/CircleOutlined";
import ChangeHistory from "@mui/icons-material/ChangeHistory";
import Close from "@mui/icons-material/Close";
import EventIcon from "@mui/icons-material/Event";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ShareIcon from "@mui/icons-material/Share";
import { useRouter } from "next/router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { supabase } from "../../utils/supabaseClient";
import PlanAdjInputModal from "../../components/plans/planAdjInputModal";
import { PlanEditModal } from "../../components/plans/planEditModal";
import { motion } from "framer-motion";
import { planAdjStatusStyles } from "../../styles/pages/planAdjStatus";
import { PlanFormData } from "../../types/plan";
import { DateTimeSelection } from "../../types/plan";
import PlanChat from "../../components/plans/planChat";
import PlanDateConfirmDialog from "../../components/plans/PlanDateConfirmDialog";
import PlanReopenDialog from "../../components/plans/PlanReopenDialog";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Tokyo");
dayjs.locale("ja");

// 曜日の漢字マッピング
const weekdayKanji = ["日", "月", "火", "水", "木", "金", "土"];

// 日付フォーマットのヘルパー関数
const formatDateWithKanji = (datetime: string) => {
  const date = dayjs(datetime);
  const weekday = weekdayKanji[date.day()];
  return date.format(`M月D日（${weekday}）HH:mm`);
};

// 型定義
interface PlanEvent {
  plan_id: number;
  plan_title: string;
  description: string | null;
  deadline: string;
  status: string;
  created_by: number;
  dates: PlanDate[];
  creator: {
    myoji: string;
    namae: string;
  };
}

interface PlanDate {
  date_id: number;
  datetime: string;
}

interface ParticipantAvailability {
  emp_no: number;
  user_info: {
    myoji: string;
    namae: string;
  };
  availabilities: {
    date_id: number;
    availability: "○" | "△" | "×" | null;
  }[];
}

interface AvailabilityType {
  type: "○" | "△" | "×" | null;
}

interface DateRespondents {
  available: ParticipantAvailability[];
  maybe: ParticipantAvailability[];
  unavailable: ParticipantAvailability[];
}

// アイコンコンポーネントの定義
const AvailabilityIcon: React.FC<AvailabilityType> = ({ type }) => {
  if (type === null) return null;

  switch (type) {
    case "○":
      return (
        <CircleOutlined
          sx={{ fontSize: "0.9rem", color: "rgba(74, 222, 128, 1)" }}
        />
      );
    case "△":
      return (
        <ChangeHistory
          sx={{ fontSize: "1rem", color: "rgba(230, 162, 0, 1)" }}
        />
      );
    case "×":
      return (
        <Close sx={{ fontSize: "1.2rem", color: "rgba(230, 70, 70, 1)" }} />
      );
    default:
      return null;
  }
};

const PlanAdjStatusPage: NextPage = () => {
  const router = useRouter();
  const { plan_id } = router.query;
  const user = useUser();
  const [planEvent, setPlanEvent] = useState<PlanEvent | null>(null);
  const [participants, setParticipants] = useState<ParticipantAvailability[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [availabilities, setAvailabilities] = useState<{
    [key: number]: "○" | "△" | "×" | null;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUserEmpNo, setCurrentUserEmpNo] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<PlanDate | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
  const [isUrlCopied, setIsUrlCopied] = useState(false);

  // イベントが締め切られているかどうかを判定する
  const isEventClosed = useMemo(() => {
    if (!planEvent) return false;
    return (
      planEvent.status === "closed" ||
      dayjs(planEvent.deadline).isBefore(dayjs())
    );
  }, [planEvent]);

  const fetchPlanEventAndAvailabilities = useCallback(async () => {
    if (!plan_id || !user?.email) return;

    try {
      // ユーザーの社員番号を取得
      const { data: userData, error: userError } = await supabase
        .from("USER_INFO")
        .select("emp_no")
        .eq("email", user.email)
        .single();

      if (userError) throw userError;
      if (userData) {
        setCurrentUserEmpNo(userData.emp_no);
      }

      const planIdNumber = parseInt(plan_id as string, 10);
      if (isNaN(planIdNumber)) return;

      // イベント情報の取得
      const { data: eventData, error: eventError } = await supabase
        .from("PLAN_EVENT")
        .select(
          `
          *,
          dates:PLAN_EVENT_DATES(date_id, datetime),
          creator:USER_INFO!created_by(myoji, namae)
        `
        )
        .eq("plan_id", planIdNumber)
        .single();

      if (eventError) throw eventError;
      setPlanEvent(eventData);

      // 参加者の回答を取得
      const { data: participantsData, error: participantsError } =
        await supabase
          .from("PLAN_PAR_AVAILABILITY")
          .select(`emp_no, date_id, availability`)
          .eq("plan_id", planIdNumber);

      if (participantsError) throw participantsError;
      if (!participantsData) return;

      // ユーザー情報を一括取得
      const uniqueEmpNos = [...new Set(participantsData.map((p) => p.emp_no))];
      const { data: usersData, error: usersError } = await supabase
        .from("USER_INFO")
        .select("emp_no, myoji, namae")
        .in("emp_no", uniqueEmpNos);

      if (usersError) {
        console.error("ユーザー情報の取得に失敗:", usersError);
        return;
      }
      if (!usersData) {
        console.error("ユーザー情報が取得できません");
        return;
      }

      // ユーザー情報をMapで管理
      const userMap = new Map(usersData.map((user) => [user.emp_no, user]));

      // 参加者データの整理
      const processedParticipants = participantsData.reduce((acc, rawData) => {
        const userInfo = userMap.get(rawData.emp_no);
        if (!userInfo?.myoji || !userInfo?.namae) return acc;

        const existingParticipant = acc.get(rawData.emp_no);
        if (existingParticipant) {
          existingParticipant.availabilities.push({
            date_id: rawData.date_id,
            availability: rawData.availability as "○" | "△" | "×" | null,
          });
          return acc;
        }

        acc.set(rawData.emp_no, {
          emp_no: rawData.emp_no,
          user_info: {
            myoji: userInfo.myoji,
            namae: userInfo.namae,
          },
          availabilities: [
            {
              date_id: rawData.date_id,
              availability: rawData.availability as "○" | "△" | "×" | null,
            },
          ],
        });
        return acc;
      }, new Map());

      setParticipants(Array.from(processedParticipants.values()));
    } catch (error) {
      console.error("データ取得エラー:", error);
    } finally {
      setIsLoading(false);
    }
  }, [plan_id, user?.email]);

  useEffect(() => {
    fetchPlanEventAndAvailabilities();
  }, [fetchPlanEventAndAvailabilities]);

  const handleOpenDialog = async () => {
    // 初期化
    const initialAvailabilities: { [key: number]: "○" | "△" | "×" | null } = {};
    planEvent?.dates.forEach((date) => {
      initialAvailabilities[date.date_id] = null;
    });
    setAvailabilities(initialAvailabilities);

    // ユーザーの回答を取得
    if (user?.email && planEvent) {
      try {
        // ユーザーのemp_noを取得
        const { data: userData, error: userError } = await supabase
          .from("USER_INFO")
          .select("emp_no")
          .eq("email", user.email)
          .single();

        if (userError) throw userError;
        if (!userData) return;

        // ユーザーの回答を取得
        const { data: responseData, error: responseError } = await supabase
          .from("PLAN_PAR_AVAILABILITY")
          .select("date_id, availability")
          .eq("plan_id", planEvent.plan_id)
          .eq("emp_no", userData.emp_no);

        if (responseError) throw responseError;

        // 回答データを設定
        if (responseData) {
          const initialAvailabilities: {
            [key: number]: "○" | "△" | "×" | null;
          } = {};
          planEvent.dates.forEach((date) => {
            const response = responseData.find(
              (r) => r.date_id === date.date_id
            );
            initialAvailabilities[date.date_id] = response
              ? (response.availability as "○" | "△" | "×" | null)
              : null;
          });
          setAvailabilities(initialAvailabilities);
        }
      } catch (error) {
        console.error("Error fetching user responses:", error);
      }
    }

    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleAvailabilityChange = (
    dateId: number,
    value: "○" | "△" | "×" | null
  ) => {
    setAvailabilities((prev) => ({
      ...prev,
      [dateId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!user?.email || !planEvent) return;

    try {
      setIsSubmitting(true);

      // ユーザーのemp_noを取得
      const { data: userData, error: userError } = await supabase
        .from("USER_INFO")
        .select("emp_no")
        .eq("email", user.email)
        .single();

      if (userError) throw userError;
      if (!userData) return;

      const now = dayjs().format("YYYY-MM-DD HH:mm:ss");

      // 既存の回答を削除
      const { error: deleteError } = await supabase
        .from("PLAN_PAR_AVAILABILITY")
        .delete()
        .eq("plan_id", planEvent.plan_id)
        .eq("emp_no", userData.emp_no);

      if (deleteError) throw deleteError;

      // 新しい回答を登録（nullでない回答のみ）
      const validAvailabilities = Object.entries(availabilities)
        .filter(([, value]) => value !== null)
        .map(([dateId, value]) => {
          if (value === null) return null;
          return {
            plan_id: planEvent.plan_id,
            emp_no: userData.emp_no,
            date_id: parseInt(dateId),
            availability: value,
            created_at: now,
            updated_at: now,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (validAvailabilities.length > 0) {
        const { error: insertError } = await supabase
          .from("PLAN_PAR_AVAILABILITY")
          .insert(validAvailabilities);

        if (insertError) throw insertError;
      }

      // 画面を更新
      await fetchPlanEventAndAvailabilities();
      handleCloseDialog();
    } catch (error) {
      console.error("Error submitting availability:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleEditSubmit = async (
    formData: PlanFormData,
    selectedDateTimes: DateTimeSelection[]
  ) => {
    if (!planEvent || !user?.email) return;

    try {
      const now = dayjs().format("YYYY-MM-DD HH:mm:ss");

      // イベント情報の更新
      const { error: eventError } = await supabase
        .from("PLAN_EVENT")
        .update({
          plan_title: formData.title,
          description: formData.description,
          deadline: formData.deadline,
          updated_at: now,
        })
        .eq("plan_id", planEvent.plan_id);

      if (eventError) throw eventError;

      // 既存の日時を取得
      const { data: existingDates, error: existingDatesError } = await supabase
        .from("PLAN_EVENT_DATES")
        .select("date_id, datetime")
        .eq("plan_id", planEvent.plan_id);

      if (existingDatesError) throw existingDatesError;

      // 新しい日時の文字列形式を作成
      const newDateTimeStrings = selectedDateTimes.map(
        (dt) => dt.date.format("YYYY-MM-DD") + " " + dt.time
      );

      // 既存の日時を文字列形式に変換
      const existingDateTimeStrings = existingDates.map((ed) =>
        dayjs(ed.datetime).format("YYYY-MM-DD HH:mm")
      );

      // 削除される日時のIDを特定
      const dateIdsToDelete = existingDates
        .filter(
          (ed, index) =>
            !newDateTimeStrings.includes(existingDateTimeStrings[index])
        )
        .map((ed) => ed.date_id);

      // 既存の日時を更新（同じdate_idで日時のみ更新）
      const dateTimesToUpdate = selectedDateTimes
        .filter(
          (_, index) =>
            index < existingDates.length &&
            !dateIdsToDelete.includes(existingDates[index].date_id)
        )
        .map((dt, index) => ({
          date_id: existingDates[index].date_id,
          datetime: dt.date.format("YYYY-MM-DD") + " " + dt.time,
        }));

      // 完全に新規の日時を特定
      const newDateTimesToAdd = selectedDateTimes.filter((dt) => {
        const dateTimeStr = dt.date.format("YYYY-MM-DD") + " " + dt.time;
        return !existingDateTimeStrings.includes(dateTimeStr);
      });

      // 削除される日時に関連する回答のみを削除
      if (dateIdsToDelete.length > 0) {
        const { error: deleteAvailError } = await supabase
          .from("PLAN_PAR_AVAILABILITY")
          .delete()
          .eq("plan_id", planEvent.plan_id)
          .in("date_id", dateIdsToDelete);

        if (deleteAvailError) throw deleteAvailError;

        // 削除される日時を削除
        const { error: deleteDatesError } = await supabase
          .from("PLAN_EVENT_DATES")
          .delete()
          .in("date_id", dateIdsToDelete);

        if (deleteDatesError) throw deleteDatesError;
      }

      // 既存の日時を更新
      for (const dateTime of dateTimesToUpdate) {
        const { error: updateError } = await supabase
          .from("PLAN_EVENT_DATES")
          .update({ datetime: dateTime.datetime })
          .eq("date_id", dateTime.date_id);

        if (updateError) throw updateError;
      }

      // 完全に新規の日時を追加
      if (newDateTimesToAdd.length > 0) {
        // 新規日時をPLAN_EVENT_DATESに追加
        const { data: newDates, error: insertError } = await supabase
          .from("PLAN_EVENT_DATES")
          .insert(
            newDateTimesToAdd.map((dateTime) => ({
              plan_id: planEvent.plan_id,
              datetime:
                dateTime.date.format("YYYY-MM-DD") + " " + dateTime.time,
              created_at: now,
            }))
          )
          .select();

        if (insertError) throw insertError;
        if (!newDates) throw new Error("新規日時の追加に失敗しました");

        // 既存の参加者を取得
        const { data: existingParticipants, error: participantsError } =
          await supabase
            .from("PLAN_PAR_AVAILABILITY")
            .select("emp_no")
            .eq("plan_id", planEvent.plan_id);

        if (participantsError) throw participantsError;

        // 重複を除去して一意の参加者リストを作成
        const uniqueParticipants = existingParticipants
          ? Array.from(new Set(existingParticipants.map((p) => p.emp_no))).map(
              (emp_no) => ({ emp_no })
            )
          : [];

        // 新規日時に対して既存の参加者分のレコードを追加
        if (uniqueParticipants.length > 0) {
          const newAvailabilityRecords = newDates.flatMap((newDate) =>
            uniqueParticipants.map((participant: { emp_no: number }) => ({
              plan_id: planEvent.plan_id,
              date_id: newDate.date_id,
              emp_no: participant.emp_no,
              availability: null,
              created_at: now,
            }))
          );

          const { error: availabilityError } = await supabase
            .from("PLAN_PAR_AVAILABILITY")
            .insert(newAvailabilityRecords);

          if (availabilityError) throw availabilityError;
        }
      }

      // 画面を更新
      await fetchPlanEventAndAvailabilities();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!planEvent) return;

    // 削除確認
    if (!window.confirm("本当にこのイベントを削除しますか？")) return;

    try {
      // 関連する回答を削除
      const { error: parDeleteError } = await supabase
        .from("PLAN_PAR_AVAILABILITY")
        .delete()
        .eq("plan_id", planEvent.plan_id);

      if (parDeleteError) throw parDeleteError;

      // 関連する日時を削除
      const { error: dateDeleteError } = await supabase
        .from("PLAN_EVENT_DATES")
        .delete()
        .eq("plan_id", planEvent.plan_id);

      if (dateDeleteError) throw dateDeleteError;

      // イベント本体を削除
      const { error: eventDeleteError } = await supabase
        .from("PLAN_EVENT")
        .delete()
        .eq("plan_id", planEvent.plan_id);

      if (eventDeleteError) throw eventDeleteError;

      // 削除後はplanMainPageに遷移
      router.push("/plans/planMainPage");
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const handleDateCardClick = (date: PlanDate) => {
    setSelectedDate(date);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmDialogClose = () => {
    setIsConfirmDialogOpen(false);
    setSelectedDate(null);
  };

  const handleCloseWithoutEvent = async () => {
    if (!planEvent) return;

    try {
      // PLANを締め切る（締切日時を現在時刻-1分に設定）
      const closeDateTime = dayjs()
        .subtract(1, "minute")
        .format("YYYY-MM-DD HH:mm:ss");
      const { error: closeError } = await supabase
        .from("PLAN_EVENT")
        .update({
          status: "closed",
          deadline: closeDateTime,
          updated_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        })
        .eq("plan_id", planEvent.plan_id);

      if (closeError) throw closeError;

      // 画面を更新
      await fetchPlanEventAndAvailabilities();
      setIsConfirmDialogOpen(false);
      setSelectedDate(null);
    } catch (error) {
      console.error("Error closing plan:", error);
      alert("締め切りに失敗しました");
    }
  };

  const handleConfirmDialogConfirm = async () => {
    if (!selectedDate || !planEvent) return;

    try {
      // PLANを締め切る
      const closeDateTime = dayjs().format("YYYY-MM-DD HH:mm:ss");
      const { error: closeError } = await supabase
        .from("PLAN_EVENT")
        .update({
          status: "closed",
          deadline: closeDateTime,
          updated_at: closeDateTime,
        })
        .eq("plan_id", planEvent.plan_id);

      if (closeError) throw closeError;

      // イベントの作成
      const selectedDateTime = dayjs(selectedDate.datetime);
      const endDateTime = selectedDateTime.add(1, "hour");

      // 最大のevent_idを取得
      const { data: maxEventData, error: maxEventError } = await supabase
        .from("EVENT_LIST")
        .select("event_id")
        .order("event_id", { ascending: false })
        .limit(1)
        .single();

      if (maxEventError) throw maxEventError;

      const nextEventId = (maxEventData?.event_id || 0) + 1;

      // イベントの作成
      const { data: eventData, error: createError } = await supabase
        .from("EVENT_LIST")
        .insert({
          event_id: nextEventId,
          title: planEvent.plan_title,
          description: planEvent.description,
          start_date: selectedDateTime.format("YYYY-MM-DD HH:mm:ss"),
          end_date: endDateTime.format("YYYY-MM-DD HH:mm:ss"),
          created_at: closeDateTime,
          created_by: currentUserEmpNo,
          updated_at: closeDateTime,
          genre: null,
          format: null,
          url: null,
          venue_id: null,
          manage_member: null,
          owner: currentUserEmpNo,
          plan_id: planEvent.plan_id,
        })
        .select()
        .single();

      if (createError) throw createError;
      if (!eventData) throw new Error("イベントの作成に失敗しました");

      // イベント詳細画面に遷移
      router.push(`/events/eventDetailPage?event_id=${eventData.event_id}`);
    } catch (error) {
      console.error("Error creating event:", error);
      alert("イベントの作成に失敗しました");
      setIsConfirmDialogOpen(false);
    }
  };

  const handleReopenPlan = async () => {
    if (!planEvent) return;

    try {
      const newDeadline = dayjs().add(1, "day").format("YYYY-MM-DD HH:mm:ss");
      const { error: updateError } = await supabase
        .from("PLAN_EVENT")
        .update({
          status: null,
          deadline: newDeadline,
          updated_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        })
        .eq("plan_id", planEvent.plan_id);

      if (updateError) throw updateError;

      // 画面を更新
      await fetchPlanEventAndAvailabilities();
      setIsReopenDialogOpen(false);
    } catch (error) {
      console.error("Error reopening plan:", error);
      alert("締め切りの延長に失敗しました");
    }
  };

  if (isLoading) {
    return (
      <Box sx={planAdjStatusStyles.root}>
        <Box sx={planAdjStatusStyles.content}>
          <Typography>読み込み中...</Typography>
        </Box>
      </Box>
    );
  }

  if (!planEvent) {
    return (
      <Box sx={planAdjStatusStyles.root}>
        <Box sx={planAdjStatusStyles.content}>
          <Typography>イベントが見つかりません</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="plan-status" sx={planAdjStatusStyles.root}>
      <Box
        className="plan-status__content"
        sx={{ ...planAdjStatusStyles.content, gap: 2 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Paper
            className="plan-status__info"
            elevation={0}
            sx={planAdjStatusStyles.infoCard}
          >
            <Box
              className="plan-status__info-header"
              sx={{
                ...planAdjStatusStyles.infoHeader,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography
                  className="plan-status__info-title"
                  variant="h6"
                  sx={planAdjStatusStyles.infoTitle}
                >
                  {planEvent.plan_title}
                </Typography>
                <Box
                  className="plan-status__info-meta"
                  sx={planAdjStatusStyles.infoMeta}
                >
                  <Typography
                    className="plan-status__info-creator"
                    sx={planAdjStatusStyles.infoMetaItem}
                  >
                    <PersonIcon sx={{ fontSize: "0.9rem" }} />
                    {planEvent.creator.myoji} {planEvent.creator.namae}
                  </Typography>
                  <Typography
                    className="plan-status__info-deadline"
                    sx={planAdjStatusStyles.infoMetaItem}
                  >
                    <EventIcon sx={{ fontSize: "0.9rem" }} />
                    {formatDateWithKanji(planEvent.deadline)}まで
                  </Typography>
                  {isEventClosed && (
                    <Typography
                      sx={{
                        ...planAdjStatusStyles.infoMetaItem,
                        color: "rgb(185, 55, 55)",
                        fontWeight: "bold",
                      }}
                    >
                      締め切り済み
                    </Typography>
                  )}
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <div className="relative flex items-center gap-2">
                  {isUrlCopied && (
                    <div className="absolute top-0 right-full mr-2 px-2 py-1 bg-green-500 text-white text-xs rounded-md whitespace-nowrap">
                      この画面へのURLをコピーしました
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = window.location.href;

                      // フォールバックを使用した安全なコピー処理
                      const textArea = document.createElement("textarea");
                      textArea.value = url;
                      textArea.style.position = "fixed";
                      textArea.style.left = "-999999px";
                      textArea.style.top = "-999999px";
                      textArea.style.opacity = "0";
                      document.body.appendChild(textArea);
                      textArea.select();

                      try {
                        document.execCommand("copy");
                        setIsUrlCopied(true);
                        setTimeout(() => setIsUrlCopied(false), 2000);
                      } catch (error) {
                        console.error("URLのコピーに失敗しました:", error);
                      } finally {
                        document.body.removeChild(textArea);
                      }
                    }}
                    className="inline-flex items-center justify-center p-1 hover:opacity-80 transition-opacity"
                    title="URLをコピー"
                  >
                    <ShareIcon sx={{ fontSize: "1.25rem", color: "#8E93DA" }} />
                  </button>
                </div>
                {currentUserEmpNo === planEvent.created_by && (
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {isEventClosed ? (
                      <Button
                        onClick={() => setIsReopenDialogOpen(true)}
                        variant="contained"
                        size="small"
                        sx={{
                          bgcolor: "#5b63d3",
                          color: "#FCFCFC",
                          "&:hover": {
                            bgcolor: "rgba(91, 99, 211, 0.8)",
                          },
                        }}
                      >
                        締め切りを延長
                      </Button>
                    ) : (
                      <>
                        <IconButton
                          onClick={handleDelete}
                          sx={{
                            color: "rgba(255, 255, 255, 0.7)",
                            "&:hover": {
                              color: "#FCFCFC",
                            },
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: "1.25rem" }} />
                        </IconButton>
                        <IconButton
                          onClick={() => setIsEditModalOpen(true)}
                          sx={{
                            color: "rgba(255, 255, 255, 0.7)",
                            "&:hover": {
                              color: "#FCFCFC",
                            },
                          }}
                        >
                          <EditIcon sx={{ fontSize: "1.25rem" }} />
                        </IconButton>
                      </>
                    )}
                  </Box>
                )}
              </Box>
            </Box>

            {planEvent.description && (
              <Box
                className="plan-status__info-description"
                sx={planAdjStatusStyles.infoDescription}
              >
                <Typography sx={planAdjStatusStyles.infoDescriptionText}>
                  {planEvent.description}
                </Typography>
              </Box>
            )}
          </Paper>
        </motion.div>

        {!isEventClosed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <button
              onClick={handleOpenDialog}
              className="w-full py-2 rounded-lg bg-[#5b63d3] text-white font-bold hover:bg-opacity-80 flex items-center justify-center gap-2"
            >
              回答を入力する
            </button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Paper
            className="plan-status__dates"
            sx={planAdjStatusStyles.datesCard}
          >
            <Box className="plan-status__tabs" sx={planAdjStatusStyles.tabs}>
              <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                variant="fullWidth"
                className="plan-status__tabs-container"
                sx={{
                  ...planAdjStatusStyles.tabsContainer,
                  width: "100%",
                  "& .MuiTabs-flexContainer": {
                    display: "flex",
                    width: "100%",
                  },
                  "& .MuiTab-root": {
                    flex: "1 1 33.333%",
                    padding: "0 6px",
                    maxWidth: "none",
                    minHeight: "48px",
                    textTransform: "none",
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                    color: "rgba(255, 255, 255, 0.7)",
                    "&.Mui-selected": {
                      color: "#FCFCFC",
                    },
                  },
                }}
              >
                <Tab className="plan-status__tab" label="参加状況" />
                <Tab
                  className="plan-status__tab"
                  label={`回答者一覧（${participants.length}）`}
                />
                <Tab className="plan-status__tab" label="チャット" />
              </Tabs>
            </Box>

            {selectedTab === 0 ? (
              <Box
                sx={{ width: "100%", flex: 1, minHeight: 0, overflowY: "auto" }}
              >
                {currentUserEmpNo === planEvent.created_by &&
                  !isEventClosed && (
                    <Box
                      sx={{
                        p: 1,
                        mb: 1,
                        backgroundColor: "rgba(91, 99, 211, 0.1)",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <InfoOutlinedIcon
                        sx={{ color: "rgb(252, 252, 252)", fontSize: "20px" }}
                      />
                      <Typography
                        sx={{ color: "rgb(252, 252, 252)", fontSize: "0.9rem" }}
                      >
                        日付を選択してイベントを確定
                      </Typography>
                    </Box>
                  )}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {[...planEvent.dates]
                    .sort(
                      (a, b) =>
                        dayjs(a.datetime).valueOf() -
                        dayjs(b.datetime).valueOf()
                    )
                    .map((date) => {
                      const respondents: DateRespondents = {
                        available: participants.filter(
                          (p) =>
                            p.availabilities.find(
                              (a) => a.date_id === date.date_id
                            )?.availability === "○"
                        ),
                        maybe: participants.filter(
                          (p) =>
                            p.availabilities.find(
                              (a) => a.date_id === date.date_id
                            )?.availability === "△"
                        ),
                        unavailable: participants.filter(
                          (p) =>
                            p.availabilities.find(
                              (a) => a.date_id === date.date_id
                            )?.availability === "×" ||
                            !p.availabilities.find(
                              (a) => a.date_id === date.date_id
                            )
                        ),
                      };

                      const totalRespondents = participants.length;
                      const availableCount = respondents.available.length;
                      const maybeCount = respondents.maybe.length;
                      const unavailableCount = respondents.unavailable.length;
                      const availableRate =
                        (availableCount / totalRespondents) * 100;
                      const maybeRate = (maybeCount / totalRespondents) * 100;
                      const unavailableRate =
                        (unavailableCount / totalRespondents) * 100;

                      const maxAvailableRate = Math.max(
                        ...planEvent.dates.map((d) => {
                          const availableCount = participants.filter(
                            (p) =>
                              p.availabilities.find(
                                (a) => a.date_id === d.date_id
                              )?.availability === "○"
                          ).length;
                          return (availableCount / participants.length) * 100;
                        })
                      );

                      return (
                        <Box
                          key={date.date_id}
                          sx={{
                            ...planAdjStatusStyles.dateItem,
                            ...(currentUserEmpNo === planEvent.created_by &&
                              !isEventClosed && {
                                cursor: "pointer",
                                "&:hover": {
                                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                                },
                              }),
                          }}
                          onClick={() => {
                            if (
                              currentUserEmpNo === planEvent.created_by &&
                              !isEventClosed
                            ) {
                              handleDateCardClick(date);
                            }
                          }}
                        >
                          <Box sx={planAdjStatusStyles.dateItemContent}>
                            <Box sx={planAdjStatusStyles.dateItemDateTime}>
                              <Typography
                                component="div"
                                sx={planAdjStatusStyles.dateItemDateTimeText}
                              >
                                <EventIcon sx={{ fontSize: "1rem" }} />
                                <Box
                                  sx={
                                    planAdjStatusStyles.dateItemDateTimeContainer
                                  }
                                >
                                  <Box sx={planAdjStatusStyles.dateItemDate}>
                                    {dayjs(date.datetime).format("MM月DD日")}
                                  </Box>
                                  <Box
                                    sx={{
                                      ...planAdjStatusStyles.dateItemWeekday(),
                                    }}
                                  >
                                    （
                                    <span
                                      style={{
                                        color:
                                          dayjs(date.datetime).day() === 0
                                            ? "rgb(233, 112, 112)"
                                            : dayjs(date.datetime).day() === 6
                                            ? "rgb(136, 142, 214)"
                                            : "inherit",
                                      }}
                                    >
                                      {weekdayKanji[dayjs(date.datetime).day()]}
                                    </span>
                                    ）
                                  </Box>
                                  <Box sx={planAdjStatusStyles.dateItemTime}>
                                    {dayjs(date.datetime).format("HH:mm")}
                                  </Box>
                                </Box>
                              </Typography>
                            </Box>

                            <Box sx={planAdjStatusStyles.dateItemStatus}>
                              <Typography
                                component="div"
                                sx={{
                                  ...planAdjStatusStyles.dateItemAvailabilityRate(
                                    Math.round(availableRate) ===
                                      Math.round(maxAvailableRate)
                                  ),
                                }}
                              >
                                {Math.round(availableRate)}%
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={planAdjStatusStyles.progressBar}>
                            <Box
                              sx={planAdjStatusStyles.progressBarSegment(
                                "rgba(74, 222, 128, 1)",
                                0,
                                availableRate
                              )}
                            />
                            <Box
                              sx={planAdjStatusStyles.progressBarSegment(
                                "rgb(189, 132, 0)",
                                availableRate,
                                maybeRate
                              )}
                            />
                            <Box
                              sx={planAdjStatusStyles.progressBarSegment(
                                "rgb(185, 55, 55)",
                                availableRate + maybeRate,
                                unavailableRate
                              )}
                            />
                          </Box>
                        </Box>
                      );
                    })}
                </Box>
              </Box>
            ) : selectedTab === 1 ? (
              <Box
                sx={{ width: "100%", flex: 1, minHeight: 0, overflow: "auto" }}
              >
                <Box sx={planAdjStatusStyles.participantGrid}>
                  <Box sx={planAdjStatusStyles.participantHeader}>日付</Box>
                  <Box
                    sx={{
                      ...planAdjStatusStyles.participantDatesHeader,
                      gridTemplateColumns: `repeat(${planEvent.dates.length}, 60px)`,
                    }}
                  >
                    {[...planEvent.dates]
                      .sort(
                        (a, b) =>
                          dayjs(a.datetime).valueOf() -
                          dayjs(b.datetime).valueOf()
                      )
                      .map((date) => (
                        <Box
                          key={date.date_id}
                          sx={planAdjStatusStyles.participantDateCell}
                        >
                          {dayjs(date.datetime).format("MM/DD")}
                          <br />（
                          <span
                            style={{
                              color:
                                dayjs(date.datetime).day() === 0
                                  ? "rgb(233, 112, 112)"
                                  : dayjs(date.datetime).day() === 6
                                  ? "rgb(136, 142, 214)"
                                  : "inherit",
                            }}
                          >
                            {weekdayKanji[dayjs(date.datetime).day()]}
                          </span>
                          ）
                          <br />
                          {dayjs(date.datetime).format("HH:mm")}
                        </Box>
                      ))}
                  </Box>

                  {/* 参加率の行 */}
                  <Box
                    sx={{
                      ...planAdjStatusStyles.participantName,
                      bgcolor: "rgba(45, 45, 45, 0.95)",
                      position: "sticky",
                      left: 0,
                      zIndex: 2,
                    }}
                  >
                    参加率
                  </Box>
                  <Box
                    sx={{
                      ...planAdjStatusStyles.participantDatesHeader,
                      gridTemplateColumns: `repeat(${planEvent.dates.length}, 60px)`,
                      bgcolor: "rgba(255, 255, 255, 0.05)",
                      zIndex: 1,
                    }}
                  >
                    {[...planEvent.dates]
                      .sort(
                        (a, b) =>
                          dayjs(a.datetime).valueOf() -
                          dayjs(b.datetime).valueOf()
                      )
                      .map((date) => {
                        const availableCount = participants.filter(
                          (p) =>
                            p.availabilities.find(
                              (a) => a.date_id === date.date_id
                            )?.availability === "○"
                        ).length;
                        const totalParticipants = participants.length;

                        return (
                          <Box
                            key={date.date_id}
                            sx={{
                              textAlign: "center",
                              color: "#FCFCFC",
                              px: 0.5,
                              pt: 0.75,
                              pb: 1,
                              borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
                              fontSize: "0.75rem",
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            <Box>
                              {availableCount} / {totalParticipants}
                            </Box>
                            <Box
                              sx={{
                                ...planAdjStatusStyles.progressBar,
                                height: "3px",
                                minHeight: "3px",
                                maxHeight: "3px",
                                mt: 0,
                              }}
                            >
                              <Box
                                sx={planAdjStatusStyles.progressBarSegment(
                                  "rgba(74, 222, 128, 1)",
                                  0,
                                  (availableCount / totalParticipants) * 100
                                )}
                              />
                              <Box
                                sx={planAdjStatusStyles.progressBarSegment(
                                  "rgb(189, 132, 0)",
                                  (availableCount / totalParticipants) * 100,
                                  (participants.filter(
                                    (p) =>
                                      p.availabilities.find(
                                        (a) => a.date_id === date.date_id
                                      )?.availability === "△"
                                  ).length /
                                    totalParticipants) *
                                    100
                                )}
                              />
                              <Box
                                sx={planAdjStatusStyles.progressBarSegment(
                                  "rgb(185, 55, 55)",
                                  ((availableCount +
                                    participants.filter(
                                      (p) =>
                                        p.availabilities.find(
                                          (a) => a.date_id === date.date_id
                                        )?.availability === "△"
                                    ).length) /
                                    totalParticipants) *
                                    100,
                                  (participants.filter(
                                    (p) =>
                                      p.availabilities.find(
                                        (a) => a.date_id === date.date_id
                                      )?.availability === "×" ||
                                      !p.availabilities.find(
                                        (a) => a.date_id === date.date_id
                                      )
                                  ).length /
                                    totalParticipants) *
                                    100
                                )}
                              />
                            </Box>
                          </Box>
                        );
                      })}
                  </Box>

                  {participants.map((participant) => (
                    <React.Fragment key={participant.emp_no}>
                      <Box
                        sx={{
                          ...planAdjStatusStyles.participantName,
                          position: "sticky",
                          left: 0,
                          zIndex: 2,
                          bgcolor: "rgba(45, 45, 45, 0.95)",
                        }}
                      >
                        {participant.user_info.myoji}{" "}
                        {participant.user_info.namae}
                      </Box>
                      <Box
                        sx={{
                          ...planAdjStatusStyles.participantDatesHeader,
                          gridTemplateColumns: `repeat(${planEvent.dates.length}, 60px)`,
                          zIndex: 1,
                        }}
                      >
                        {[...planEvent.dates]
                          .sort(
                            (a, b) =>
                              dayjs(a.datetime).valueOf() -
                              dayjs(b.datetime).valueOf()
                          )
                          .map((date) => {
                            const availability =
                              participant.availabilities.find(
                                (a) => a.date_id === date.date_id
                              )?.availability || null;

                            return (
                              <Box
                                key={date.date_id}
                                sx={{
                                  ...planAdjStatusStyles.participantAvailability(
                                    availability as "○" | "△" | "×"
                                  ),
                                }}
                              >
                                <AvailabilityIcon type={availability} />
                              </Box>
                            );
                          })}
                      </Box>
                    </React.Fragment>
                  ))}
                </Box>
              </Box>
            ) : (
              <Box
                sx={{ width: "100%", flex: 1, minHeight: 0, overflow: "auto" }}
              >
                <PlanChat
                  planId={planEvent.plan_id}
                  currentUserEmpNo={currentUserEmpNo}
                />
              </Box>
            )}
          </Paper>
        </motion.div>

        <PlanAdjInputModal
          open={isDialogOpen}
          onClose={handleCloseDialog}
          dates={planEvent?.dates || []}
          availabilities={availabilities}
          onAvailabilityChange={handleAvailabilityChange}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />

        <PlanEditModal
          open={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          planEvent={planEvent}
          onSubmit={handleEditSubmit}
        />

        <PlanDateConfirmDialog
          open={isConfirmDialogOpen}
          onClose={handleConfirmDialogClose}
          onConfirm={handleConfirmDialogConfirm}
          onCloseWithoutEvent={handleCloseWithoutEvent}
          dateTime={selectedDate?.datetime}
        />

        <PlanReopenDialog
          open={isReopenDialogOpen}
          onClose={() => setIsReopenDialogOpen(false)}
          onConfirm={handleReopenPlan}
        />
      </Box>
    </Box>
  );
};

export default PlanAdjStatusPage;
