import { NextPage } from "next";
import { Box, Typography, Button, Paper, IconButton } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { useForm, Controller } from "react-hook-form";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import FooterMenu from "../../components/FooterMenu";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/ja";
import "dayjs/locale/en";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ja } from "date-fns/locale";

// フォームの型定義
type PlanFormData = {
  title: string;
  description: string;
  deadline: string;
};

type DateTimeSelection = {
  id: string;
  date: Dayjs;
  time: string;
};

// リクエストの型定義
interface CreatePlanEventRequest {
  title: string;
  description?: string;
  deadline: string;
  dates: {
    date: string; // ISO 8601形式 (YYYY-MM-DD)
    time: string; // 24時間形式 (HH:mm)
  }[];
  createdBy: number; // emp_no
}

// レスポンスの型定義
interface CreatePlanEventResponse {
  planId: number;
  success: boolean;
  message?: string;
}

const PlanNewEventPage: NextPage = () => {
  const user = useUser();
  const router = useRouter();

  // 日本語ロケールを設定
  dayjs.locale("ja");

  const [selectedDateTimes, setSelectedDateTimes] = useState<
    DateTimeSelection[]
  >([]);
  const [isBulkTimeEdit, setIsBulkTimeEdit] = useState(false);

  // スクロール位置を監視するための参照を追加
  const timeScrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const timeButtonRefs = useRef<{
    [key: string]: { [key: string]: HTMLElement | null };
  }>({});
  const [isScrolling, setIsScrolling] = useState(false);

  // フォームの初期値
  const defaultValues: PlanFormData = {
    title: "",
    description: "",
    deadline: "",
  };

  const { control, handleSubmit } = useForm<PlanFormData>({
    defaultValues,
  });

  // 選択された日付のマップをメモ化
  const selectedDatesMap = useMemo(() => {
    const map = new Map<string, boolean>();
    selectedDateTimes.forEach((dt) => {
      map.set(dt.date.format("YYYY-MM-DD"), true);
    });
    return map;
  }, [selectedDateTimes]);

  // handleDateSelectをuseCallbackでメモ化
  const handleDateSelect = useCallback(
    (date: Dayjs | null) => {
      if (!date) return;

      const formattedDate = date.startOf("day");
      const dateKey = formattedDate.format("YYYY-MM-DD");
      const dateExists = selectedDatesMap.has(dateKey);

      setSelectedDateTimes((prevTimes) => {
        if (dateExists) {
          return prevTimes.filter(
            (dt) => !dt.date.format("YYYY-MM-DD").includes(dateKey)
          );
        }
        return [
          ...prevTimes,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            date: formattedDate,
            time: prevTimes[0]?.time || "12:00",
          },
        ];
      });
    },
    [selectedDatesMap]
  );

  // カスタムDayコンポーネントをメモ化
  const CustomDay = useCallback(
    (props: { day: Dayjs | null }) => {
      if (!props.day) return null;
      const isSelected = selectedDatesMap.has(props.day.format("YYYY-MM-DD"));

      return (
        <Box
          onClick={() => handleDateSelect(props.day)}
          sx={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            borderRadius: "50%",
            bgcolor: isSelected ? "#5b63d3" : "transparent",
            color: "#FCFCFC",
            fontSize: "0.875rem",
            fontWeight: isSelected ? "bold" : "normal",
            margin: "0 auto",
            transition: "background-color 0.15s ease-out",
          }}
        >
          {props.day.date()}
        </Box>
      );
    },
    [selectedDatesMap, handleDateSelect]
  );

  const handleTimeChange = useCallback(
    (dateTime: DateTimeSelection, newTime: string) => {
      setSelectedDateTimes((prevTimes) => {
        if (isBulkTimeEdit) {
          // 一括編集モードの場合、全ての日付の時間を更新
          return prevTimes.map((dt) => ({ ...dt, time: newTime }));
        } else {
          // 個別編集モードの場合、選択された日付の時間のみ更新
          return prevTimes.map((dt) =>
            dt.id === dateTime.id ? { ...dt, time: newTime } : dt
          );
        }
      });
    },
    [isBulkTimeEdit]
  );

  const handleRemoveDateTime = (id: string) => {
    // ホバー状態をリセットするためにフォーカスを外す
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setSelectedDateTimes((prevTimes) => {
      const newTimes = prevTimes.filter((dt) => dt.id !== id);
      // 削除後、残っているイベントがある場合は最後のイベントにフォーカス
      if (newTimes.length > 0) {
        const lastDateTime = newTimes[newTimes.length - 1];
        setTimeout(() => {
          const scrollRef = timeScrollRefs.current[lastDateTime.id];
          const targetElement =
            timeButtonRefs.current[lastDateTime.id]?.[lastDateTime.time];
          if (scrollRef && targetElement) {
            const containerRect = scrollRef.getBoundingClientRect();
            const targetRect = targetElement.getBoundingClientRect();
            const scrollOffset =
              targetRect.left -
              containerRect.left -
              containerRect.width / 2 +
              targetRect.width / 2;
            scrollRef.scrollTo({
              left: scrollRef.scrollLeft + scrollOffset,
              behavior: "smooth",
            });
          }
        }, 0);
      }
      return newTimes;
    });
  };

  // スクロール終了を検知する関数
  const handleScrollEnd = useCallback(
    (dateTime: DateTimeSelection) => {
      if (isBulkTimeEdit) {
        const scrollRef = timeScrollRefs.current["bulk"];
        const buttonRefs = timeButtonRefs.current["bulk"];
        if (!scrollRef || !buttonRefs) return;

        const containerRect = scrollRef.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;

        let closestTime = selectedDateTimes[0]?.time || "12:00";
        let minDistance = Infinity;

        Object.entries(buttonRefs).forEach(([time, element]) => {
          if (!element) return;
          const rect = element.getBoundingClientRect();
          const buttonCenter = rect.left + rect.width / 2;
          const distance = Math.abs(buttonCenter - containerCenter);

          if (distance < minDistance) {
            minDistance = distance;
            closestTime = time;
          }
        });

        if (closestTime !== selectedDateTimes[0]?.time) {
          handleTimeChange(dateTime, closestTime);
        }
      } else {
        const scrollRef = timeScrollRefs.current[dateTime.id];
        const buttonRefs = timeButtonRefs.current[dateTime.id];
        if (!scrollRef || !buttonRefs) return;

        const containerRect = scrollRef.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;

        let closestTime = dateTime.time;
        let minDistance = Infinity;

        Object.entries(buttonRefs).forEach(([time, element]) => {
          if (!element) return;
          const rect = element.getBoundingClientRect();
          const buttonCenter = rect.left + rect.width / 2;
          const distance = Math.abs(buttonCenter - containerCenter);

          if (distance < minDistance) {
            minDistance = distance;
            closestTime = time;
          }
        });

        if (closestTime !== dateTime.time) {
          handleTimeChange(dateTime, closestTime);
        }
      }
    },
    [isBulkTimeEdit, selectedDateTimes, handleTimeChange]
  );

  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    // 一括設定モードのスクロールハンドラー
    if (isBulkTimeEdit) {
      const scrollRef = timeScrollRefs.current["bulk"];
      if (scrollRef) {
        let scrollTimeout: NodeJS.Timeout;

        const handleScroll = () => {
          setIsScrolling(true);
          clearTimeout(scrollTimeout);

          scrollTimeout = setTimeout(() => {
            setIsScrolling(false);
            handleScrollEnd({
              id: "bulk",
              date: selectedDateTimes[0]?.date,
              time: selectedDateTimes[0]?.time,
            });
          }, 150);
        };

        scrollRef.addEventListener("scroll", handleScroll);
        cleanupFunctions.push(() => {
          scrollRef.removeEventListener("scroll", handleScroll);
          clearTimeout(scrollTimeout);
        });
      }
    }

    // 個別の時間選択のスクロールハンドラー
    selectedDateTimes.forEach((dateTime) => {
      if (isBulkTimeEdit) return;

      const scrollRef = timeScrollRefs.current[dateTime.id];
      if (!scrollRef) return;

      let scrollTimeout: NodeJS.Timeout;

      const handleScroll = () => {
        setIsScrolling(true);
        clearTimeout(scrollTimeout);

        scrollTimeout = setTimeout(() => {
          setIsScrolling(false);
          handleScrollEnd(dateTime);
        }, 150);
      };

      scrollRef.addEventListener("scroll", handleScroll);
      cleanupFunctions.push(() => {
        scrollRef.removeEventListener("scroll", handleScroll);
        clearTimeout(scrollTimeout);
      });
    });

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [handleScrollEnd, selectedDateTimes, isBulkTimeEdit]);

  // モード切り替え時のスクロール位置リセット
  useEffect(() => {
    if (isBulkTimeEdit) {
      // 一括設定モードに切り替わった時
      const scrollRef = timeScrollRefs.current["bulk"];
      const targetElement =
        timeButtonRefs.current["bulk"]?.[selectedDateTimes[0]?.time || "12:00"];
      if (scrollRef && targetElement) {
        const containerRect = scrollRef.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        const scrollOffset =
          targetRect.left -
          containerRect.left -
          containerRect.width / 2 +
          targetRect.width / 2;
        scrollRef.scrollTo({
          left: scrollRef.scrollLeft + scrollOffset,
          behavior: "smooth",
        });
      }
    } else {
      // 個別設定モードに切り替わった時
      selectedDateTimes.forEach((dateTime) => {
        const scrollRef = timeScrollRefs.current[dateTime.id];
        const targetElement =
          timeButtonRefs.current[dateTime.id]?.[dateTime.time];
        if (scrollRef && targetElement) {
          const containerRect = scrollRef.getBoundingClientRect();
          const targetRect = targetElement.getBoundingClientRect();
          const scrollOffset =
            targetRect.left -
            containerRect.left -
            containerRect.width / 2 +
            targetRect.width / 2;
          scrollRef.scrollTo({
            left: scrollRef.scrollLeft + scrollOffset,
            behavior: "smooth",
          });
        }
      });
    }
  }, [isBulkTimeEdit, selectedDateTimes]);

  const onSubmit = async (data: PlanFormData) => {
    try {
      console.log("User:", user);

      if (!user?.email) {
        alert("ログインが必要です");
        return;
      }

      // ユーザー情報の取得
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: userData, error: userError } = await supabase
        .from("USER_INFO")
        .select("emp_no")
        .eq("email", user.email)
        .single();

      if (userError) {
        console.error("User error:", userError);
        alert("ユーザー情報の取得に失敗しました");
        return;
      }

      if (!userData) {
        console.error("User data not found for email:", user.email);
        alert("ユーザー情報が見つかりません");
        return;
      }

      console.log("Creating plan with data:", {
        title: data.title,
        description: data.description,
        deadline: data.deadline,
        dates: selectedDateTimes.map((dt) => ({
          date: dt.date.format("YYYY-MM-DD"),
          time: dt.time,
        })),
        createdBy: userData.emp_no,
      });

      const response = await createPlanEvent({
        title: data.title,
        description: data.description,
        deadline: data.deadline,
        dates: selectedDateTimes.map((dt) => ({
          date: dt.date.format("YYYY-MM-DD"),
          time: dt.time,
        })),
        createdBy: userData.emp_no,
      });

      console.log("Plan creation response:", response);

      if (response.success) {
        router.push("/plans/planMainPage");
      } else {
        alert(response.message || "エラーが発生しました");
      }
    } catch (error) {
      console.error("Error submitting plan:", error);
      alert("予定の作成に失敗しました");
    }
  };

  // 時間選択オプション
  const timeOptions = Array.from({ length: 97 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  });

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
      <Box
        className="plan-new-event-container"
        sx={{
          minHeight: "100vh",
          color: "#FCFCFC",
          pb: "84px", // フッターメニューの高さ + 余白
          position: "relative",
        }}
      >
        <Box
          component="form"
          className="plan-new-event-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            p: 1.5,
            maxWidth: "600px",
            mx: "auto",
            mb: 2.5, // 作成ボタンの下の余白を追加
          }}
        >
          <Paper
            elevation={0}
            className="plan-new-event-paper"
            sx={{
              p: 1.5,
              mb: 2,
              bgcolor: "#2D2D2D",
              borderRadius: "8px",
            }}
          >
            <Controller
              name="title"
              control={control}
              rules={{ required: "タイトルは必須です" }}
              render={({ field, fieldState }) => (
                <div className="mb-1.5">
                  <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                    タイトル<span className="text-red-500">*</span>
                  </label>
                  <input
                    {...field}
                    type="text"
                    className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] h-[40px]"
                    required
                  />
                  {fieldState.error && (
                    <div className="text-red-500 text-sm mt-1">
                      {fieldState.error.message}
                    </div>
                  )}
                </div>
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <div className="mb-0">
                  <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                    備考
                  </label>
                  <textarea
                    {...field}
                    className="w-full bg-[#1D1D21] rounded p-2 h-[96px] text-[#FCFCFC] resize-none"
                  />
                </div>
              )}
            />

            <Controller
              name="deadline"
              control={control}
              rules={{ required: "締切日時は必須です" }}
              render={({ field, fieldState }) => (
                <div className="mb-1.5">
                  <label className="block text-xs font-medium mb-1 text-[#ACACAC]">
                    締切日時<span className="text-red-500">*</span>
                  </label>
                  <LocalizationProvider
                    dateAdapter={AdapterDateFns}
                    adapterLocale={ja}
                  >
                    <DateTimePicker
                      value={field.value ? new Date(field.value) : null}
                      onChange={(date) => field.onChange(date?.toISOString())}
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
                  {fieldState.error && (
                    <div className="text-red-500 text-sm mt-1">
                      {fieldState.error.message}
                    </div>
                  )}
                </div>
              )}
            />

            <Box
              className="plan-calendar-section"
              sx={{
                bgcolor: "#262626",
                borderRadius: 1,
                p: 1.5,
              }}
            >
              <Box
                sx={{
                  color: "rgba(255, 255, 255, 0.7)",
                  fontWeight: "medium",
                  fontSize: "1rem",
                  height: "32px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: "1rem",
                  }}
                >
                  候補日（複数選択可）
                </Typography>
                {selectedDateTimes.length > 0 && (
                  <Box
                    onClick={() => setSelectedDateTimes([])}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      fontSize: "0.75rem",
                      color: "#8E93DA",
                      bgcolor: "rgba(142, 147, 218, 0.1)",
                      padding: "4px 12px",
                      borderRadius: "12px",
                      cursor: "pointer",
                      transition: "all 0.15s ease-out",
                      "&:hover": {
                        bgcolor: "rgba(142, 147, 218, 0.2)",
                      },
                      "&:active": {
                        bgcolor: "rgba(142, 147, 218, 0.3)",
                      },
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: "bold",
                      }}
                    >
                      {selectedDateTimes.length}日選択中
                    </Typography>
                    <CloseIcon sx={{ fontSize: "1rem" }} />
                  </Box>
                )}
              </Box>

              <DateCalendar
                value={null}
                onChange={handleDateSelect}
                className="plan-date-calendar"
                sx={{
                  width: "100%",
                  height: "290px",
                  "& .MuiPickersCalendarHeader-root": {
                    paddingLeft: 1,
                    paddingRight: 1,
                    marginTop: 0,
                    marginBottom: 1,
                    "& .MuiPickersArrowSwitcher-root": {
                      "& .MuiIconButton-root": {
                        color: "#FCFCFC",
                      },
                    },
                    "& .MuiPickersCalendarHeader-labelContainer": {
                      color: "#FCFCFC",
                    },
                  },
                  "& .MuiYearCalendar-root": {
                    "& .MuiPickersYear-yearButton": {
                      color: "#FCFCFC",
                      "&.Mui-selected": {
                        backgroundColor: "#5b63d3",
                      },
                    },
                  },
                  "& .MuiDayCalendar-header, & .MuiDayCalendar-weekContainer": {
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    justifyContent: "center",
                  },
                  "& .MuiDayCalendar-weekContainer": {
                    margin: 0,
                  },
                  "& .MuiPickersDay-root": {
                    color: "#FCFCFC",
                    width: 36,
                    height: 36,
                    fontSize: "0.875rem",
                    margin: "0 auto",
                    "&.Mui-selected": {
                      bgcolor: "#5b63d3",
                    },
                  },
                  "& .MuiDayCalendar-weekDayLabel": {
                    color: "rgba(255, 255, 255, 0.7)",
                    width: 36,
                    height: 36,
                    margin: "0 auto",
                    fontSize: "0.75rem",
                  },
                  "& .MuiPickersCalendarHeader-label": {
                    color: "#FCFCFC",
                    fontSize: "0.875rem",
                  },
                  "& .MuiPickersCalendarHeader-switchViewButton": {
                    color: "#FCFCFC",
                    width: 32,
                    height: 32,
                  },
                  "& .MuiPickersCalendarHeader-switchViewIcon": {
                    fontSize: "1.25rem",
                    color: "#FCFCFC",
                  },
                  "& .MuiPickersDay-today": {
                    borderColor: "#8E93DA",
                  },
                  "& .MuiDayCalendar-monthContainer": {
                    marginBottom: 0,
                  },
                }}
                slots={{
                  day: CustomDay,
                }}
              />

              {selectedDateTimes.length > 0 && (
                <Box
                  className="plan-time-selection-container"
                  sx={{
                    mt: 1.5,
                    pt: 1.5,
                    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <Box
                    className="plan-time-selection-header"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <AccessTimeIcon
                        sx={{
                          color: "rgba(255, 255, 255, 0.7)",
                          fontSize: "1rem",
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: "rgba(255, 255, 255, 0.7)",
                          fontSize: "0.875rem",
                        }}
                      >
                        開始時間を選択
                      </Typography>
                    </Box>
                    <Box
                      className="plan-bulk-edit-toggle"
                      onClick={() => setIsBulkTimeEdit(!isBulkTimeEdit)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        cursor: "pointer",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        bgcolor: isBulkTimeEdit ? "#5b63d3" : "#37373F",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.75rem",
                          color: isBulkTimeEdit
                            ? "#FCFCFC"
                            : "rgba(255, 255, 255, 0.7)",
                        }}
                      >
                        一括時間設定
                      </Typography>
                      <Box
                        sx={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          bgcolor: isBulkTimeEdit
                            ? "#FCFCFC"
                            : "rgba(255, 255, 255, 0.3)",
                          transition: "all 0.2s ease",
                        }}
                      />
                    </Box>
                  </Box>

                  {isBulkTimeEdit && (
                    <Box
                      className="plan-bulk-time-selector"
                      sx={{
                        position: "relative",
                        height: "40px",
                        mb: 2,
                        bgcolor: "#1D1D21",
                        "&::before, &::after": {
                          content: '""',
                          position: "absolute",
                          left: 0,
                          right: 0,
                          height: "40%",
                          pointerEvents: "none",
                          zIndex: 1,
                        },
                        "&::before": {
                          top: 0,
                          background:
                            "linear-gradient(to bottom, rgba(29, 29, 33, 1) 0%, rgba(29, 29, 33, 0) 100%)",
                        },
                        "&::after": {
                          bottom: 0,
                          background:
                            "linear-gradient(to top, rgba(29, 29, 33, 1) 0%, rgba(29, 29, 33, 0) 100%)",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          width: "72px",
                          height: "32px",
                          transform: "translate(-50%, -50%)",
                          border: "2px solid #5b63d3",
                          borderRadius: "4px",
                          pointerEvents: "none",
                          zIndex: 2,
                        }}
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          bottom: 0,
                          left: 0,
                          width: "25%",
                          background:
                            "linear-gradient(to right, rgba(29, 29, 33, 1) 0%, rgba(29, 29, 33, 0) 100%)",
                          pointerEvents: "none",
                          zIndex: 2,
                        }}
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          bottom: 0,
                          right: 0,
                          width: "25%",
                          background:
                            "linear-gradient(to left, rgba(29, 29, 33, 1) 0%, rgba(29, 29, 33, 0) 100%)",
                          pointerEvents: "none",
                          zIndex: 2,
                        }}
                      />
                      <Box
                        ref={(el: HTMLDivElement | null) => {
                          if (el) {
                            timeScrollRefs.current["bulk"] = el;
                          } else {
                            delete timeScrollRefs.current["bulk"];
                          }
                        }}
                        className="plan-time-scroll-container"
                        sx={{
                          position: "relative",
                          display: "flex",
                          gap: 2,
                          height: "100%",
                          overflowX: "auto",
                          overflowY: "hidden",
                          scrollSnapType: "x proximity",
                          WebkitOverflowScrolling: "touch",
                          scrollBehavior: "smooth",
                          msOverflowStyle: "none",
                          scrollbarWidth: "none",
                          "&::-webkit-scrollbar": {
                            display: "none",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            flex: "0 0 calc(50% - 36px)",
                            minWidth: "calc(50% - 36px)",
                          }}
                        />
                        {timeOptions.map((time) => (
                          <Box
                            key={time}
                            className="plan-time-option"
                            ref={(el: HTMLDivElement | null) => {
                              if (el) {
                                if (!timeButtonRefs.current["bulk"]) {
                                  timeButtonRefs.current["bulk"] = {};
                                }
                                timeButtonRefs.current["bulk"][time] = el;
                              } else if (timeButtonRefs.current["bulk"]) {
                                delete timeButtonRefs.current["bulk"][time];
                              }
                            }}
                            onClick={() => {
                              setSelectedDateTimes((prevTimes) =>
                                prevTimes.map((dt) => ({ ...dt, time }))
                              );
                            }}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "72px",
                              height: "100%",
                              color:
                                selectedDateTimes[0]?.time === time
                                  ? "#FCFCFC"
                                  : "rgba(255, 255, 255, 0.7)",
                              fontSize: "0.875rem",
                              fontWeight: "bold",
                              scrollSnapAlign: "center",
                              scrollSnapStop: "normal",
                              transition: isScrolling
                                ? "none"
                                : "all 0.2s ease",
                              opacity:
                                selectedDateTimes[0]?.time === time ? 1 : 0.7,
                              userSelect: "none",
                              cursor: "pointer",
                            }}
                          >
                            {time}
                          </Box>
                        ))}
                        <Box
                          sx={{
                            flex: "0 0 calc(50% - 36px)",
                            minWidth: "calc(50% - 36px)",
                          }}
                        />
                      </Box>
                    </Box>
                  )}

                  {selectedDateTimes
                    .sort((a, b) => a.date.valueOf() - b.date.valueOf())
                    .map((dateTime) => (
                      <Box
                        key={dateTime.id}
                        className="plan-date-time-item"
                        sx={{
                          mb: 1,
                          px: 1,
                          pb: isBulkTimeEdit ? 0 : 1,
                          bgcolor: "rgba(255, 255, 255, 0.05)",
                          borderRadius: "4px",
                        }}
                      >
                        <Box
                          className="plan-date-time-header"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography
                            variant="body2"
                            className="plan-date-label"
                            sx={{
                              fontSize: "0.875rem",
                              pl: 0.5,
                              color: "#FCFCFC",
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <span>{dateTime.date.format("MM/DD")}</span>
                            <span>
                              {dateTime.date
                                .locale("en")
                                .format("ddd")
                                .toLowerCase()}
                              .
                            </span>
                            {selectedDateTimes.filter((dt) =>
                              dt.date.isSame(dateTime.date, "day")
                            ).length > 1 && (
                              <span>
                                {` (${
                                  selectedDateTimes
                                    .filter((dt) =>
                                      dt.date.isSame(dateTime.date, "day")
                                    )
                                    .findIndex((dt) => dt.id === dateTime.id) +
                                  1
                                })`}
                              </span>
                            )}
                          </Typography>
                          <Box
                            className="plan-date-actions"
                            sx={{ display: "flex", gap: 0.5 }}
                          >
                            {!isBulkTimeEdit && (
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const newDateTime = {
                                    id: `${Date.now()}-${Math.random()
                                      .toString(36)
                                      .slice(2, 11)}`,
                                    date: dayjs(dateTime.date),
                                    time: selectedDateTimes[0]?.time || "12:00",
                                  };
                                  setSelectedDateTimes((prevTimes) => [
                                    ...prevTimes,
                                    newDateTime,
                                  ]);
                                }}
                                sx={{
                                  color: "rgba(255, 255, 255, 0.5)",
                                  padding: 0.5,
                                }}
                              >
                                <AddIcon sx={{ fontSize: "1.25rem" }} />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveDateTime(dateTime.id)}
                              sx={{
                                color: "rgba(255, 255, 255, 0.5)",
                                padding: 0.5,
                              }}
                            >
                              <DeleteIcon sx={{ fontSize: "1.25rem" }} />
                            </IconButton>
                          </Box>
                        </Box>
                        {!isBulkTimeEdit && (
                          <Box
                            className="plan-individual-time-selector"
                            sx={{
                              position: "relative",
                              height: "40px",
                              bgcolor: "#1D1D21",
                              "&::before, &::after": {
                                content: '""',
                                position: "absolute",
                                left: 0,
                                right: 0,
                                height: "40%",
                                pointerEvents: "none",
                                zIndex: 1,
                              },
                              "&::before": {
                                top: 0,
                                background:
                                  "linear-gradient(to bottom, rgba(29, 29, 33, 1) 0%, rgba(29, 29, 33, 0) 100%)",
                              },
                              "&::after": {
                                bottom: 0,
                                background:
                                  "linear-gradient(to top, rgba(29, 29, 33, 1) 0%, rgba(29, 29, 33, 0) 100%)",
                              },
                            }}
                          >
                            <Box
                              sx={{
                                position: "absolute",
                                left: "50%",
                                top: "50%",
                                width: "72px",
                                height: "32px",
                                transform: "translate(-50%, -50%)",
                                border: "2px solid #5b63d3",
                                borderRadius: "4px",
                                pointerEvents: "none",
                                zIndex: 2,
                              }}
                            />
                            <Box
                              sx={{
                                position: "absolute",
                                top: 0,
                                bottom: 0,
                                left: 0,
                                width: "25%",
                                background:
                                  "linear-gradient(to right, rgba(29, 29, 33, 1) 0%, rgba(29, 29, 33, 0) 100%)",
                                pointerEvents: "none",
                                zIndex: 2,
                              }}
                            />
                            <Box
                              sx={{
                                position: "absolute",
                                top: 0,
                                bottom: 0,
                                right: 0,
                                width: "25%",
                                background:
                                  "linear-gradient(to left, rgba(29, 29, 33, 1) 0%, rgba(29, 29, 33, 0) 100%)",
                                pointerEvents: "none",
                                zIndex: 2,
                              }}
                            />
                            <Box
                              ref={(el: HTMLDivElement | null) => {
                                if (el) {
                                  timeScrollRefs.current[dateTime.id] = el;
                                } else {
                                  delete timeScrollRefs.current[dateTime.id];
                                }
                              }}
                              sx={{
                                position: "relative",
                                display: "flex",
                                gap: 2,
                                height: "100%",
                                overflowX: "auto",
                                overflowY: "hidden",
                                scrollSnapType: "x proximity",
                                WebkitOverflowScrolling: "touch",
                                scrollBehavior: "smooth",
                                msOverflowStyle: "none",
                                scrollbarWidth: "none",
                                "&::-webkit-scrollbar": {
                                  display: "none",
                                },
                              }}
                            >
                              <Box
                                sx={{
                                  flex: "0 0 calc(50% - 36px)",
                                  minWidth: "calc(50% - 36px)",
                                }}
                              />
                              {timeOptions.map((time) => (
                                <Box
                                  key={time}
                                  ref={(el: HTMLDivElement | null) => {
                                    if (el) {
                                      if (
                                        !timeButtonRefs.current[dateTime.id]
                                      ) {
                                        timeButtonRefs.current[dateTime.id] =
                                          {};
                                      }
                                      timeButtonRefs.current[dateTime.id][
                                        time
                                      ] = el;
                                    } else if (
                                      timeButtonRefs.current[dateTime.id]
                                    ) {
                                      delete timeButtonRefs.current[
                                        dateTime.id
                                      ][time];
                                    }
                                  }}
                                  onClick={() =>
                                    handleTimeChange(dateTime, time)
                                  }
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "72px",
                                    height: "100%",
                                    color:
                                      dateTime.time === time
                                        ? "#FCFCFC"
                                        : "rgba(255, 255, 255, 0.7)",
                                    fontSize: "0.875rem",
                                    fontWeight: "bold",
                                    scrollSnapAlign: "center",
                                    scrollSnapStop: "normal",
                                    transition: isScrolling
                                      ? "none"
                                      : "all 0.15s ease-out",
                                    opacity: dateTime.time === time ? 1 : 0.7,
                                    userSelect: "none",
                                    cursor: "pointer",
                                  }}
                                >
                                  {time}
                                </Box>
                              ))}
                              <Box
                                sx={{
                                  flex: "0 0 calc(50% - 36px)",
                                  minWidth: "calc(50% - 36px)",
                                }}
                              />
                            </Box>
                          </Box>
                        )}
                      </Box>
                    ))}
                </Box>
              )}
            </Box>
          </Paper>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            className="plan-submit-button"
            disabled={selectedDateTimes.length === 0}
            sx={{
              bgcolor: "#5b63d3",
              color: "#FCFCFC",
              py: 1,
              fontSize: "0.875rem",
              fontWeight: "bold",
              "&:hover": {
                bgcolor: "#4850c9",
              },
              "&.Mui-disabled": {
                bgcolor: "rgba(91, 99, 211, 0.3)",
                color: "rgba(255, 255, 255, 0.3)",
              },
            }}
          >
            作成する
          </Button>
        </Box>
        <FooterMenu />
      </Box>
    </LocalizationProvider>
  );
};

export default PlanNewEventPage;

// バリデーション用の関数
function validatePlanEventRequest(req: CreatePlanEventRequest): string | null {
  if (!req.title.trim()) {
    return "タイトルは必須です";
  }

  if (!req.deadline) {
    return "締切日時は必須です";
  }

  if (!dayjs(req.deadline).isValid()) {
    return "不正な締切日時です";
  }

  if (!req.dates.length) {
    return "候補日時を少なくとも1つ選択してください";
  }

  for (const date of req.dates) {
    if (!dayjs(`${date.date} ${date.time}`).isValid()) {
      return "不正な日時が含まれています";
    }
  }

  if (!req.createdBy || req.createdBy <= 0) {
    return "不正なユーザー情報です";
  }

  return null;
}

// API関数内でバリデーションを実行
export async function createPlanEvent(
  req: CreatePlanEventRequest
): Promise<CreatePlanEventResponse> {
  // バリデーション
  const validationError = validatePlanEventRequest(req);
  if (validationError) {
    return {
      planId: 0,
      success: false,
      message: validationError,
    };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { data, error } = await supabase.rpc("create_plan_event", {
      p_title: req.title,
      p_description: req.description || "",
      p_deadline: req.deadline,
      p_created_by: req.createdBy,
      p_dates: req.dates.map((d) => ({
        datetime: `${d.date} ${d.time}`,
      })),
    });

    if (error) throw error;

    if (!data.success) {
      return {
        planId: 0,
        success: false,
        message: data.message || "イベントの作成に失敗しました",
      };
    }

    return {
      planId: data.plan_id,
      success: true,
    };
  } catch (error) {
    console.error("Error creating plan event:", error);
    return {
      planId: 0,
      success: false,
      message: "イベントの作成に失敗しました",
    };
  }
}
