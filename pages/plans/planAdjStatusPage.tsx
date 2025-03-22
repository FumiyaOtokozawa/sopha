import { NextPage } from "next";
import React from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Button,
  Tabs,
  Tab,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import CircleOutlined from "@mui/icons-material/CircleOutlined";
import ChangeHistory from "@mui/icons-material/ChangeHistory";
import Close from "@mui/icons-material/Close";
import EventIcon from "@mui/icons-material/Event";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import { supabase } from "../../utils/supabaseClient";
import PlanAdjInputModal from "../../components/plans/planAdjInputModal";

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
      return <CircleOutlined sx={{ fontSize: "0.9rem", color: "#4ADE80" }} />;
    case "△":
      return <ChangeHistory sx={{ fontSize: "1rem", color: "#FFB800" }} />;
    case "×":
      return <Close sx={{ fontSize: "1.2rem", color: "#FF5656" }} />;
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

  const fetchPlanEventAndAvailabilities = async () => {
    if (!plan_id || !user?.email) return;

    try {
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
  };

  useEffect(() => {
    fetchPlanEventAndAvailabilities();
  }, [plan_id, user?.email]);

  const handleBack = () => {
    router.push("/plans/planMainPage");
  };

  const handleEdit = () => {
    router.push(`/plans/planAdjInputPage?plan_id=${plan_id}`);
  };

  const handleOpenDialog = () => {
    // 既存の回答があれば初期値として設定
    if (user?.email && participants.length > 0) {
      const userResponse = participants.find((p) =>
        p.availabilities.some((a) =>
          planEvent?.dates.some((d) => d.date_id === a.date_id)
        )
      );
      if (userResponse) {
        const initialAvailabilities: { [key: number]: "○" | "△" | "×" } = {};
        userResponse.availabilities.forEach((a) => {
          initialAvailabilities[a.date_id] = a.availability;
        });
        setAvailabilities(initialAvailabilities);
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

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          color: "#FCFCFC",
          p: 2,
        }}
      >
        <Typography>読み込み中...</Typography>
      </Box>
    );
  }

  if (!planEvent) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          color: "#FCFCFC",
          p: 2,
        }}
      >
        <Typography>イベントが見つかりません</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        color: "#FCFCFC",
      }}
    >
      <Box
        sx={{
          position: "sticky",
          top: 0,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          zIndex: 10,
          bgcolor: "#1D1D21",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            p: 1,
            maxWidth: "600px",
            mx: "auto",
          }}
        >
          <IconButton
            onClick={handleBack}
            sx={{ color: "rgba(255, 255, 255, 0.7)", p: 0.5 }}
          >
            <ArrowBackIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
          <Typography
            variant="h6"
            sx={{
              fontSize: "1rem",
              fontWeight: "bold",
              color: "#FCFCFC",
              flex: 1,
            }}
          >
            日程調整の状況
          </Typography>
          <IconButton
            onClick={handleEdit}
            sx={{
              color: "rgba(255, 255, 255, 0.7)",
              bgcolor: "rgba(255, 255, 255, 0.05)",
              p: 0.5,
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <EditIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          maxWidth: "600px",
          mx: "auto",
          p: 1,
        }}
      >
        <Paper
          sx={{
            p: 1.5,
            borderRadius: "8px",
            background: "linear-gradient(135deg, #2D2D2D 0%, #1D1D21 100%)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            mb: 1,
          }}
        >
          <Box sx={{ mb: 1.5 }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: "1rem",
                fontWeight: "bold",
                color: "#FCFCFC",
                mb: 0.5,
                letterSpacing: "0.02em",
              }}
            >
              {planEvent.plan_title}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: "rgba(255, 255, 255, 0.5)",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <PersonIcon sx={{ fontSize: "0.9rem" }} />
                {planEvent.creator.myoji} {planEvent.creator.namae}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: "rgba(255, 255, 255, 0.5)",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <EventIcon sx={{ fontSize: "0.9rem" }} />
                {formatDateWithKanji(planEvent.deadline)}まで
              </Typography>
            </Box>
          </Box>

          {planEvent.description && (
            <Box
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.03)",
                p: 1,
                borderRadius: "6px",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: "rgba(255, 255, 255, 0.7)",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.4,
                }}
              >
                {planEvent.description}
              </Typography>
            </Box>
          )}
        </Paper>

        <Paper
          sx={{
            p: 1.5,
            borderRadius: "12px",
            background: "linear-gradient(135deg, #2D2D2D 0%, #1D1D21 100%)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            mb: 1,
          }}
        >
          <Box
            sx={{
              borderBottom: 1,
              borderColor: "rgba(255, 255, 255, 0.1)",
              mb: 1.5,
            }}
          >
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                minHeight: "32px",
                width: "95%",
                "& .MuiTab-root": {
                  minHeight: "32px",
                  padding: "4px 8px",
                  color: "#FCFCFC",
                  fontSize: "0.8rem",
                  textTransform: "none",
                  fontWeight: "medium",
                },
                "& .Mui-selected": {
                  color: "#8E93DA !important",
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "#8E93DA",
                },
              }}
            >
              <Tab label="回答状況" />
              <Tab label="回答者一覧" />
            </Tabs>
          </Box>

          {selectedTab === 0 ? (
            <Box sx={{ width: "100%" }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {planEvent.dates.map((date) => {
                  const respondents: DateRespondents = {
                    available: participants.filter(
                      (p) =>
                        p.availabilities.find((a) => a.date_id === date.date_id)
                          ?.availability === "○"
                    ),
                    maybe: participants.filter(
                      (p) =>
                        p.availabilities.find((a) => a.date_id === date.date_id)
                          ?.availability === "△"
                    ),
                    unavailable: participants.filter(
                      (p) =>
                        p.availabilities.find((a) => a.date_id === date.date_id)
                          ?.availability === "×" ||
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

                  return (
                    <Box
                      key={date.date_id}
                      sx={{
                        p: 1.5,
                        borderRadius: "8px",
                        bgcolor: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          bgcolor: "rgba(255, 255, 255, 0.05)",
                        },
                      }}
                    >
                      <Box
                        className="response-status-row"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {/* 日時エリア */}
                        <Box
                          className="date-time-area"
                          sx={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            width: "50%",
                          }}
                        >
                          <Typography
                            className="date-time-text"
                            component="div"
                            sx={{
                              fontSize: "0.875rem",
                              color: "#FCFCFC",
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              width: "100%",
                            }}
                          >
                            <EventIcon
                              className="date-icon"
                              sx={{ fontSize: "1rem" }}
                            />
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                width: "100%",
                                justifyContent: "space-between",
                              }}
                            >
                              <Box
                                sx={{
                                  fontSize: "0.75rem",
                                  width: "35%",
                                  textAlign: "left",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {dayjs(date.datetime).format("MM月DD日")}
                              </Box>
                              <Box
                                sx={{
                                  fontSize: "0.75rem",
                                  width: "20%",
                                  textAlign: "left",
                                  whiteSpace: "nowrap",
                                  pl: 0.5,
                                  color:
                                    dayjs(date.datetime).day() === 0
                                      ? "#FF5656"
                                      : dayjs(date.datetime).day() === 6
                                      ? "#5b63d3"
                                      : "inherit",
                                }}
                              >
                                （{weekdayKanji[dayjs(date.datetime).day()]}）
                              </Box>
                              <Box
                                sx={{
                                  fontSize: "0.75rem",
                                  width: "45%",
                                  textAlign: "left",
                                  whiteSpace: "nowrap",
                                  pl: 1.5,
                                }}
                              >
                                {dayjs(date.datetime).format("HH:mm")}
                              </Box>
                            </Box>
                          </Typography>
                        </Box>

                        {/* 回答状況エリア */}
                        <Box
                          className="response-info-area"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            width: "50%",
                            justifyContent: "flex-end",
                          }}
                        >
                          {/* 回答数カウントエリア */}
                          <Box
                            className="response-counts"
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              width: "60%",
                            }}
                          >
                            <Typography
                              className="available-count"
                              component="div"
                              sx={{
                                fontSize: "0.75rem",
                                color: "#4ADE80",
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                alignItems: "center",
                                width: "30%",
                              }}
                            >
                              <CircleOutlined
                                className="available-icon"
                                sx={{
                                  fontSize: "0.9rem",
                                  justifySelf: "center",
                                }}
                              />
                              <Box sx={{ justifySelf: "center" }}>
                                {availableCount}
                              </Box>
                            </Typography>
                            <Typography
                              className="maybe-count"
                              component="div"
                              sx={{
                                fontSize: "0.75rem",
                                color: "#FFB800",
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                alignItems: "center",
                                width: "30%",
                              }}
                            >
                              <ChangeHistory
                                className="maybe-icon"
                                sx={{ fontSize: "1rem", justifySelf: "center" }}
                              />
                              <Box sx={{ justifySelf: "center" }}>
                                {maybeCount}
                              </Box>
                            </Typography>
                            <Typography
                              className="unavailable-count"
                              component="div"
                              sx={{
                                fontSize: "0.75rem",
                                color: "#FF5656",
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                alignItems: "center",
                                width: "30%",
                              }}
                            >
                              <Close
                                className="unavailable-icon"
                                sx={{
                                  fontSize: "1.2rem",
                                  justifySelf: "center",
                                }}
                              />
                              <Box sx={{ justifySelf: "center" }}>
                                {unavailableCount}
                              </Box>
                            </Typography>
                          </Box>

                          {/* 参加可能率 */}
                          <Typography
                            className="availability-rate"
                            component="div"
                            sx={{
                              fontSize: "0.875rem",
                              fontWeight: "bold",
                              color:
                                availableRate >= 75
                                  ? "#4ADE80"
                                  : availableRate >= 31
                                  ? "#FFB800"
                                  : "#FF5656",
                              minWidth: "3rem",
                              textAlign: "right",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 0.5,
                              width: "20%",
                            }}
                          >
                            {Math.round(availableRate)}%
                          </Typography>
                        </Box>
                      </Box>

                      {/* プログレスバー */}
                      <Box
                        className="progress-bar-container"
                        sx={{
                          position: "relative",
                          height: "2px",
                          mt: 1.5,
                          borderRadius: "4px",
                          bgcolor: "rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <Box
                          className="progress-bar-available"
                          sx={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            height: "100%",
                            width: `${availableRate}%`,
                            bgcolor: "#4ADE80",
                            borderRadius: "4px",
                          }}
                        />
                        <Box
                          className="progress-bar-maybe"
                          sx={{
                            position: "absolute",
                            left: `${availableRate}%`,
                            top: 0,
                            height: "100%",
                            width: `${maybeRate}%`,
                            bgcolor: "#FFB800",
                            borderRadius: "4px",
                          }}
                        />
                        <Box
                          className="progress-bar-unavailable"
                          sx={{
                            position: "absolute",
                            left: `${availableRate + maybeRate}%`,
                            top: 0,
                            height: "100%",
                            width: `${unavailableRate}%`,
                            bgcolor: "#FF5656",
                            borderRadius: "4px",
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ) : (
            <Box sx={{ width: "100%", overflow: "auto" }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "100px 1fr",
                  gap: 0,
                  width: "100%",
                  borderRadius: "8px",
                  bgcolor: "rgba(255, 255, 255, 0.03)",
                  fontSize: "0.75rem",
                  maxHeight: "calc(100vh - 300px)",
                  overflow: "auto",
                }}
              >
                {/* ヘッダー行 */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#FCFCFC",
                    fontWeight: "medium",
                    bgcolor: "rgba(45, 45, 45, 0.95)",
                    display: "flex",
                    alignItems: "center",
                    position: "sticky",
                    left: 0,
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  参加者
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    display: "grid",
                    gridTemplateColumns: `repeat(${planEvent.dates.length}, 60px)`,
                    gap: 0,
                    bgcolor: "rgba(255, 255, 255, 0.05)",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  {planEvent.dates.map((date) => (
                    <Box
                      key={date.date_id}
                      sx={{
                        textAlign: "center",
                        color: "#FCFCFC",
                        px: 0.5,
                        py: 1,
                        fontSize: "0.7rem",
                        borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      {dayjs(date.datetime).format("MM/DD")}
                      <br />（{weekdayKanji[dayjs(date.datetime).day()]}）
                      <br />
                      {dayjs(date.datetime).format("HH:mm")}
                    </Box>
                  ))}
                </Box>

                {/* 参加状況の集計行 */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#FCFCFC",
                    display: "flex",
                    alignItems: "center",
                    position: "sticky",
                    left: 0,
                    bgcolor: "rgba(45, 45, 45, 0.95)",
                    backdropFilter: "blur(8px)",
                    zIndex: 2,
                  }}
                >
                  参加状況
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    display: "grid",
                    gridTemplateColumns: `repeat(${planEvent.dates.length}, 60px)`,
                    gap: 0,
                  }}
                >
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
                          )?.availability === "×"
                      ),
                    };

                    const total = participants.length || 1; // 0除算を防ぐ
                    const availableRate = Math.round(
                      (respondents.available.length / total) * 100
                    );
                    const maybeRate = Math.round(
                      (respondents.maybe.length / total) * 100
                    );
                    const unavailableRate = Math.round(
                      (respondents.unavailable.length / total) * 100
                    );

                    return (
                      <Box
                        key={date.date_id}
                        sx={{
                          textAlign: "center",
                          color: "#FCFCFC",
                          display: "flex",
                          flexDirection: "column",
                          px: 0.5,
                          py: 0.5,
                          fontSize: "0.7rem",
                          borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
                          gap: 0.5,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.5,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.75rem",
                              fontWeight: "bold",
                              color:
                                availableRate >= 75
                                  ? "#4ADE80"
                                  : availableRate >= 31
                                  ? "#FFB800"
                                  : "#FF5656",
                            }}
                          >
                            {availableRate}%
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            width: "100%",
                            height: "3px",
                            bgcolor: "rgba(255, 255, 255, 0.1)",
                            borderRadius: "2px",
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            sx={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              height: "100%",
                              width: `${availableRate}%`,
                              bgcolor: "#4ADE80",
                            }}
                          />
                          <Box
                            sx={{
                              position: "absolute",
                              left: `${availableRate}%`,
                              top: 0,
                              height: "100%",
                              width: `${maybeRate}%`,
                              bgcolor: "#FFB800",
                            }}
                          />
                          <Box
                            sx={{
                              position: "absolute",
                              left: `${availableRate + maybeRate}%`,
                              top: 0,
                              height: "100%",
                              width: `${unavailableRate}%`,
                              bgcolor: "#FF5656",
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                {/* 参加者ごとの回答 */}
                {participants.map((participant) => (
                  <React.Fragment key={participant.emp_no}>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#FCFCFC",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        fontSize: "0.75rem",
                        position: "sticky",
                        left: 0,
                        bgcolor: "rgba(45, 45, 45, 0.95)",
                        backdropFilter: "blur(8px)",
                        zIndex: 1,
                      }}
                    >
                      {participant.user_info.myoji}{" "}
                      {participant.user_info.namae}
                    </Box>
                    <Box
                      sx={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        display: "grid",
                        gridTemplateColumns: `repeat(${planEvent.dates.length}, 60px)`,
                        gap: 0,
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
                              textAlign: "center",
                              color:
                                availability === "○"
                                  ? "#4ADE80"
                                  : availability === "△"
                                  ? "#FFB800"
                                  : "#FF5656",
                              px: 0.5,
                              py: 1,
                              borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
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

        <Button
          variant="contained"
          fullWidth
          onClick={handleOpenDialog}
          sx={{
            bgcolor: "#5b63d3",
            color: "#FCFCFC",
            py: 2,
            fontSize: "1rem",
            fontWeight: "bold",
            borderRadius: "8px",
            "&:hover": {
              bgcolor: "#4850c9",
            },
          }}
        >
          回答を入力する
        </Button>

        <PlanAdjInputModal
          open={isDialogOpen}
          onClose={handleCloseDialog}
          dates={planEvent?.dates || []}
          availabilities={availabilities}
          onAvailabilityChange={handleAvailabilityChange}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </Box>
    </Box>
  );
};

export default PlanAdjStatusPage;
