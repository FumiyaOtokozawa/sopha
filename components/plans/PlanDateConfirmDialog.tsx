import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import EventIcon from "@mui/icons-material/Event";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import dayjs from "dayjs";

interface PlanDateConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCloseWithoutEvent: () => void;
  dateTime?: string;
}

// 曜日の漢字マッピング
const weekdayKanji = ["日", "月", "火", "水", "木", "金", "土"];

const PlanDateConfirmDialog: React.FC<PlanDateConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  onCloseWithoutEvent,
  dateTime,
}) => {
  // 日時のフォーマット
  const formattedDateTime = dateTime
    ? dayjs(dateTime).format("M月D日") +
      `（${weekdayKanji[dayjs(dateTime).day()]}）` +
      dayjs(dateTime).format("HH:mm")
    : "";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="plan-date-confirm"
      PaperProps={{
        className: "plan-date-confirm__paper",
        style: {
          backgroundColor: "rgb(45, 45, 51)",
          color: "rgb(252, 252, 252)",
          borderRadius: "12px",
          minWidth: "340px",
          maxWidth: "400px",
          padding: "16px",
        },
      }}
    >
      <DialogContent
        className="plan-date-confirm__content"
        sx={{ p: 0, mb: 3 }}
      >
        <Box
          className="plan-date-confirm__header"
          sx={{ display: "flex", alignItems: "center", mb: 3 }}
        >
          <Box
            className="plan-date-confirm__icon-wrapper"
            sx={{
              backgroundColor: "rgba(91, 99, 211, 0)",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EventIcon
              className="plan-date-confirm__icon"
              sx={{ color: "rgb(255, 255, 255)", fontSize: "24px" }}
            />
          </Box>
          <Typography
            variant="h6"
            className="plan-date-confirm__title"
            sx={{
              fontSize: "1.1rem",
              fontWeight: "bold",
              color: "rgb(252, 252, 252)",
            }}
          >
            イベントの作成
          </Typography>
        </Box>
        <Box className="plan-date-confirm__body" sx={{ mb: 2 }}>
          <Typography
            className="plan-date-confirm__message"
            sx={{
              fontSize: "0.95rem",
              color: "rgb(252, 252, 252)",
              mb: 2,
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            選択した日時でイベントを作成しますか？
          </Typography>
          <Box
            className="plan-date-confirm__datetime"
            sx={{
              backgroundColor: "rgba(91, 99, 211, 0.1)",
              borderRadius: "8px",
              py: 2,
              px: 3,
              mb: 2,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Typography
              className="plan-date-confirm__datetime-text"
              sx={{
                fontSize: "1.25rem",
                color: "rgb(252, 252, 252)",
                fontWeight: "bold",
                letterSpacing: "0.5px",
              }}
            >
              {formattedDateTime}
            </Typography>
          </Box>
        </Box>
        <Box
          className="plan-date-confirm__warning"
          sx={{
            backgroundColor: "rgba(255, 107, 107, 0.1)",
            borderRadius: "6px",
            p: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <InfoOutlinedIcon
            className="plan-date-confirm__warning-icon"
            sx={{ color: "rgb(255, 107, 107)", fontSize: "18px" }}
          />
          <Typography
            className="plan-date-confirm__warning-text"
            sx={{
              fontSize: "0.8rem",
              color: "rgb(255, 107, 107)",
              lineHeight: 1.2,
            }}
          >
            ※はいを押すと日程調整は締め切られます
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions
        className="plan-date-confirm__actions"
        sx={{
          p: "0 !important",
          m: "0 !important",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          alignItems: "center",
          width: "100%",
          "& .MuiDialogActions-spacing": {
            m: "0 !important",
          },
        }}
      >
        <Button
          onClick={onCloseWithoutEvent}
          variant="outlined"
          fullWidth
          className="plan-date-confirm__close-button"
          sx={{
            color: "rgb(252, 252, 252)",
            borderColor: "rgba(252, 252, 252, 0.3)",
            "&:hover": {
              borderColor: "rgb(252, 252, 252)",
              backgroundColor: "rgba(252, 252, 252, 0.05)",
            },
            textTransform: "none",
            maxWidth: "400px",
          }}
        >
          イベントを作成せずに締め切る
        </Button>
        <Box
          className="plan-date-confirm__button-group"
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
            width: "100%",
            maxWidth: "400px",
            m: "0 !important",
            "&.MuiBox-root": {
              m: "0 !important",
            },
          }}
        >
          <Button
            onClick={onClose}
            variant="outlined"
            className="plan-date-confirm__cancel-button"
            sx={{
              color: "rgb(252, 252, 252)",
              borderColor: "rgba(252, 252, 252, 0.3)",
              "&:hover": {
                borderColor: "rgb(252, 252, 252)",
                backgroundColor: "rgba(252, 252, 252, 0.05)",
              },
              textTransform: "none",
              flex: 1,
            }}
          >
            いいえ
          </Button>
          <Button
            onClick={onConfirm}
            variant="contained"
            className="plan-date-confirm__confirm-button"
            sx={{
              backgroundColor: "rgb(91, 99, 211)",
              color: "rgb(252, 252, 252)",
              "&:hover": {
                backgroundColor: "rgb(74, 81, 194)",
              },
              textTransform: "none",
              flex: 1,
              fontWeight: "bold",
            }}
          >
            はい
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default PlanDateConfirmDialog;
