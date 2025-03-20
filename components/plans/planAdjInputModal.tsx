import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
} from "@mui/material";
import CircleOutlinedIcon from "@mui/icons-material/CircleOutlined";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import EventIcon from "@mui/icons-material/Event";
import dayjs from "dayjs";
import "dayjs/locale/ja";

// 曜日の漢字マッピング
const weekdayKanji = ["日", "月", "火", "水", "木", "金", "土"];

// 日付フォーマットのヘルパー関数
const formatDateWithKanji = (datetime: string) => {
  const date = dayjs(datetime);
  const weekday = weekdayKanji[date.day()];
  return date.format(`MM/DD（${weekday}）HH:mm`);
};

interface PlanDate {
  date_id: number;
  datetime: string;
}

interface PlanAdjInputModalProps {
  open: boolean;
  onClose: () => void;
  dates: PlanDate[];
  availabilities: { [key: number]: "○" | "△" | "×" };
  onAvailabilityChange: (dateId: number, value: "○" | "△" | "×") => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const PlanAdjInputModal: React.FC<PlanAdjInputModalProps> = ({
  open,
  onClose,
  dates,
  availabilities,
  onAvailabilityChange,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "#1D1D21",
          color: "#FCFCFC",
          borderRadius: "12px",
        },
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          fontSize: "1rem",
          fontWeight: "bold",
          p: 2,
        }}
      >
        出欠を入力
      </DialogTitle>
      <DialogContent sx={{ p: "16px !important" }}>
        {dates.map((date) => (
          <Box
            key={date.date_id}
            sx={{
              mb: 1.5,
              p: 1.5,
              borderRadius: "8px",
              bgcolor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography
              sx={{
                color: "#FCFCFC",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: 1,
                minWidth: "180px",
              }}
            >
              <EventIcon sx={{ fontSize: "1.1rem" }} />
              {formatDateWithKanji(date.datetime)}
            </Typography>
            <FormControl sx={{ flex: 1 }}>
              <RadioGroup
                row
                value={availabilities[date.date_id] || "×"}
                onChange={(e) =>
                  onAvailabilityChange(
                    date.date_id,
                    e.target.value as "○" | "△" | "×"
                  )
                }
                sx={{
                  display: "flex",
                  justifyContent: "space-around",
                  bgcolor: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "6px",
                  p: 0.5,
                }}
              >
                <FormControlLabel
                  value="○"
                  control={
                    <Radio
                      sx={{
                        color: "rgba(74, 222, 128, 0.5)",
                        "&.Mui-checked": { color: "#4ADE80" },
                        padding: 0.5,
                      }}
                      icon={<CircleOutlinedIcon sx={{ fontSize: "1.25rem" }} />}
                      checkedIcon={
                        <CircleOutlinedIcon sx={{ fontSize: "1.25rem" }} />
                      }
                    />
                  }
                  label="参加可能"
                  sx={{
                    m: 0,
                    "& .MuiFormControlLabel-label": {
                      fontSize: "0.75rem",
                      color:
                        availabilities[date.date_id] === "○"
                          ? "#4ADE80"
                          : "rgba(255, 255, 255, 0.5)",
                    },
                  }}
                />
                <FormControlLabel
                  value="△"
                  control={
                    <Radio
                      sx={{
                        color: "rgba(255, 184, 0, 0.5)",
                        "&.Mui-checked": { color: "#FFB800" },
                        padding: 0.5,
                      }}
                      icon={<ChangeHistoryIcon sx={{ fontSize: "1.25rem" }} />}
                      checkedIcon={
                        <ChangeHistoryIcon sx={{ fontSize: "1.25rem" }} />
                      }
                    />
                  }
                  label="調整可能"
                  sx={{
                    m: 0,
                    "& .MuiFormControlLabel-label": {
                      fontSize: "0.75rem",
                      color:
                        availabilities[date.date_id] === "△"
                          ? "#FFB800"
                          : "rgba(255, 255, 255, 0.5)",
                    },
                  }}
                />
                <FormControlLabel
                  value="×"
                  control={
                    <Radio
                      sx={{
                        color: "rgba(255, 86, 86, 0.5)",
                        "&.Mui-checked": { color: "#FF5656" },
                        padding: 0.5,
                      }}
                      icon={<CloseOutlinedIcon sx={{ fontSize: "1.25rem" }} />}
                      checkedIcon={
                        <CloseOutlinedIcon sx={{ fontSize: "1.25rem" }} />
                      }
                    />
                  }
                  label="参加不可"
                  sx={{
                    m: 0,
                    "& .MuiFormControlLabel-label": {
                      fontSize: "0.75rem",
                      color:
                        availabilities[date.date_id] === "×"
                          ? "#FF5656"
                          : "rgba(255, 255, 255, 0.5)",
                    },
                  }}
                />
              </RadioGroup>
            </FormControl>
          </Box>
        ))}
      </DialogContent>
      <DialogActions
        sx={{
          p: 2,
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          gap: 1,
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            color: "rgba(255, 255, 255, 0.7)",
            minWidth: "120px",
            "&:hover": {
              bgcolor: "rgba(255, 255, 255, 0.05)",
            },
          }}
        >
          キャンセル
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          variant="contained"
          sx={{
            bgcolor: "#5b63d3",
            color: "#FCFCFC",
            minWidth: "120px",
            "&:hover": {
              bgcolor: "#4850c9",
            },
            "&.Mui-disabled": {
              bgcolor: "rgba(91, 99, 211, 0.5)",
              color: "rgba(252, 252, 252, 0.5)",
            },
          }}
        >
          {isSubmitting ? "送信中..." : "回答を送信"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlanAdjInputModal;
