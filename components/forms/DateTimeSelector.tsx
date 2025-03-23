import { Box, Typography, IconButton } from "@mui/material";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { Dayjs } from "dayjs";
import { useCallback, useRef, useState, useEffect } from "react";
import { DateTimeSelection } from "../../types/plan";

interface DateTimeSelectorProps {
  selectedDateTimes: DateTimeSelection[];
  onDateTimeSelect: (dateTimes: DateTimeSelection[]) => void;
  timeOptions: string[];
}

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  selectedDateTimes,
  onDateTimeSelect,
  timeOptions,
}) => {
  const [isBulkTimeEdit, setIsBulkTimeEdit] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const timeScrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const timeButtonRefs = useRef<{
    [key: string]: { [key: string]: HTMLElement | null };
  }>({});

  // カスタムDayコンポーネント
  const CustomDay = useCallback(
    (props: { day: Dayjs | null }) => {
      if (!props.day) return null;
      const isSelected = selectedDateTimes.some(
        (dt) => dt.date.format("YYYY-MM-DD") === props.day?.format("YYYY-MM-DD")
      );

      return (
        <Box
          onClick={() => handleDateSelect(props.day)}
          className={`date-time-selector__day ${
            isSelected ? "date-time-selector__day--selected" : ""
          }`}
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
    [selectedDateTimes]
  );

  const handleDateSelect = useCallback(
    (date: Dayjs | null) => {
      if (!date) return;

      // 過去日のチェック
      if (date.isBefore(new Date(), "day")) {
        return;
      }

      const formattedDate = date.startOf("day");
      const dateKey = formattedDate.format("YYYY-MM-DD");
      const dateExists = selectedDateTimes.some(
        (dt) => dt.date.format("YYYY-MM-DD") === dateKey
      );

      if (dateExists) {
        onDateTimeSelect(
          selectedDateTimes.filter(
            (dt) => dt.date.format("YYYY-MM-DD") !== dateKey
          )
        );
      } else {
        onDateTimeSelect([
          ...selectedDateTimes,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            date: formattedDate,
            time: selectedDateTimes[0]?.time || "12:00",
          },
        ]);
      }
    },
    [selectedDateTimes, onDateTimeSelect]
  );

  const handleTimeChange = useCallback(
    (dateTime: DateTimeSelection, newTime: string) => {
      onDateTimeSelect(
        selectedDateTimes.map((dt) => {
          if (isBulkTimeEdit) {
            return { ...dt, time: newTime };
          }
          return dt.id === dateTime.id ? { ...dt, time: newTime } : dt;
        })
      );
    },
    [isBulkTimeEdit, selectedDateTimes, onDateTimeSelect]
  );

  const handleRemoveDateTime = (id: string) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onDateTimeSelect(selectedDateTimes.filter((dt) => dt.id !== id));
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

  return (
    <Box className="date-time-selector">
      <Box
        className="date-time-selector__header"
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
          className="date-time-selector__title"
          sx={{
            fontSize: "0.75rem",
            fontWeight: "medium",
            color: "#ACACAC",
            display: "flex",
            alignItems: "center",
          }}
        >
          候補日（複数選択可）
          <Box
            component="span"
            className="date-time-selector__required"
            sx={{ color: "#f43f5e", ml: 0.5 }}
          >
            *
          </Box>
        </Typography>
        {selectedDateTimes.length > 0 && (
          <Box
            onClick={() => onDateTimeSelect([])}
            className="date-time-selector__clear"
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
              className="date-time-selector__selected-count"
              sx={{
                fontSize: "0.875rem",
                fontWeight: "bold",
              }}
            >
              {selectedDateTimes.length}日選択中
            </Typography>
            <CloseIcon
              className="date-time-selector__clear-icon"
              sx={{ fontSize: "1rem" }}
            />
          </Box>
        )}
      </Box>

      <DateCalendar
        value={null}
        onChange={handleDateSelect}
        className="date-time-selector__calendar"
        slots={{
          day: CustomDay,
        }}
        disablePast
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
            "&.Mui-disabled": {
              color: "rgba(255, 255, 255, 0.3)",
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
      />

      {selectedDateTimes.length > 0 && (
        <Box
          className="date-time-selector__time-selection"
          sx={{
            mt: 1.5,
            pt: 1.5,
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Box
            className="date-time-selector__time-header"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1,
            }}
          >
            <Box
              className="date-time-selector__time-title"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <AccessTimeIcon
                className="date-time-selector__time-icon"
                sx={{
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: "1rem",
                }}
              />
              <Typography
                variant="body2"
                className="date-time-selector__time-label"
                sx={{
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: "0.875rem",
                }}
              >
                開始時間を選択
              </Typography>
            </Box>
            <Box
              className={`date-time-selector__bulk-toggle ${
                isBulkTimeEdit ? "date-time-selector__bulk-toggle--active" : ""
              }`}
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
                className="date-time-selector__bulk-toggle-text"
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
                className="date-time-selector__bulk-toggle-indicator"
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

          {isBulkTimeEdit ? (
            <Box
              className="date-time-selector__bulk-time-selector"
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
                ref={(el: HTMLDivElement | null) => {
                  if (el) {
                    timeScrollRefs.current["bulk"] = el;
                  } else {
                    delete timeScrollRefs.current["bulk"];
                  }
                }}
                className="date-time-selector__time-scroll-container"
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
                    className="date-time-selector__time-option"
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
                      handleTimeChange(
                        {
                          id: "bulk",
                          date: selectedDateTimes[0]?.date,
                          time: selectedDateTimes[0]?.time,
                        },
                        time
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
                      transition: isScrolling ? "none" : "all 0.2s ease",
                      opacity: selectedDateTimes[0]?.time === time ? 1 : 0.7,
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
          ) : (
            selectedDateTimes
              .sort((a, b) => a.date.valueOf() - b.date.valueOf())
              .map((dateTime) => (
                <Box
                  key={dateTime.id}
                  className="date-time-selector__date-time-item"
                  sx={{
                    mb: 1,
                    px: 1,
                    pb: 1,
                    bgcolor: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "4px",
                  }}
                >
                  <Box
                    className="date-time-selector__date-time-header"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      className="date-time-selector__date-label"
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
                      <span>{dateTime.date.format("ddd")}</span>
                      {selectedDateTimes.filter((dt) =>
                        dt.date.isSame(dateTime.date, "day")
                      ).length > 1 && (
                        <span>
                          {` (${
                            selectedDateTimes
                              .filter((dt) =>
                                dt.date.isSame(dateTime.date, "day")
                              )
                              .findIndex((dt) => dt.id === dateTime.id) + 1
                          })`}
                        </span>
                      )}
                    </Typography>
                    <Box
                      className="date-time-selector__date-actions"
                      sx={{ display: "flex", gap: 0.5 }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => {
                          const newDateTime = {
                            id: `${Date.now()}-${Math.random()
                              .toString(36)
                              .slice(2, 11)}`,
                            date: dateTime.date,
                            time: selectedDateTimes[0]?.time || "12:00",
                          };
                          onDateTimeSelect([...selectedDateTimes, newDateTime]);
                        }}
                        sx={{
                          color: "rgba(255, 255, 255, 0.5)",
                          padding: 0.5,
                        }}
                      >
                        <AddIcon sx={{ fontSize: "1.25rem" }} />
                      </IconButton>
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
                  <Box
                    className="date-time-selector__individual-time-selector"
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
                      ref={(el: HTMLDivElement | null) => {
                        if (el) {
                          timeScrollRefs.current[dateTime.id] = el;
                        } else {
                          delete timeScrollRefs.current[dateTime.id];
                        }
                      }}
                      className="date-time-selector__time-scroll-container"
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
                          className="date-time-selector__time-option"
                          ref={(el: HTMLDivElement | null) => {
                            if (el) {
                              if (!timeButtonRefs.current[dateTime.id]) {
                                timeButtonRefs.current[dateTime.id] = {};
                              }
                              timeButtonRefs.current[dateTime.id][time] = el;
                            } else if (timeButtonRefs.current[dateTime.id]) {
                              delete timeButtonRefs.current[dateTime.id][time];
                            }
                          }}
                          onClick={() => handleTimeChange(dateTime, time)}
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
                </Box>
              ))
          )}
        </Box>
      )}
    </Box>
  );
};
