import React, { useState, useEffect } from 'react';
import { CircularProgress, Tooltip, tooltipClasses, TooltipProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';
import InfoIcon from '@mui/icons-material/Info';
import { motion } from 'framer-motion';

interface Event {
  event_id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue_id: number;
  venue_nm?: string;
  venue_address?: string;
  description?: string;
  owner: string;
  ownerName?: string;
  genre: string;
  repeat_id?: number | null;
  format: 'offline' | 'online' | 'hybrid';
  url?: string;
  abbreviation?: string;
  manage_member?: string;
}

interface AttendanceButtonsProps {
  event: Event | null;
  entryStatus: '1' | '2' | '11' | null;
  setEntryStatus: (status: '1' | '2' | '11' | null) => void;
  handleEventEntry: (status: '1' | '2' | '11') => void;
  handleConfirmAttendance: () => void;
  isGettingLocation: boolean;
  isWithinEventPeriod: (event: Event | null) => boolean;
}

// カスタムTooltipの定義
const CustomTooltip = styled(({ className, ...props }: { className?: string } & TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(() => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: '#2D2D33',
    color: '#FCFCFC',
    maxWidth: 300,
    fontSize: '0.875rem',
    border: '1px solid #4A4B50',
    borderRadius: '8px',
    padding: '12px 16px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: '#2D2D33',
    '&::before': {
      border: '1px solid #4A4B50',
    },
  },
}));

// TooltipButtonコンポーネント
const TooltipButton = ({ 
  message, 
  isDisabled, 
  onClick,
  children 
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
          ${!isDisabled 
            ? 'bg-[#5b63d3] text-white hover:bg-opacity-80' 
            : 'bg-gray-500 text-gray-300 cursor-not-allowed'}
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

const AttendanceButtons: React.FC<AttendanceButtonsProps> = ({
  event,
  entryStatus,
  setEntryStatus,
  handleEventEntry,
  handleConfirmAttendance,
  isGettingLocation,
  isWithinEventPeriod
}) => {
  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ 
        type: "spring",
        stiffness: 300,
        damping: 100,
        delay: 0.4
      }}
      className="fixed bottom-[calc(64px+19px)] left-0 right-0 bg-[#1D1D21] border-t border-gray-700/70 z-[999]"
    >
      <div className="max-w-2xl mx-auto p-3">
        {entryStatus ? (
          <>
            {entryStatus === '1' && (
              <div className="flex-1 mb-3">
                <TooltipButton
                  onClick={handleConfirmAttendance}
                  isDisabled={isGettingLocation || !isWithinEventPeriod(event)}
                  message={!isWithinEventPeriod(event) ? 'イベントの開催時間外です' : undefined}
                >
                  {isGettingLocation ? (
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
              </div>
            )}
            
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div 
                  className={`
                    text-lg font-bold h-12 flex items-center justify-center rounded-xl w-full
                    ${entryStatus === '1' 
                      ? 'bg-green-600/30 text-green-400' 
                      : entryStatus === '2' 
                        ? 'bg-red-600/30 text-red-400'
                        : 'bg-blue-600/30 text-blue-400'
                    }
                  `}
                >
                  {entryStatus === '1' ? '出席予定' : entryStatus === '2' ? '欠席予定' : '出席済み'}
                </div>
              </div>
              {entryStatus !== '11' && (
                <button
                  onClick={() => setEntryStatus(null)}
                  className="p-2 rounded-xl bg-[#37373F] text-gray-300 hover:bg-[#4A4B50] hover:text-white transition-all duration-300"
                  aria-label="ステータスを変更"
                >
                  <ChangeCircleIcon sx={{ fontSize: 32 }} />
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex justify-between gap-3">
            <button
              onClick={() => handleEventEntry('1')}
              className="h-12 px-8 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white font-bold hover:opacity-90 transition-opacity duration-300 flex-1 flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
            >
              <CheckIcon className="h-5 w-5" />
              仮出席
            </button>
            <button
              onClick={() => handleEventEntry('2')}
              className="h-12 px-8 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold hover:opacity-90 transition-opacity duration-300 flex-1 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
            >
              <CloseIcon className="h-5 w-5" />
              仮欠席
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AttendanceButtons; 