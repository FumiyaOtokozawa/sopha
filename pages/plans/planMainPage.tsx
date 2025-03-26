import { NextPage } from "next";
import { Box, Typography, Paper, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EventIcon from "@mui/icons-material/Event";
import PersonIcon from "@mui/icons-material/Person";
import RefreshIcon from "@mui/icons-material/Refresh";
import FooterMenu from "../../components/FooterMenu";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../utils/supabaseClient";

// 日程調整の型定義
interface PlanEvent {
  plan_id: number;
  plan_title: string;
  description: string | null;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  deadline: string;
  status: string;
  dates: {
    datetime: string;
  }[];
  creator: {
    name: string; // 表示用に結合した名前
  };
  responses_count: number;
}

// Supabaseのレスポンスの型
interface RawPlanEvent {
  plan_id: number;
  plan_title: string;
  description: string | null;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  deadline: string;
  status: string;
  dates: {
    datetime: string;
  }[];
  creator: {
    myoji: string;
    namae: string;
  };
  responses_count: number;
}

const PlanMainPage: NextPage = () => {
  const router = useRouter();
  const user = useUser();
  const [planEvents, setPlanEvents] = useState<PlanEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(5);

  // 受付中と締切済みのイベントを分類
  const { pendingEvents, recentClosedEvents } = useMemo(() => {
    const now = dayjs();
    const oneMonthAgo = now.subtract(1, "month");

    return {
      pendingEvents: planEvents.filter((event) => event.status === "pending"),
      recentClosedEvents: planEvents
        .filter(
          (event) =>
            event.status === "closed" &&
            dayjs(event.updated_at).isAfter(oneMonthAgo) &&
            dayjs(event.deadline).isBefore(now)
        )
        .sort((a, b) => {
          // 締切日の新しい順にソート
          return dayjs(b.deadline).unix() - dayjs(a.deadline).unix();
        }),
    };
  }, [planEvents]);

  // 期限切れのイベントのステータスを更新する関数
  const updateExpiredEventStatus = async () => {
    try {
      const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
      const { error } = await supabase
        .from("PLAN_EVENT")
        .update({ status: "closed" })
        .eq("status", "pending")
        .lt("deadline", now);

      if (error) {
        console.error("Error updating expired events:", error);
      }
    } catch (error) {
      console.error("Error in updateExpiredEventStatus:", error);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await updateExpiredEventStatus();
      const { data: rawEvents, error } = await supabase
        .from("PLAN_EVENT")
        .select(
          `
          *,
          dates:PLAN_EVENT_DATES(datetime),
          creator:USER_INFO!created_by(myoji, namae),
          responses_count:PLAN_PAR_AVAILABILITY(count)
        `
        )
        .or(
          "status.eq.pending,and(status.eq.closed,updated_at.gt." +
            dayjs().subtract(1, "month").toISOString() +
            ")"
        )
        .order("status", { ascending: true })
        .order("deadline", { ascending: true });

      if (error) throw error;

      const formattedEvents: PlanEvent[] = (rawEvents as RawPlanEvent[]).map(
        (event) => ({
          ...event,
          creator: {
            name:
              event.creator?.myoji && event.creator?.namae
                ? `${event.creator.myoji} ${event.creator.namae}`
                : "（匿名）",
          },
          responses_count: event.responses_count || 0,
        })
      );

      setPlanEvents(formattedEvents);
    } catch (error) {
      console.error("Error refreshing events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchPlanEvents = async () => {
      if (!user?.email) {
        console.log("User email not found");
        setIsLoading(false);
        return;
      }

      console.log("Fetching plan events for user:", user.email);

      try {
        // 期限切れのイベントのステータスを更新
        await updateExpiredEventStatus();

        // イベント情報を取得
        const { data: rawEvents, error } = await supabase
          .from("PLAN_EVENT")
          .select(
            `
            *,
            dates:PLAN_EVENT_DATES(datetime),
            creator:USER_INFO!created_by(myoji, namae),
            responses_count:PLAN_PAR_AVAILABILITY(count)
          `
          )
          .or(
            "status.eq.pending,and(status.eq.closed,updated_at.gt." +
              dayjs().subtract(1, "month").toISOString() +
              ")"
          )
          .order("status", { ascending: true })
          .order("deadline", { ascending: true });

        if (error) {
          console.error("Supabase query error:", error);
          throw error;
        }

        console.log("Raw events from Supabase:", rawEvents);

        // レスポンスを適切な型に変換
        const formattedEvents: PlanEvent[] = (rawEvents as RawPlanEvent[]).map(
          (event) => ({
            ...event,
            creator: {
              name:
                event.creator?.myoji && event.creator?.namae
                  ? `${event.creator.myoji} ${event.creator.namae}`
                  : "（匿名）",
            },
            responses_count: event.responses_count || 0,
          })
        );

        console.log("Formatted events:", formattedEvents);

        setPlanEvents(formattedEvents);
      } catch (error) {
        console.error("Error fetching plan events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlanEvents();
  }, [user?.email]);

  const handleCreateNewPlan = () => {
    router.push("/plans/planNewEventPage");
  };

  const handlePlanClick = (planId: number) => {
    router.push(`/plans/planAdjStatusPage?plan_id=${planId}`);
  };

  return (
    <Box
      className="plan-main"
      sx={{
        minHeight: "100vh",
        color: "#FCFCFC",
        pb: "calc(64px + 20px)",
      }}
    >
      <Box
        className="plan-main__content"
        sx={{
          px: 1.5,
          maxWidth: "600px",
          mx: "auto",
          py: 2,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="plan-main__new-event mb-4"
        >
          <button
            onClick={handleCreateNewPlan}
            className="plan-main__new-event-button w-full py-2 rounded-lg bg-[#5b63d3] text-white font-bold hover:bg-opacity-80 flex items-center justify-center gap-2"
          >
            <AddIcon className="plan-main__new-event-icon" />
            新規イベントの日程調整
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="plan-main__events"
        >
          <Paper
            elevation={0}
            className="plan-main__events-container"
            sx={{
              p: 1.5,
              mb: 2,
              bgcolor: "#2D2D2D",
              borderRadius: "8px",
            }}
          >
            <Box className="plan-main__events-list">
              {isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="plan-main__loading"
                >
                  <Typography
                    variant="body2"
                    className="plan-main__loading-text"
                    sx={{
                      color: "rgba(255, 255, 255, 0.7)",
                      textAlign: "center",
                      fontSize: "0.875rem",
                    }}
                  >
                    読み込み中...
                  </Typography>
                </motion.div>
              ) : pendingEvents.length > 0 || recentClosedEvents.length > 0 ? (
                <Box
                  className="plan-main__events-content"
                  sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  {pendingEvents.length > 0 && (
                    <Box
                      className="plan-main__pending-events"
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      <Box
                        className="plan-main__section-header"
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          pl: 0.5,
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          className="plan-main__section-title"
                          sx={{
                            fontSize: "0.875rem",
                            color: "rgba(255, 255, 255, 0.7)",
                            fontWeight: "500",
                          }}
                        >
                          受付中のイベント
                        </Typography>
                        <IconButton
                          onClick={handleRefresh}
                          disabled={isLoading}
                          size="small"
                          className="plan-main__refresh-button"
                          sx={{
                            color: "rgba(255, 255, 255, 0.7)",
                            "&:hover": {
                              color: "#FCFCFC",
                              backgroundColor: "rgba(255, 255, 255, 0.1)",
                            },
                          }}
                        >
                          <RefreshIcon
                            className="plan-main__refresh-icon"
                            fontSize="small"
                          />
                        </IconButton>
                      </Box>
                      <AnimatePresence>
                        {pendingEvents.map((event, index) => (
                          <motion.div
                            key={event.plan_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <Paper
                              onClick={() => handlePlanClick(event.plan_id)}
                              className={`plan-event ${
                                event.status === "pending"
                                  ? "plan-event--pending"
                                  : "plan-event--closed"
                              }`}
                              sx={{
                                bgcolor:
                                  event.status === "pending"
                                    ? "transparent"
                                    : "#1D1D21",
                                background:
                                  event.status === "pending"
                                    ? "linear-gradient(135deg, #1D1D21 0%, #252941 100%)"
                                    : "#1D1D21",
                                p: 1.5,
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                                borderRadius: "12px",
                                border: "1px solid",
                                borderColor:
                                  event.status === "pending"
                                    ? "rgba(142, 147, 218, 0.1)"
                                    : "rgba(255, 255, 255, 0.05)",
                                "@media (hover: hover)": {
                                  "&:hover": {
                                    background:
                                      event.status === "pending"
                                        ? "linear-gradient(135deg, #252941 0%, #2A2E4D 100%)"
                                        : "#262626",
                                    transform:
                                      event.status === "pending"
                                        ? "translateY(-2px)"
                                        : "none",
                                    boxShadow:
                                      event.status === "pending"
                                        ? "0 4px 20px rgba(91, 99, 211, 0.15)"
                                        : "none",
                                  },
                                },
                                "@media (hover: none)": {
                                  "&:active": {
                                    background:
                                      event.status === "pending"
                                        ? "linear-gradient(135deg, #252941 0%, #2A2E4D 100%)"
                                        : "#262626",
                                  },
                                },
                                touchAction: "manipulation",
                                WebkitTouchCallout: "none",
                                WebkitUserSelect: "none",
                                userSelect: "none",
                              }}
                            >
                              <Box
                                className="plan-event__header"
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  className="plan-event__title"
                                  sx={{
                                    fontSize:
                                      event.status === "pending"
                                        ? "0.9rem"
                                        : "0.85rem",
                                    fontWeight:
                                      event.status === "pending"
                                        ? "bold"
                                        : "normal",
                                    color:
                                      event.status === "pending"
                                        ? "#FCFCFC"
                                        : "rgba(255, 255, 255, 0.7)",
                                    lineHeight: 1.2,
                                    flex: 1,
                                    minWidth: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                  }}
                                >
                                  {event.plan_title}
                                </Typography>

                                <Box
                                  className="plan-event__status"
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    minWidth:
                                      event.status === "pending"
                                        ? "64px"
                                        : "48px",
                                    height:
                                      event.status === "pending"
                                        ? "24px"
                                        : "20px",
                                    borderRadius:
                                      event.status === "pending"
                                        ? "12px"
                                        : "10px",
                                    ml: 2,
                                    bgcolor:
                                      event.status === "pending"
                                        ? "rgba(34, 197, 94, 0.15)"
                                        : "rgba(255, 86, 86, 0.1)",
                                    color:
                                      event.status === "pending"
                                        ? "#4ADE80"
                                        : "rgba(255, 86, 86, 0.7)",
                                  }}
                                >
                                  <Typography
                                    className="plan-event__status-text"
                                    sx={{
                                      fontSize:
                                        event.status === "pending"
                                          ? "0.75rem"
                                          : "0.7rem",
                                      fontWeight:
                                        event.status === "pending"
                                          ? "bold"
                                          : "normal",
                                      letterSpacing: "0.02em",
                                    }}
                                  >
                                    {event.status === "pending"
                                      ? "受付中"
                                      : "締切"}
                                  </Typography>
                                </Box>
                              </Box>

                              <Box
                                className="plan-event__info"
                                sx={{
                                  display: "flex",
                                  gap: 2,
                                  alignItems: "center",
                                }}
                              >
                                <Box
                                  className="plan-event__creator"
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.75,
                                    backgroundColor:
                                      "rgba(255, 255, 255, 0.05)",
                                    padding:
                                      event.status === "pending"
                                        ? "4px 8px"
                                        : "2px 6px",
                                    borderRadius:
                                      event.status === "pending"
                                        ? "6px"
                                        : "4px",
                                  }}
                                >
                                  <PersonIcon
                                    className="plan-event__creator-icon"
                                    sx={{
                                      fontSize:
                                        event.status === "pending"
                                          ? "0.875rem"
                                          : "0.8rem",
                                      color:
                                        event.status === "pending"
                                          ? "rgba(255, 255, 255, 0.7)"
                                          : "rgba(255, 255, 255, 0.5)",
                                    }}
                                  />
                                  <Typography
                                    variant="body2"
                                    className="plan-event__creator-name"
                                    sx={{
                                      fontSize:
                                        event.status === "pending"
                                          ? "0.75rem"
                                          : "0.7rem",
                                      color:
                                        event.status === "pending"
                                          ? "rgba(255, 255, 255, 0.7)"
                                          : "rgba(255, 255, 255, 0.5)",
                                      fontWeight:
                                        event.status === "pending"
                                          ? "500"
                                          : "normal",
                                    }}
                                  >
                                    {event.creator.name}
                                  </Typography>
                                </Box>

                                <Box
                                  className="plan-event__deadline"
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.75,
                                    backgroundColor:
                                      "rgba(255, 255, 255, 0.05)",
                                    padding:
                                      event.status === "pending"
                                        ? "4px 8px"
                                        : "2px 6px",
                                    borderRadius:
                                      event.status === "pending"
                                        ? "6px"
                                        : "4px",
                                    width: "160px",
                                    marginLeft: "auto",
                                    justifyContent: "flex-start",
                                  }}
                                >
                                  <EventIcon
                                    className="plan-event__deadline-icon"
                                    sx={{
                                      fontSize:
                                        event.status === "pending"
                                          ? "0.875rem"
                                          : "0.8rem",
                                      color:
                                        event.status === "pending"
                                          ? "rgba(255, 255, 255, 0.7)"
                                          : "rgba(255, 255, 255, 0.5)",
                                    }}
                                  />
                                  <Typography
                                    variant="body2"
                                    noWrap
                                    className="plan-event__deadline-text"
                                    sx={{
                                      fontSize:
                                        event.status === "pending"
                                          ? "0.75rem"
                                          : "0.7rem",
                                      color:
                                        event.status === "pending"
                                          ? "rgba(255, 255, 255, 0.7)"
                                          : "rgba(255, 255, 255, 0.5)",
                                      fontWeight:
                                        event.status === "pending"
                                          ? "500"
                                          : "normal",
                                    }}
                                  >
                                    {dayjs(event.deadline).format(
                                      "YYYY/M/D HH:mm"
                                    )}
                                    まで
                                  </Typography>
                                </Box>
                              </Box>
                            </Paper>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </Box>
                  )}

                  {recentClosedEvents.length > 0 && (
                    <Box
                      className="plan-main__closed-events"
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      <Typography
                        variant="subtitle2"
                        className="plan-main__section-title"
                        sx={{
                          fontSize: "0.875rem",
                          color: "rgba(255, 255, 255, 0.7)",
                          fontWeight: "500",
                          pl: 0.5,
                        }}
                      >
                        最近締め切られたイベント
                      </Typography>
                      <AnimatePresence>
                        {recentClosedEvents
                          .slice(0, displayCount)
                          .map((event, index) => (
                            <motion.div
                              key={event.plan_id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{
                                duration: 0.3,
                                delay: index * 0.05 + 0.2,
                              }}
                            >
                              <Paper
                                onClick={() => handlePlanClick(event.plan_id)}
                                className={`plan-event ${
                                  event.status === "pending"
                                    ? "plan-event--pending"
                                    : "plan-event--closed"
                                }`}
                                sx={{
                                  background: "#1D1D21",
                                  p: 1.25,
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 0.75,
                                  borderRadius: "8px",
                                  border: "1px solid rgba(255, 255, 255, 0.03)",
                                  opacity: 0.85,
                                  "@media (hover: hover)": {
                                    "&:hover": {
                                      background: "#262626",
                                      transform: "none",
                                      boxShadow: "none",
                                      opacity: 1,
                                    },
                                  },
                                }}
                              >
                                <Box
                                  className="plan-event__header"
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <Typography
                                    variant="subtitle2"
                                    className="plan-event__title"
                                    sx={{
                                      fontSize: "0.85rem",
                                      fontWeight: "normal",
                                      color: "rgba(255, 255, 255, 0.7)",
                                      lineHeight: 1.2,
                                      flex: 1,
                                      minWidth: 0,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                    }}
                                  >
                                    {event.plan_title}
                                  </Typography>

                                  <Box
                                    className="plan-event__status"
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      minWidth: "48px",
                                      height: "20px",
                                      borderRadius: "10px",
                                      ml: 2,
                                      bgcolor: "rgba(255, 86, 86, 0.1)",
                                      color: "rgba(255, 86, 86, 0.7)",
                                    }}
                                  >
                                    <Typography
                                      className="plan-event__status-text"
                                      sx={{
                                        fontSize: "0.7rem",
                                        fontWeight: "normal",
                                        letterSpacing: "0.02em",
                                      }}
                                    >
                                      締切
                                    </Typography>
                                  </Box>
                                </Box>

                                <Box
                                  className="plan-event__info"
                                  sx={{
                                    display: "flex",
                                    gap: 2,
                                    alignItems: "center",
                                  }}
                                >
                                  <Box
                                    className="plan-event__creator"
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.75,
                                      backgroundColor:
                                        "rgba(255, 255, 255, 0.03)",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    <PersonIcon
                                      className="plan-event__creator-icon"
                                      sx={{
                                        fontSize: "0.8rem",
                                        color: "rgba(255, 255, 255, 0.5)",
                                      }}
                                    />
                                    <Typography
                                      variant="body2"
                                      className="plan-event__creator-name"
                                      sx={{
                                        fontSize: "0.7rem",
                                        color: "rgba(255, 255, 255, 0.5)",
                                        fontWeight: "normal",
                                      }}
                                    >
                                      {event.creator.name}
                                    </Typography>
                                  </Box>

                                  <Box
                                    className="plan-event__deadline"
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.75,
                                      backgroundColor:
                                        "rgba(255, 255, 255, 0.03)",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      width: "160px",
                                      marginLeft: "auto",
                                      justifyContent: "flex-start",
                                    }}
                                  >
                                    <EventIcon
                                      className="plan-event__deadline-icon"
                                      sx={{
                                        fontSize: "0.8rem",
                                        color: "rgba(255, 255, 255, 0.5)",
                                      }}
                                    />
                                    <Typography
                                      variant="body2"
                                      noWrap
                                      className="plan-event__deadline-text"
                                      sx={{
                                        fontSize: "0.7rem",
                                        color: "rgba(255, 255, 255, 0.5)",
                                        fontWeight: "normal",
                                      }}
                                    >
                                      {dayjs(event.deadline).format(
                                        "YYYY/M/D HH:mm"
                                      )}
                                      まで
                                    </Typography>
                                  </Box>
                                </Box>
                              </Paper>
                            </motion.div>
                          ))}
                      </AnimatePresence>
                      {recentClosedEvents.length > displayCount && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.3 }}
                        >
                          <Box
                            className="plan-main__load-more"
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              mt: 0,
                              width: "100%",
                            }}
                          >
                            <button
                              onClick={() =>
                                setDisplayCount((prev) => prev + 5)
                              }
                              className="plan-main__load-more w-full py-1.5 px-4 rounded-lg bg-[#1D1D21] text-[rgba(255,255,255,0.5)] text-sm font-medium hover:bg-opacity-100 border border-[rgba(255,255,255,0.1)] transition-all duration-200 opacity-85 hover:opacity-100"
                            >
                              もっと見る
                            </button>
                          </Box>
                        </motion.div>
                      )}
                    </Box>
                  )}
                </Box>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Typography
                    variant="body2"
                    className="plan-main__no-events-text"
                    sx={{
                      color: "rgba(255, 255, 255, 0.7)",
                      textAlign: "center",
                      fontSize: "0.875rem",
                    }}
                  >
                    表示できるイベントはありません
                  </Typography>
                </motion.div>
              )}
            </Box>
          </Paper>
        </motion.div>
      </Box>
      <FooterMenu />
    </Box>
  );
};

export default PlanMainPage;
