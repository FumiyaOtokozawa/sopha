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
import CircleOutlined from "@mui/icons-material/CircleOutlined";
import ChangeHistory from "@mui/icons-material/ChangeHistory";
import Close from "@mui/icons-material/Close";
import EventIcon from "@mui/icons-material/Event";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import { motion, AnimatePresence } from "framer-motion";

// 曜日の漢字マッピング
const weekdayKanji = ["日", "月", "火", "水", "木", "金", "土"];

// 日付フォーマットのヘルパー関数
const formatDateWithKanji = (datetime: string) => {
  const date = dayjs(datetime);
  const weekday = weekdayKanji[date.day()];
  return {
    date: date.format("MM月DD日"),
    weekday: weekday,
    time: date.format("HH:mm"),
    day: date.day(),
  };
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
          maxHeight: "85vh",
        },
        component: motion.div,
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 },
        transition: { duration: 0.2 },
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          fontSize: "0.9rem",
          fontWeight: "bold",
          p: 1.5,
          minHeight: "48px",
          display: "flex",
          alignItems: "center",
        }}
      >
        出欠を入力
      </DialogTitle>
      <DialogContent
        sx={{
          p: "12px !important",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <AnimatePresence>
          {dates.map((date, index) => (
            <motion.div
              key={date.date_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <Box
                sx={{
                  p: 1,
                  borderRadius: "6px",
                  bgcolor: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography
                  component="div"
                  sx={{
                    color: "#FCFCFC",
                    fontSize: "0.8rem",
                    display: "flex",
                    alignItems: "center",
                    minWidth: "160px",
                    flex: 1,
                  }}
                >
                  <EventIcon sx={{ fontSize: "0.9rem", mr: 0.5 }} />
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
                      {formatDateWithKanji(date.datetime).date}
                    </Box>
                    <Box
                      sx={{
                        fontSize: "0.75rem",
                        width: "20%",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      （
                      <span
                        style={{
                          color:
                            formatDateWithKanji(date.datetime).day === 0
                              ? "rgb(233, 112, 112)"
                              : formatDateWithKanji(date.datetime).day === 6
                              ? "rgb(136, 142, 214)"
                              : "inherit",
                        }}
                      >
                        {formatDateWithKanji(date.datetime).weekday}
                      </span>
                      ）
                    </Box>
                    <Box
                      sx={{
                        fontSize: "0.75rem",
                        width: "45%",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                        pl: 1,
                      }}
                    >
                      {formatDateWithKanji(date.datetime).time}
                    </Box>
                  </Box>
                </Typography>
                <FormControl sx={{ ml: "auto" }}>
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
                      justifyContent: "flex-end",
                      gap: 1,
                      bgcolor: "rgba(255, 255, 255, 0.02)",
                      borderRadius: "4px",
                      p: 0.25,
                      width: "fit-content",
                    }}
                  >
                    <FormControlLabel
                      value="○"
                      control={
                        <Radio
                          sx={{
                            color: "rgba(74, 222, 128, 0.3)",
                            "&.Mui-checked": { color: "#4ADE80" },
                            padding: 0.25,
                          }}
                          icon={<CircleOutlined sx={{ fontSize: "1.2rem" }} />}
                          checkedIcon={
                            <CircleOutlined sx={{ fontSize: "1.2rem" }} />
                          }
                        />
                      }
                      label=""
                      sx={{ m: 0 }}
                    />
                    <FormControlLabel
                      value="△"
                      control={
                        <Radio
                          sx={{
                            color: "rgba(255, 184, 0, 0.3)",
                            "&.Mui-checked": { color: "#FFB800" },
                            padding: 0.25,
                          }}
                          icon={<ChangeHistory sx={{ fontSize: "1.2rem" }} />}
                          checkedIcon={
                            <ChangeHistory sx={{ fontSize: "1.2rem" }} />
                          }
                        />
                      }
                      label=""
                      sx={{ m: 0 }}
                    />
                    <FormControlLabel
                      value="×"
                      control={
                        <Radio
                          sx={{
                            color: "rgba(255, 86, 86, 0.3)",
                            "&.Mui-checked": { color: "#FF5656" },
                            padding: 0.25,
                          }}
                          icon={<Close sx={{ fontSize: "1.3rem" }} />}
                          checkedIcon={<Close sx={{ fontSize: "1.3rem" }} />}
                        />
                      }
                      label=""
                      sx={{ m: 0 }}
                    />
                  </RadioGroup>
                </FormControl>
              </Box>
            </motion.div>
          ))}
        </AnimatePresence>
      </DialogContent>
      <DialogActions
        sx={{
          p: 1.5,
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          gap: 1,
          justifyContent: "space-between",
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            color: "rgba(255, 255, 255, 0.7)",
            minWidth: "100px",
            fontSize: "0.8rem",
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
            minWidth: "100px",
            fontSize: "0.8rem",
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
