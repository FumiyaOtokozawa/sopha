import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../utils/supabaseClient";
import {
  Card,
  CardContent,
  Collapse,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Box,
  Badge,
  Button,
  Fade,
  Tooltip,
} from "@mui/material";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import RemoveDoneIcon from "@mui/icons-material/RemoveDone";

type UpdateNote = {
  upd_id: number;
  version: string;
  release_date: string;
  title: string;
  description: string;
  update_type: string;
  likes: number;
  is_published: boolean;
};

type TabPanelProps = {
  children?: React.ReactNode;
  index: number;
  value: number;
};

const UPDATE_TYPE_MAP: { [key: string]: { label: string; color: string } } = {
  feature: {
    label: "新機能",
    color: "bg-[rgb(0,50,0)] text-[rgb(200,255,200)]",
  },
  bug_fix: {
    label: "バグ修正",
    color: "bg-[rgb(50,0,0)] text-[rgb(255,200,200)]",
  },
  announcement: {
    label: "お知らせ",
    color: "bg-[rgb(0,0,50)] text-[rgb(200,200,255)]",
  },
};

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`note-tabpanel-${index}`}
      aria-labelledby={`note-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export default function UpdateNotesPage() {
  const [updateNotes, setUpdateNotes] = useState<UpdateNote[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [likedNotes, setLikedNotes] = useState<number[]>([]);
  const [readNotes, setReadNotes] = useState<number[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [showReadButton, setShowReadButton] = useState(true);
  const [showTooltip, setShowTooltip] = useState<number | null>(null);
  const isDevelopment = process.env.NODE_ENV === "development";

  useEffect(() => {
    fetchUpdateNotes();
    // ローカルストレージからいいね状態を復元
    const storedLikes = localStorage.getItem("likedNotes");
    if (storedLikes) {
      setLikedNotes(JSON.parse(storedLikes));
    }
    // ローカルストレージから既読状態を復元
    const storedReadNotes = localStorage.getItem("readNotes");
    if (storedReadNotes) {
      setReadNotes(JSON.parse(storedReadNotes));
    }
  }, []);

  const fetchUpdateNotes = async () => {
    const { data, error } = await supabase
      .from("UPDATE_NOTE")
      .select("*")
      .eq("is_published", true)
      .order("release_date", { ascending: false });

    if (error) {
      console.error("Error fetching update notes:", error);
      return;
    }

    // 改行文字を正しく処理
    const processedData =
      data?.map((note) => ({
        ...note,
        description: note.description?.replace(/\\n/g, "\n"),
      })) || [];

    setUpdateNotes(processedData);

    // 全ノートIDをローカルストレージに保存
    const noteIds = processedData.map((note) => note.upd_id);
    localStorage.setItem("allUpdateNotes", JSON.stringify(noteIds));

    // 未読数の更新を通知
    window.dispatchEvent(new Event("updateNotesChanged"));
  };

  const handleExpandClick = (noteId: number) => {
    setExpandedId(expandedId === noteId ? null : noteId);

    // 既読処理
    if (!readNotes.includes(noteId)) {
      const newReadNotes = [...readNotes, noteId];
      setReadNotes(newReadNotes);
      localStorage.setItem("readNotes", JSON.stringify(newReadNotes));
      // 未読数の更新を通知
      window.dispatchEvent(new Event("updateNotesChanged"));
    }
  };

  const handleLikeClick = async (noteId: number) => {
    const isLiked = likedNotes.includes(noteId);
    const newLikedNotes = isLiked
      ? likedNotes.filter((id) => id !== noteId)
      : [...likedNotes, noteId];

    // いいね状態をローカルストレージに保存
    localStorage.setItem("likedNotes", JSON.stringify(newLikedNotes));
    setLikedNotes(newLikedNotes);

    // 即時的なUI更新のために現在のノートを取得
    const targetNote = updateNotes.find((note) => note.upd_id === noteId);
    if (targetNote) {
      // 一時的にUI上でいいね数を更新
      const updatedNotes = updateNotes.map((note) =>
        note.upd_id === noteId
          ? { ...note, likes: note.likes + (isLiked ? -1 : 1) }
          : note
      );
      setUpdateNotes(updatedNotes);

      // いいねを付けた時のみTooltipを表示（更新後の数値で）
      if (!isLiked) {
        const updatedNote = updatedNotes.find((note) => note.upd_id === noteId);
        if (updatedNote) {
          setShowTooltip(noteId);
        }
      }
    }

    // バックエンドの更新
    const { data: currentNote } = await supabase
      .from("UPDATE_NOTE")
      .select("likes")
      .eq("upd_id", noteId)
      .single();

    const newLikes = (currentNote?.likes || 0) + (isLiked ? -1 : 1);

    const { error } = await supabase
      .from("UPDATE_NOTE")
      .update({ likes: newLikes })
      .eq("upd_id", noteId);

    if (error) {
      console.error("Error updating likes:", error);
      // エラー時は元の状態に戻す
      fetchUpdateNotes();
      return;
    }
  };

  const getUpdateTypeInfo = (type: string) => {
    const key = type?.toLowerCase() || "other";
    return UPDATE_TYPE_MAP[key] || UPDATE_TYPE_MAP.other;
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const getFilteredNotes = (type: string) => {
    return updateNotes.filter((note) => {
      switch (type) {
        case "feature":
          return note.update_type?.toLowerCase() === "feature";
        case "bug_fix":
          return note.update_type?.toLowerCase() === "bug_fix";
        case "announcement":
          return note.update_type?.toLowerCase() === "announcement";
        default:
          return true;
      }
    });
  };

  const getUnreadCountByType = (type: string) => {
    return getFilteredNotes(type).filter(
      (note) => !readNotes.includes(note.upd_id)
    ).length;
  };

  const TabWithBadge = ({ label, type }: { label: string; type: string }) => {
    const unreadCount = getUnreadCountByType(type);
    return (
      <div className="flex items-center gap-2">
        {label}
        {unreadCount > 0 && (
          <Badge
            badgeContent={unreadCount}
            sx={{
              "& .MuiBadge-badge": {
                backgroundColor: "#5b63d3",
                color: "#FCFCFC",
                fontSize: "0.75rem",
                minWidth: "18px",
                height: "18px",
                padding: "0 4px",
              },
            }}
          />
        )}
      </div>
    );
  };

  const renderNoteCard = (note: UpdateNote) => (
    <Card
      key={note.upd_id}
      className="w-full shadow-md relative"
      sx={{
        backgroundColor: "rgb(52,53,57)",
      }}
    >
      {!readNotes.includes(note.upd_id) && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[rgb(142,147,218)]" />
      )}
      <CardContent className="relative !py-3 !px-4">
        <div
          className="flex justify-between items-start gap-4 cursor-pointer"
          onClick={() => handleExpandClick(note.upd_id)}
        >
          <div className="flex-grow min-w-0">
            <Typography
              component="h2"
              className="text-base font-medium leading-tight truncate text-gray-100"
            >
              {note.title}
            </Typography>
          </div>
          <IconButton
            size="small"
            className="text-gray-400 !p-1"
            sx={{
              color: "rgb(252,252,252)",
            }}
          >
            {expandedId === note.upd_id ? (
              <KeyboardArrowUpIcon fontSize="small" />
            ) : (
              <KeyboardArrowDownIcon fontSize="small" />
            )}
          </IconButton>
        </div>
        <Collapse in={expandedId === note.upd_id}>
          <Typography
            variant="body2"
            className="mb-3 text-sm text-gray-300 whitespace-pre-wrap border-t border-gray-700 pt-2"
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {note.description}
          </Typography>
        </Collapse>
        <div className="flex justify-between items-center mt-1">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                getUpdateTypeInfo(note.update_type).color
              }`}
            >
              {getUpdateTypeInfo(note.update_type).label}
            </span>
            <Typography className="text-xs text-gray-400">
              v{note.version} -{" "}
              {new Date(note.release_date).toLocaleDateString("ja-JP")}
            </Typography>
          </div>
          <div className="flex items-center">
            <Tooltip
              title={`${note.likes}件のいいね`}
              placement="top"
              open={showTooltip === note.upd_id}
              arrow
              componentsProps={{
                tooltip: {
                  sx: {
                    bgcolor: "rgb(52,53,57)",
                    color: "rgb(252,252,252)",
                    fontSize: "0.75rem",
                    padding: "4px 8px",
                    border: "1px solid rgb(142,147,218)",
                    "& .MuiTooltip-arrow": {
                      color: "rgb(52,53,57)",
                      "&::before": {
                        border: "1px solid rgb(142,147,218)",
                      },
                    },
                  },
                },
                popper: {
                  sx: {
                    '&[data-popper-placement*="top"] .MuiTooltip-tooltip': {
                      marginBottom: "4px !important",
                    },
                  },
                },
              }}
            >
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleLikeClick(note.upd_id);
                }}
                size="small"
                className="!p-1"
                sx={{
                  color: "rgb(142,147,218)",
                  "&:hover": {
                    color: "rgb(142,147,218)",
                  },
                }}
              >
                {likedNotes.includes(note.upd_id) ? (
                  <ThumbUpIcon fontSize="small" />
                ) : (
                  <ThumbUpOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const handleMarkAllAsRead = () => {
    // アニメーション開始
    setShowReadButton(false);

    // 未読のノートIDを取得
    const unreadNotes = updateNotes
      .filter((note) => !readNotes.includes(note.upd_id))
      .map((note) => note.upd_id);

    if (unreadNotes.length === 0) return;

    // 既読状態を更新
    const newReadNotes = [...new Set([...readNotes, ...unreadNotes])];
    setReadNotes(newReadNotes);
    localStorage.setItem("readNotes", JSON.stringify(newReadNotes));

    // 未読数の更新を通知
    window.dispatchEvent(new Event("updateNotesChanged"));
  };

  const handleMarkAllAsUnread = () => {
    // 既読のノートIDを取得
    const readNoteIds = updateNotes
      .filter((note) => readNotes.includes(note.upd_id))
      .map((note) => note.upd_id);

    if (readNoteIds.length === 0) return;

    // 既読状態をクリア
    const newReadNotes = readNotes.filter((id) => !readNoteIds.includes(id));
    setReadNotes(newReadNotes);
    localStorage.setItem("readNotes", JSON.stringify(newReadNotes));

    // 未読数の更新を通知
    window.dispatchEvent(new Event("updateNotesChanged"));
  };

  const getTotalUnreadCount = useCallback(() => {
    return updateNotes.filter((note) => !readNotes.includes(note.upd_id))
      .length;
  }, [updateNotes, readNotes]);

  // 未読数が変更されたときにボタンの表示状態を更新
  useEffect(() => {
    setShowReadButton(getTotalUnreadCount() > 0);
  }, [updateNotes, readNotes, getTotalUnreadCount]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (showTooltip !== null) {
      timeoutId = setTimeout(() => {
        setShowTooltip(null);
      }, 700);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [showTooltip]);

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="flex justify-end gap-2">
        <Fade in={showReadButton}>
          <div>
            {getTotalUnreadCount() > 0 && (
              <Button
                startIcon={<DoneAllIcon />}
                onClick={handleMarkAllAsRead}
                size="small"
                sx={{
                  color: "rgb(142,147,218)",
                  borderColor: "rgb(142,147,218)",
                  "&:hover": {
                    borderColor: "rgb(142,147,218)",
                    backgroundColor: "rgba(142,147,218,0.04)",
                  },
                }}
                variant="outlined"
              >
                全て既読
              </Button>
            )}
          </div>
        </Fade>
      </div>
      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          marginBottom: 2,
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": {
            color: "rgb(252,252,252)",
            opacity: 0.7,
            "&.Mui-selected": {
              color: "rgb(142,147,218)",
              opacity: 1,
            },
            "& .MuiBadge-root": {
              marginLeft: "4px",
            },
          },
          "& .MuiTabs-indicator": {
            backgroundColor: "rgb(142,147,218)",
          },
        }}
      >
        <Tab label={<TabWithBadge label="新機能" type="feature" />} />
        <Tab label={<TabWithBadge label="バグ修正" type="bug_fix" />} />
        <Tab label={<TabWithBadge label="お知らせ" type="announcement" />} />
      </Tabs>

      <TabPanel value={currentTab} index={0}>
        <div className="space-y-3">
          {getFilteredNotes("feature").map(renderNoteCard)}
        </div>
      </TabPanel>
      <TabPanel value={currentTab} index={1}>
        <div className="space-y-3">
          {getFilteredNotes("bug_fix").map(renderNoteCard)}
        </div>
      </TabPanel>
      <TabPanel value={currentTab} index={2}>
        <div className="space-y-3">
          {getFilteredNotes("announcement").map(renderNoteCard)}
        </div>
      </TabPanel>

      {isDevelopment && (
        <div className="fixed bottom-24 right-4 z-50">
          <Button
            startIcon={<RemoveDoneIcon />}
            onClick={handleMarkAllAsUnread}
            size="small"
            sx={{
              color: "rgb(142,147,218)",
              borderColor: "rgb(142,147,218)",
              backgroundColor: "rgb(52,53,57)",
              padding: "8px 16px",
              "&:hover": {
                borderColor: "rgb(142,147,218)",
                backgroundColor: "rgba(82,83,87,0.9)",
              },
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              position: "relative",
              "&::before": {
                content: '""',
                position: "absolute",
                top: "-8px",
                left: 0,
                right: 0,
                textAlign: "center",
                fontSize: "12px",
                color: "rgb(142,147,218)",
              },
            }}
            variant="outlined"
          >
            <div className="flex flex-col items-center">
              <span className="text-xs mb-1">開発用</span>
              <span>全て未読に戻す</span>
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}
