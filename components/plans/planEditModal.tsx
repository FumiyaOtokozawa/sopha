import { Box, Typography, Modal, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { PlanEventForm } from "../forms/PlanEventForm";
import { DateTimeSelector } from "../forms/DateTimeSelector";
import { useForm } from "react-hook-form";
import { PlanFormData } from "../../types/plan";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { DateTimeSelection } from "../../types/plan";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/ja";

// プラグインを設定
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Tokyo");
dayjs.locale("ja");

interface PlanEditModalProps {
  open: boolean;
  onClose: () => void;
  planEvent: {
    plan_id: number;
    plan_title: string;
    description: string | null;
    deadline: string;
    dates: {
      date_id: number;
      datetime: string;
    }[];
  } | null;
  onSubmit: (
    data: PlanFormData,
    selectedDateTimes: DateTimeSelection[]
  ) => Promise<void>;
}

export const PlanEditModal: React.FC<PlanEditModalProps> = ({
  open,
  onClose,
  planEvent,
  onSubmit,
}) => {
  const { control, reset, handleSubmit } = useForm<PlanFormData>();
  const [selectedDateTimes, setSelectedDateTimes] = useState<
    DateTimeSelection[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 15分刻みの時間オプションを生成
  const timeOptions = Array.from({ length: 96 }, (_, i) => {
    const hour = Math.floor(i / 4)
      .toString()
      .padStart(2, "0");
    const minute = ((i % 4) * 15).toString().padStart(2, "0");
    return `${hour}:${minute}`;
  });

  useEffect(() => {
    if (planEvent) {
      // フォームの初期値を設定
      reset({
        title: planEvent.plan_title,
        description: planEvent.description || "",
        deadline: planEvent.deadline,
      });

      // 日時選択の初期値を設定
      const initialDateTimes = planEvent.dates.map((date) => {
        const dateTime = dayjs(date.datetime).tz("Asia/Tokyo");
        const minutes = dateTime.minute();
        // 15分単位で丸める
        const roundedMinutes = Math.round(minutes / 15) * 15;
        const adjustedTime = dateTime.minute(roundedMinutes);

        return {
          id: `existing-${date.date_id}`,
          date: dateTime,
          time: adjustedTime.format("HH:mm"),
        };
      });
      setSelectedDateTimes(initialDateTimes);
    }
  }, [planEvent, reset]);

  const handleFormSubmit = async (formData: PlanFormData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // 締め切り日時のタイムゾーン調整
      const adjustedFormData: PlanFormData = {
        ...formData,
        deadline: formData.deadline
          ? new Date(
              new Date(formData.deadline).getTime() -
                new Date(formData.deadline).getTimezoneOffset() * 60000
            ).toISOString()
          : formData.deadline,
      };

      // 重複する日時を排除
      const uniqueDateTimes = Array.from(
        new Set(
          selectedDateTimes.map(
            (dt) => `${dt.date.format("YYYY-MM-DD")}_${dt.time}`
          )
        )
      ).map((dateTimeStr) => {
        const [dateStr, time] = dateTimeStr.split("_");
        return {
          id:
            selectedDateTimes.find(
              (dt) =>
                dt.date.format("YYYY-MM-DD") === dateStr && dt.time === time
            )?.id || `new-${Date.now()}`,
          date: dayjs(dateStr),
          time: time,
        };
      });

      await onSubmit(adjustedFormData, uniqueDateTimes);
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
      <Modal
        open={open}
        onClose={onClose}
        aria-labelledby="plan-edit-modal-title"
        disableEnforceFocus
        disableAutoFocus
        keepMounted={false}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-edit-modal-title"
          sx={{
            position: "relative",
            width: "100%",
            maxWidth: "600px",
            maxHeight: "90vh",
            bgcolor: "#2D2D2D",
            borderRadius: 2,
            p: 3,
            mx: 2,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            outline: "none",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography
              id="plan-edit-modal-title"
              variant="h6"
              sx={{
                color: "#FCFCFC",
                fontSize: "1.125rem",
                fontWeight: "bold",
              }}
            >
              イベントを編集
            </Typography>
            <IconButton
              onClick={onClose}
              aria-label="閉じる"
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                "&:hover": {
                  color: "#FCFCFC",
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <PlanEventForm control={control} />

            <Box sx={{ mt: 3 }}>
              <DateTimeSelector
                selectedDateTimes={selectedDateTimes}
                onDateTimeSelect={setSelectedDateTimes}
                timeOptions={timeOptions}
              />
            </Box>

            <Box
              sx={{
                mt: 3,
                display: "flex",
                gap: 2,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "8px 24px",
                  borderRadius: "8px",
                  backgroundColor: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#FCFCFC",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: "8px 24px",
                  borderRadius: "8px",
                  backgroundColor: "#5b63d3",
                  border: "none",
                  color: "#FCFCFC",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  opacity: isSubmitting ? 0.7 : 1,
                  transition: "all 0.2s ease",
                }}
              >
                {isSubmitting ? "保存中..." : "保存する"}
              </button>
            </Box>
          </form>
        </Box>
      </Modal>
    </LocalizationProvider>
  );
};
