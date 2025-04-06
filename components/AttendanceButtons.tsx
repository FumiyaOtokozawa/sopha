import React, { useState } from "react";
import {
  CircularProgress,
  Tooltip,
  tooltipClasses,
  TooltipProps,
  Dialog,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ChangeCircleIcon from "@mui/icons-material/ChangeCircle";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from "@mui/icons-material/Error";
import VideocamIcon from "@mui/icons-material/Videocam";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { motion } from "framer-motion";
import type { Event } from "../types/event";

interface AttendanceButtonsProps {
  event: Event | null;
  entryStatus: "1" | "2" | "11" | null;
  setEntryStatus: (status: "1" | "2" | "11" | null) => void;
  handleEventEntry: (status: "1" | "2" | "11") => void;
  handleConfirmAttendance: (format?: "online" | "offline") => void;
  isGettingLocation: boolean;
  isWithinEventPeriod: (event: Event | null) => boolean;
}

// カスタムTooltipの定義
const CustomTooltip = styled(
  ({ className, ...props }: { className?: string } & TooltipProps) => (
    <Tooltip {...props} classes={{ popper: className }} />
  )
)(() => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: "#2D2D33",
    color: "#FCFCFC",
    maxWidth: 300,
    fontSize: "0.875rem",
    border: "1px solid #4A4B50",
    borderRadius: "8px",
    padding: "12px 16px",
    boxShadow:
      "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: "#2D2D33",
    "&::before": {
      border: "1px solid #4A4B50",
    },
  },
}));

// TooltipButtonコンポーネント
const TooltipButton = ({
  message,
  isDisabled,
  onClick,
  children,
}: {
  message?: string;
  isDisabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative w-full">
      <button
        onClick={() => {
          if (!isDisabled) {
            onClick();
          }
        }}
        disabled={isDisabled}
        className={`
          w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2
          ${
            !isDisabled
              ? "bg-[#5b63d3] text-white hover:bg-opacity-80"
              : "bg-gray-500 text-gray-300 cursor-not-allowed"
          }
        `}
      >
        {children}
      </button>
      {isDisabled && message && (
        <CustomTooltip
          title={message}
          placement="top"
          arrow
          open={showTooltip}
          onClose={() => setShowTooltip(false)}
        >
          <button
            onClick={() => {
              setShowTooltip(true);
              setTimeout(() => setShowTooltip(false), 2000);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300"
          >
            <InfoIcon />
          </button>
        </CustomTooltip>
      )}
    </div>
  );
};

// 出席形式選択ダイアログのインターフェース
interface AttendanceFormatDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (format: "online" | "offline") => void;
}

// 出席形式選択ダイアログコンポーネント
const AttendanceFormatDialog: React.FC<AttendanceFormatDialogProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        style: {
          backgroundColor: "#2D2D33",
          borderRadius: "1rem",
          maxWidth: "20rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        },
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="p-4"
      >
        <h3 className="text-lg font-bold text-white text-center mb-6">
          どちらで出席ですか？
        </h3>
        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect("offline")}
            className="w-full p-4 rounded-xl bg-gradient-to-r from-[#5b63d3]/20 to-[#5b63d3]/10 backdrop-blur-sm border border-[#5b63d3]/20 text-[#FCFCFC] hover:border-[#5b63d3]/40 transition-all duration-300 flex items-center gap-4 group"
          >
            <div className="p-3 rounded-lg bg-[#5b63d3] group-hover:bg-[#6b73e3] transition-colors">
              <LocationOnIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-white mb-1">現地で参加</div>
              <div className="text-sm text-gray-300">
                会場で直接参加する場合はこちら
              </div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect("online")}
            className="w-full p-4 rounded-xl bg-gradient-to-r from-[#5b63d3]/20 to-[#5b63d3]/10 backdrop-blur-sm border border-[#5b63d3]/20 text-[#FCFCFC] hover:border-[#5b63d3]/40 transition-all duration-300 flex items-center gap-4 group"
          >
            <div className="p-3 rounded-lg bg-[#5b63d3] group-hover:bg-[#6b73e3] transition-colors">
              <VideocamIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-white mb-1">オンラインで参加</div>
              <div className="text-sm text-gray-300">
                リモートで参加する場合はこちら
              </div>
            </div>
          </motion.button>
        </div>
      </motion.div>
    </Dialog>
  );
};

const AttendanceButtons: React.FC<AttendanceButtonsProps> = ({
  event,
  entryStatus,
  setEntryStatus,
  handleEventEntry,
  handleConfirmAttendance,
  isGettingLocation,
  isWithinEventPeriod,
}) => {
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isTimeoutError, setIsTimeoutError] = useState(false);
  const [showFormatDialog, setShowFormatDialog] = useState(false);

  // 本出席確定処理のタイムアウトハンドラー
  const handleConfirmAttendanceWithTimeout = async () => {
    // ハイブリッド形式の場合、出席形式選択ダイアログを表示
    if (event?.format === "hybrid") {
      setShowFormatDialog(true);
      return;
    }

    // オンラインイベントの場合は直接オンライン出席として処理
    if (event?.format === "online") {
      await executeConfirmAttendance("online");
      return;
    }

    // オフラインイベントの場合は通常の位置情報チェックを実行
    await executeConfirmAttendance("offline");
  };

  // 実際の出席確定処理を実行する関数
  const executeConfirmAttendance = async (format: "online" | "offline") => {
    setIsTimeoutError(false);
    setShowErrorDialog(false);
    setErrorMessage("");

    try {
      // オンラインイベントまたはオンライン参加の場合は位置情報なしで実行
      if (format === "online") {
        await handleConfirmAttendance("online");
      } else {
        await handleConfirmAttendance("offline");
      }
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : "予期せぬエラーが発生しました";
      setIsTimeoutError(
        errorMsg.includes("タイムアウト") || errorMsg.includes("位置情報")
      );
      setErrorMessage(errorMsg);
      setShowErrorDialog(true);
    }
  };

  // 出席形式が選択された時の処理
  const handleFormatSelect = async (format: "online" | "offline") => {
    setShowFormatDialog(false);
    await executeConfirmAttendance(format);
  };

  return (
    <>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 100,
          delay: 0.4,
        }}
        className="fixed bottom-[calc(64px+19px)] left-0 right-0 bg-[#1D1D21] border-t border-gray-700/70 z-[999]"
      >
        <div className="max-w-2xl mx-auto p-3">
          {entryStatus ? (
            <>
              {entryStatus === "1" && (
                <motion.div
                  className="flex-1 mb-3"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ type: "spring", duration: 0.5 }}
                >
                  <TooltipButton
                    onClick={handleConfirmAttendanceWithTimeout}
                    isDisabled={
                      event?.format === "online"
                        ? !isWithinEventPeriod(event)
                        : isGettingLocation || !isWithinEventPeriod(event)
                    }
                    message={
                      !isWithinEventPeriod(event)
                        ? "イベントの開催時間外です"
                        : undefined
                    }
                  >
                    {isGettingLocation && event?.format !== "online" ? (
                      <>
                        <CircularProgress size={20} className="text-white" />
                        <span className="ml-2">位置情報を確認中...</span>
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-5 w-5" />
                        <span className="ml-2">本出席を確定する</span>
                      </>
                    )}
                  </TooltipButton>
                </motion.div>
              )}

              <motion.div
                className="flex items-center justify-between gap-3"
                layout="position"
                layoutId="status-container"
              >
                <motion.div className="flex-1">
                  <motion.button
                    onClick={() => setEntryStatus(null)}
                    className={`
                      text-lg font-bold h-12 flex items-center justify-center rounded-xl w-full
                      ${
                        entryStatus === "1"
                          ? "bg-green-600/30 text-green-400"
                          : entryStatus === "2"
                          ? "bg-red-600/30 text-red-400"
                          : "bg-blue-600/30 text-blue-400"
                      }
                    `}
                    disabled={entryStatus === "11"}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={false}
                    animate={{
                      backgroundColor:
                        entryStatus === "1"
                          ? "rgba(22, 163, 74, 0.3)"
                          : entryStatus === "2"
                          ? "rgba(220, 38, 38, 0.3)"
                          : "rgba(37, 99, 235, 0.3)",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                      backgroundColor: {
                        type: "tween",
                        duration: 0.2,
                      },
                    }}
                  >
                    <motion.div
                      className="flex items-center gap-2"
                      layout="position"
                    >
                      <motion.span layoutId="status-text">
                        {entryStatus === "1"
                          ? "出席予定"
                          : entryStatus === "2"
                          ? "欠席予定"
                          : "出席済み"}
                      </motion.span>
                      {entryStatus !== "11" && (
                        <motion.div
                          initial={{ rotate: 0, opacity: 0, scale: 0 }}
                          animate={{ rotate: 360, opacity: 1, scale: 1 }}
                          exit={{ rotate: 0, opacity: 0, scale: 0 }}
                          transition={{
                            duration: 0.5,
                            scale: {
                              type: "spring",
                              stiffness: 200,
                              damping: 20,
                            },
                          }}
                        >
                          <ChangeCircleIcon className="h-5 w-5" />
                        </motion.div>
                      )}
                    </motion.div>
                  </motion.button>
                </motion.div>
              </motion.div>
            </>
          ) : (
            <motion.div
              className="flex justify-between gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
              }}
              layoutId="status-container"
            >
              <motion.button
                onClick={() => handleEventEntry("1")}
                className="h-12 px-8 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white font-bold flex-1 flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                whileHover={{
                  scale: 1.02,
                  backgroundImage:
                    "linear-gradient(to right, #22c55e, #16a34a)",
                }}
                whileTap={{ scale: 0.98 }}
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  backgroundImage: {
                    type: "tween",
                    duration: 0.2,
                  },
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                    delay: 0.2,
                  }}
                >
                  <CheckIcon className="h-5 w-5" />
                </motion.div>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  仮出席
                </motion.span>
              </motion.button>
              <motion.button
                onClick={() => handleEventEntry("2")}
                className="h-12 px-8 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold flex-1 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                whileHover={{
                  scale: 1.02,
                  backgroundImage:
                    "linear-gradient(to right, #ef4444, #dc2626)",
                }}
                whileTap={{ scale: 0.98 }}
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  backgroundImage: {
                    type: "tween",
                    duration: 0.2,
                  },
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                    delay: 0.2,
                  }}
                >
                  <CloseIcon className="h-5 w-5" />
                </motion.div>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  仮欠席
                </motion.span>
              </motion.button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* エラーダイアログ */}
      <Dialog
        open={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        PaperProps={{
          style: {
            backgroundColor: "#2D2D33",
            borderRadius: "1rem",
            maxWidth: "20rem",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          },
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-red-500/20 p-3 rounded-full">
              <ErrorIcon className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-white text-center mb-2">
            本出席の確定に失敗しました
          </h3>
          <p className="text-sm text-gray-300 text-center mb-4 whitespace-pre-wrap">
            {errorMessage}
          </p>
          {isTimeoutError && (
            <div className="bg-[#37373F] rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-300 leading-relaxed">
                以下の理由で失敗した可能性があります：
                <br />• OSまたは端末のバージョンが古い
                <br />• ブラウザの位置情報の許可設定が無効
                <br />• ネットワーク接続が不安定
                <br />
                <br />
                ブラウザから本出席の確定を試してください。
              </p>
            </div>
          )}
          <button
            onClick={() => {
              setShowErrorDialog(false);
              setErrorMessage("");
              setIsTimeoutError(false);
            }}
            className="w-full p-2.5 rounded-lg bg-[#4A4B50] text-[#FCFCFC] hover:bg-opacity-80 transition-all duration-300"
          >
            閉じる
          </button>
        </div>
      </Dialog>

      {/* 出席形式選択ダイアログ */}
      <AttendanceFormatDialog
        open={showFormatDialog}
        onClose={() => setShowFormatDialog(false)}
        onSelect={handleFormatSelect}
      />
    </>
  );
};

export default AttendanceButtons;
