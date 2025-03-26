import React from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

interface PlanReopenDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const PlanReopenDialog: React.FC<PlanReopenDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: "#2D2D2D",
          color: "#FCFCFC",
          minWidth: "300px",
        },
      }}
    >
      <DialogContent>
        <Typography>締め切りを延長しますか？</Typography>
        <Typography
          variant="caption"
          sx={{ color: "rgba(252, 252, 252, 0.7)", mt: 1, display: "block" }}
        >
          ※締め切りは現在から1日後に設定されます
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1, justifyContent: "space-between" }}>
        <Button
          onClick={onClose}
          sx={{
            color: "rgba(252, 252, 252, 0.7)",
            "&:hover": {
              color: "#FCFCFC",
              bgcolor: "rgba(255, 255, 255, 0.1)",
            },
          }}
        >
          キャンセル
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          sx={{
            bgcolor: "#5b63d3",
            color: "#FCFCFC",
            "&:hover": {
              bgcolor: "rgba(91, 99, 211, 0.8)",
            },
          }}
        >
          延長する
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlanReopenDialog;
