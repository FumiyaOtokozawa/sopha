import { NextPage } from "next";
import React from "react";
import { Box, Typography, Paper, Tabs, Tab, IconButton } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import CircleOutlined from "@mui/icons-material/CircleOutlined";
import ChangeHistory from "@mui/icons-material/ChangeHistory";
import Close from "@mui/icons-material/Close";
import EventIcon from "@mui/icons-material/Event";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useRouter } from "next/router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import { supabase } from "../../utils/supabaseClient";
import PlanAdjInputModal from "../../components/plans/planAdjInputModal";
import { PlanEditModal } from "../../components/plans/planEditModal";
import { motion } from "framer-motion";
import { planAdjStatusStyles } from "../../styles/pages/planAdjStatus";
import { PlanFormData } from "../../types/plan";
import { DateTimeSelection } from "../../types/plan";

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
    availability: "○" | "△" | "×";
  }[];
}

interface DateRespondents {
  available: ParticipantAvailability[];
  maybe: ParticipantAvailability[];
  unavailable: ParticipantAvailability[];
}

// アイコンコンポーネントの定義
const AvailabilityIcon = ({ type }: { type: "○" | "△" | "×" }) => {
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
    [key: number]: "○" | "△" | "×";
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUserEmpNo, setCurrentUserEmpNo] = useState<number | null>(null);

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
            availability: rawData.availability as "○" | "△" | "×",
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
              availability: rawData.availability as "○" | "△" | "×",
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
    setAvailabilities({});

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
          const initialAvailabilities: { [key: number]: "○" | "△" | "×" } = {};
          responseData.forEach((response) => {
            initialAvailabilities[response.date_id] = response.availability as
              | "○"
              | "△"
              | "×";
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

  const handleAvailabilityChange = (dateId: number, value: "○" | "△" | "×") => {
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

      // 新しい回答を登録
      const { error: insertError } = await supabase
        .from("PLAN_PAR_AVAILABILITY")
        .insert(
          planEvent.dates.map((date) => ({
            plan_id: planEvent.plan_id,
            emp_no: userData.emp_no,
            date_id: date.date_id,
            availability: availabilities[date.date_id] || "×",
            created_at: now,
            updated_at: now,
          }))
        );

      if (insertError) throw insertError;

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

      // 既存の日時を削除
      const { error: deleteError } = await supabase
        .from("PLAN_EVENT_DATES")
        .delete()
        .eq("plan_id", planEvent.plan_id);

      if (deleteError) throw deleteError;

      // 新しい日時を登録
      const { error: insertError } = await supabase
        .from("PLAN_EVENT_DATES")
        .insert(
          selectedDateTimes.map((dateTime) => ({
            plan_id: planEvent.plan_id,
            datetime: dateTime.date.format("YYYY-MM-DD") + " " + dateTime.time,
            created_at: now,
          }))
        );

      if (insertError) throw insertError;

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

  // イベントを手動で締め切る関数
  const handleCloseEvent = async () => {
    if (!planEvent) return;

    // 確認ダイアログを表示
    if (
      !window.confirm(
        "このイベントを締め切りますか？\n締め切り後は編集や回答の入力ができなくなります。"
      )
    ) {
      return;
    }

    try {
      const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
      const { error } = await supabase
        .from("PLAN_EVENT")
        .update({
          status: "closed",
          deadline: now, // 締め切り日時を現在時刻に更新
          updated_at: now,
        })
        .eq("plan_id", planEvent.plan_id);

      if (error) throw error;

      // 画面を更新
      await fetchPlanEventAndAvailabilities();
    } catch (error) {
      console.error("Error closing event:", error);
      alert("イベントの締め切りに失敗しました");
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
              {currentUserEmpNo === planEvent.created_by && !isEventClosed && (
                <Box sx={{ display: "flex", gap: 1 }}>
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
                </Box>
              )}
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
                sx={planAdjStatusStyles.tabsContainer}
              >
                <Tab className="plan-status__tab" label="回答状況" />
                <Tab
                  className="plan-status__tab"
                  label={`回答者一覧（${participants.length}）`}
                />
              </Tabs>
            </Box>

            {selectedTab === 0 ? (
              <Box
                sx={{ width: "100%", flex: 1, minHeight: 0, overflowY: "auto" }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {planEvent.dates.map((date) => {
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
                      <Box key={date.date_id} sx={planAdjStatusStyles.dateItem}>
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
            ) : (
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
                    {planEvent.dates.map((date) => (
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
                    {planEvent.dates.map((date) => {
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
                        {planEvent.dates.map((date) => {
                          const availability =
                            participant.availabilities.find(
                              (a) => a.date_id === date.date_id
                            )?.availability || "×";

                          return (
                            <Box
                              key={date.date_id}
                              sx={{
                                ...planAdjStatusStyles.participantAvailability(
                                  availability
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
            )}
          </Paper>
        </motion.div>

        {/* イベント締め切りボタン */}
        {currentUserEmpNo === planEvent.created_by && !isEventClosed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="mt-2"
          >
            <button
              onClick={handleCloseEvent}
              className="w-full py-2 rounded-lg bg-[rgb(185,55,55)] text-white font-bold hover:bg-opacity-80 flex items-center justify-center gap-2 transition-all duration-200"
            >
              イベントを締め切る
            </button>
          </motion.div>
        )}

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
      </Box>
    </Box>
  );
};

export default PlanAdjStatusPage;
