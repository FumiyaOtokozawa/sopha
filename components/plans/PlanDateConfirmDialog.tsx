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
  dateTime?: string;
}

// 曜日の漢字マッピング
const weekdayKanji = ["日", "月", "火", "水", "木", "金", "土"];

const PlanDateConfirmDialog: React.FC<PlanDateConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
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
      PaperProps={{
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
      <DialogContent sx={{ p: 0, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <Box
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
            <EventIcon sx={{ color: "rgb(255, 255, 255)", fontSize: "24px" }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontSize: "1.1rem",
              fontWeight: "bold",
              color: "rgb(252, 252, 252)",
            }}
          >
            イベントの作成
          </Typography>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography
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
              sx={{
                fontSize: "1.25rem",
                color: "rgb(226, 255, 62)",
                fontWeight: "bold",
                letterSpacing: "0.5px",
              }}
            >
              {formattedDateTime}
            </Typography>
          </Box>
        </Box>
        <Box
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
            sx={{ color: "rgb(255, 107, 107)", fontSize: "18px" }}
          />
          <Typography
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
        sx={{ p: 0, display: "flex", justifyContent: "space-between" }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: "rgb(91, 99, 211)",
            color: "rgb(252, 252, 252)",
            "&:hover": {
              backgroundColor: "rgb(74, 81, 194)",
            },
            textTransform: "none",
            minWidth: "120px",
            fontWeight: "bold",
          }}
        >
          いいえ
        </Button>
        <Button
          onClick={onConfirm}
          variant="outlined"
          sx={{
            color: "rgb(252, 252, 252)",
            borderColor: "rgba(252, 252, 252, 0.3)",
            "&:hover": {
              borderColor: "rgb(252, 252, 252)",
              backgroundColor: "rgba(252, 252, 252, 0.05)",
            },
            textTransform: "none",
            minWidth: "120px",
          }}
        >
          はい
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlanDateConfirmDialog;
