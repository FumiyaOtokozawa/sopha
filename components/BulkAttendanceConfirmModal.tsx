import React, { useState, useEffect } from "react";
import { Dialog, Checkbox, Avatar, CircularProgress } from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
import { motion } from "framer-motion";

interface BulkAttendanceConfirmModalProps {
  open: boolean;
  onClose: () => void;
  temporaryAttendees: {
    entry_id: number;
    emp_no: number;
    myoji: string | null;
    namae: string | null;
    icon_url: string | null;
  }[];
  onConfirm: (selectedEmpNos: number[]) => Promise<void>;
}

const BulkAttendanceConfirmModal: React.FC<BulkAttendanceConfirmModalProps> = ({
  open,
  onClose,
  temporaryAttendees,
  onConfirm,
}) => {
  const [selectedEmpNos, setSelectedEmpNos] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedEmpNos([]);
    }
  }, [open]);

  const handleToggleSelect = (empNo: number) => {
    setSelectedEmpNos((prev) =>
      prev.includes(empNo)
        ? prev.filter((no) => no !== empNo)
        : [...prev, empNo]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmpNos.length === temporaryAttendees.length) {
      setSelectedEmpNos([]);
    } else {
      setSelectedEmpNos(temporaryAttendees.map((a) => a.emp_no));
    }
  };

  const handleConfirm = async () => {
    if (selectedEmpNos.length === 0) return;
    setIsProcessing(true);
    try {
      await onConfirm(selectedEmpNos);
      onClose();
    } catch (error) {
      console.error("本出席処理に失敗:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        style: {
          backgroundColor: "#2D2D33",
          borderRadius: "0.75rem",
          maxWidth: "24rem",
          width: "90%",
          height: "min(80vh, 600px)",
          margin: "auto",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <div className="h-full flex flex-col">
        {/* ヘッダー部分 - 固定 */}
        <div className="flex-shrink-0 p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-white">
              本出席にする社員を選択
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {selectedEmpNos.length} / {temporaryAttendees.length}
              </span>
              <Checkbox
                checked={selectedEmpNos.length === temporaryAttendees.length}
                indeterminate={
                  selectedEmpNos.length > 0 &&
                  selectedEmpNos.length < temporaryAttendees.length
                }
                onChange={handleSelectAll}
                size="small"
                sx={{
                  padding: 0.5,
                  color: "#8E93DA",
                  "&.Mui-checked": { color: "#5b63d3" },
                  "&.MuiCheckbox-indeterminate": { color: "#5b63d3" },
                }}
              />
            </div>
          </div>
        </div>

        {/* スクロール可能な社員リスト */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 space-y-1">
            {temporaryAttendees.map((attendee) => (
              <motion.div
                key={attendee.emp_no}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className={`
                  flex items-center p-2 rounded-lg cursor-pointer
                  ${
                    selectedEmpNos.includes(attendee.emp_no)
                      ? "bg-[#5b63d3]/10 hover:bg-[#5b63d3]/20"
                      : "hover:bg-[#37373F]"
                  } 
                  transition-colors
                `}
                onClick={() => handleToggleSelect(attendee.emp_no)}
              >
                <Checkbox
                  checked={selectedEmpNos.includes(attendee.emp_no)}
                  size="small"
                  sx={{
                    padding: 0.5,
                    color: "#8E93DA",
                    "&.Mui-checked": { color: "#5b63d3" },
                  }}
                />
                <Avatar
                  src={attendee.icon_url || undefined}
                  sx={{
                    width: 24,
                    height: 24,
                    ml: 1,
                    fontSize: "0.75rem",
                    bgcolor: "rgba(142, 147, 218, 0.2)",
                  }}
                >
                  {attendee.myoji ? attendee.myoji[0] : "?"}
                </Avatar>
                <span className="ml-2 text-sm text-gray-300">
                  {attendee.myoji && attendee.namae
                    ? `${attendee.myoji} ${attendee.namae}`
                    : `未設定(${attendee.emp_no})`}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* フッター部分 - 固定 */}
        <div className="flex-shrink-0 p-4 border-t border-gray-700/50 bg-[#2D2D33] sticky bottom-0">
          <button
            onClick={handleConfirm}
            disabled={selectedEmpNos.length === 0 || isProcessing}
            className={`
              w-full py-3 rounded-lg
              flex items-center justify-center gap-2
              ${
                selectedEmpNos.length === 0 || isProcessing
                  ? "bg-[#5b63d3]/50 cursor-not-allowed"
                  : "bg-[#5b63d3] hover:bg-[#5b63d3]/90"
              }
              text-white text-sm font-medium transition-colors
            `}
          >
            {isProcessing ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <>
                <DoneIcon className="h-4 w-4" />
                {selectedEmpNos.length}名の本出席を確定
              </>
            )}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default BulkAttendanceConfirmModal;
