import { SxProps, Theme } from "@mui/material";

// 型定義を削除
export const planAdjStatusStyles = {
  root: {
    minHeight: "auto",
    color: "#FCFCFC",
    position: "relative",
    pt: 0,
    pb: `calc(env(safe-area-inset-bottom) + 16px)`,
    display: "flex",
    flexDirection: "column",
  } as SxProps<Theme>,

  content: {
    maxWidth: "600px",
    width: "100%",
    mx: "auto",
    p: 2,
    pb: "calc(64px)",
    display: "flex",
    flexDirection: "column",
    WebkitOverflowScrolling: "touch",
  } as SxProps<Theme>,

  infoCard: {
    p: 1.5,
    borderRadius: "8px",
    bgcolor: "#2D2D2D",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    mb: 1,
    display: "flex",
    flexDirection: "column",
  } as SxProps<Theme>,

  infoHeader: {
    mb: 1.5,
  } as SxProps<Theme>,

  infoTitle: {
    fontSize: "1rem",
    fontWeight: "bold",
    color: "#FCFCFC",
    mb: 0.5,
    letterSpacing: "0.02em",
  } as SxProps<Theme>,

  infoMeta: {
    display: "flex",
    alignItems: "center",
    gap: 1,
    flexWrap: "wrap",
  } as SxProps<Theme>,

  infoMetaItem: {
    fontSize: "0.7rem",
    color: "rgba(255, 255, 255, 0.5)",
    display: "flex",
    alignItems: "center",
    gap: 0.5,
  } as SxProps<Theme>,

  infoDescription: {
    bgcolor: "rgba(255, 255, 255, 0.03)",
    p: 1,
    borderRadius: "6px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    flex: "1 1 auto",
    minHeight: 0,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
  } as SxProps<Theme>,

  infoDescriptionText: {
    fontSize: "0.75rem",
    color: "rgba(255, 255, 255, 0.7)",
    whiteSpace: "pre-wrap",
    lineHeight: 1.4,
    wordBreak: "break-word",
  } as SxProps<Theme>,

  datesCard: {
    p: 1.5,
    borderRadius: "12px",
    bgcolor: "#2D2D2D",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    mb: 1,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  } as SxProps<Theme>,

  tabs: {
    borderBottom: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    mb: 1.5,
  } as SxProps<Theme>,

  tabsContainer: {
    minHeight: "32px",
    width: "95%",
    "& .MuiTab-root": {
      minHeight: "32px",
      padding: "4px 8px",
      color: "#FCFCFC",
      fontSize: "0.8rem",
      textTransform: "none",
      fontWeight: "medium",
    },
    "& .Mui-selected": {
      color: "#8E93DA !important",
    },
    "& .MuiTabs-indicator": {
      backgroundColor: "#8E93DA",
    },
  } as SxProps<Theme>,

  dateItem: {
    p: 1.5,
    borderRadius: "8px",
    bgcolor: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  } as SxProps<Theme>,

  dateItemContent: {
    display: "flex",
    alignItems: "center",
  } as SxProps<Theme>,

  dateItemDateTime: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 1,
    width: "50%",
  } as SxProps<Theme>,

  dateItemDateTimeText: {
    fontSize: "0.875rem",
    color: "#FCFCFC",
    display: "flex",
    alignItems: "center",
    gap: 0.5,
    width: "100%",
  } as SxProps<Theme>,

  dateItemDateTimeContainer: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    justifyContent: "space-between",
  } as SxProps<Theme>,

  dateItemDate: {
    fontSize: "0.75rem",
    width: "40%",
    textAlign: "left",
    whiteSpace: "nowrap",
  } as SxProps<Theme>,

  dateItemWeekday: (day: number): SxProps<Theme> => ({
    fontSize: "0.75rem",
    width: "28%",
    textAlign: "left",
    whiteSpace: "nowrap",
    color:
      day === 0
        ? "rgba(230, 70, 70, 1)"
        : day === 6
        ? "rgba(91, 99, 211, 1)"
        : "inherit",
  }),

  dateItemTime: {
    fontSize: "0.75rem",
    width: "32%",
    textAlign: "left",
    whiteSpace: "nowrap",
  } as SxProps<Theme>,

  dateItemStatus: {
    display: "flex",
    alignItems: "center",
    width: "50%",
    justifyContent: "flex-end",
  } as SxProps<Theme>,

  dateItemAvailabilityRate: (isMax: boolean): SxProps<Theme> => ({
    fontSize: "0.875rem",
    fontWeight: "bold",
    color: isMax ? "rgba(74, 222, 128, 1)" : "rgba(252, 252, 252, 1)",
    minWidth: "3rem",
    textAlign: "right",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 0.5,
    width: "20%",
  }),

  progressBar: {
    position: "relative",
    height: "2px",
    mt: 1.5,
    borderRadius: "4px",
    bgcolor: "rgba(255, 255, 255, 0.1)",
  } as SxProps<Theme>,

  progressBarSegment: (color: string, left: number, width: number) =>
    ({
      position: "absolute",
      left: `${left}%`,
      top: 0,
      height: "100%",
      width: `${width}%`,
      bgcolor: color,
      borderRadius: "4px",
    } as SxProps<Theme>),

  participantGrid: {
    display: "grid",
    gridTemplateColumns: "100px 1fr",
    gap: 0,
    width: "100%",
    borderRadius: "8px",
    bgcolor: "rgba(255, 255, 255, 0.03)",
    fontSize: "0.75rem",
    flex: 1,
    minHeight: 0,
    overflow: "auto",
  } as SxProps<Theme>,

  participantHeader: {
    px: 1.5,
    py: 1,
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#FCFCFC",
    fontWeight: "medium",
    bgcolor: "rgba(45, 45, 45, 0.95)",
    display: "flex",
    alignItems: "center",
    position: "sticky",
    left: 0,
    top: 0,
    zIndex: 2,
  } as SxProps<Theme>,

  participantDatesHeader: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    display: "grid",
    gap: 0,
    bgcolor: "rgba(255, 255, 255, 0.05)",
    position: "sticky",
    top: 0,
    zIndex: 1,
  } as SxProps<Theme>,

  participantDateCell: {
    textAlign: "center",
    color: "#FCFCFC",
    px: 0.5,
    py: 1,
    fontSize: "0.7rem",
    borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
  } as SxProps<Theme>,

  participantName: {
    px: 1.5,
    py: 1,
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#FCFCFC",
    display: "flex",
    alignItems: "center",
    gap: 0.5,
    fontSize: "0.75rem",
    position: "sticky",
    left: 0,
    bgcolor: "rgba(45, 45, 45, 0.95)",
    backdropFilter: "blur(8px)",
    zIndex: 1,
  } as SxProps<Theme>,

  participantAvailability: (availability: "○" | "△" | "×"): SxProps<Theme> => ({
    textAlign: "center",
    color:
      availability === "○"
        ? "rgba(74, 222, 128, 1)"
        : availability === "△"
        ? "rgba(189, 132, 0, 1)"
        : "rgba(185, 55, 55, 1)",
    px: 0.5,
    py: 1,
    borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  }),
};
