import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Avatar,
  Tooltip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { supabase } from "../../utils/supabaseClient";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import { motion } from "framer-motion";

interface ChatMessage {
  chat_id: number;
  plan_id: number;
  emp_no: number;
  message: string;
  created_at: string;
  user_info: {
    myoji: string;
    namae: string;
    icon_url: string | null;
  };
}

interface PlanChatProps {
  planId: number;
  currentUserEmpNo: number | null;
}

const PlanChat: React.FC<PlanChatProps> = ({ planId, currentUserEmpNo }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("PLAN_CHAT")
        .select(
          `
          *,
          user_info:USER_INFO!emp_no(myoji, namae, icon_url)
        `
        )
        .eq("plan_id", planId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchMessages();

    // リアルタイム更新のサブスクリプション設定
    const subscription = supabase
      .channel("PLAN_CHAT_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "PLAN_CHAT",
          filter: `plan_id=eq.${planId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [planId, fetchMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserEmpNo) return;

    try {
      const { error } = await supabase.from("PLAN_CHAT").insert([
        {
          plan_id: planId,
          emp_no: currentUserEmpNo,
          message: newMessage.trim(),
          created_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        },
      ]);

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <Typography variant="body2">読み込み中...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "calc(100vh - 64px - 300px)",
        display: "flex",
        flexDirection: "column",
        bgcolor: "rgba(45, 45, 45, 0.95)",
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          p: 0.5,
          pb: 2,
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            background: "rgba(255, 255, 255, 0.05)",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: "4px",
            "&:hover": {
              background: "rgba(255, 255, 255, 0.3)",
            },
          },
        }}
      >
        {messages.map((message, index) => {
          const isCurrentUser = message.emp_no === currentUserEmpNo;
          const isPreviousMessageSameUser =
            index > 0 && messages[index - 1].emp_no === message.emp_no;
          const showAvatar = !isCurrentUser && !isPreviousMessageSameUser;

          return (
            <motion.div
              key={message.chat_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{ width: "100%" }}
            >
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "flex-start",
                  flexDirection: isCurrentUser ? "row-reverse" : "row",
                  width: "100%",
                  boxSizing: "border-box",
                  mt: isPreviousMessageSameUser ? 0.25 : 1,
                }}
              >
                <Box
                  sx={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    maxWidth: isCurrentUser ? "85%" : "calc(100% - 52px)",
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      alignItems: "flex-start",
                      flexDirection: isCurrentUser ? "row-reverse" : "row",
                      width: "100%",
                      boxSizing: "border-box",
                      pl: !isCurrentUser && !showAvatar ? 5.5 : 0,
                    }}
                  >
                    {showAvatar && (
                      <Tooltip
                        title={`${message.user_info.myoji} ${message.user_info.namae}`}
                        placement="top"
                        arrow
                        enterDelay={0}
                        leaveDelay={0}
                        enterTouchDelay={0}
                        leaveTouchDelay={1000}
                        componentsProps={{
                          tooltip: {
                            sx: {
                              bgcolor: "rgba(0, 0, 0, 0.8)",
                              color: "#FCFCFC",
                              fontSize: "0.75rem",
                              p: "6px 10px",
                              borderRadius: "4px",
                              "& .MuiTooltip-arrow": {
                                color: "rgba(0, 0, 0, 0.8)",
                              },
                            },
                          },
                          popper: {
                            sx: {
                              opacity: 1,
                              marginBottom: "-8px !important",
                              zIndex: 0,
                            },
                          },
                        }}
                        PopperProps={{
                          modifiers: [
                            {
                              name: "offset",
                              options: {
                                offset: [0, -4],
                              },
                            },
                            {
                              name: "preventOverflow",
                              options: {
                                altAxis: true,
                                tether: false,
                              },
                            },
                          ],
                        }}
                      >
                        <Avatar
                          src={message.user_info.icon_url || undefined}
                          sx={{
                            width: 36,
                            height: 36,
                            fontSize: "1rem",
                            bgcolor: "#5b63d3",
                            flexShrink: 0,
                            cursor: "pointer",
                            "&:hover": {
                              opacity: 0.8,
                            },
                            WebkitTapHighlightColor: "transparent",
                          }}
                        >
                          {message.user_info.myoji[0]}
                        </Avatar>
                      </Tooltip>
                    )}
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                        alignItems: "flex-end",
                        flexDirection: isCurrentUser ? "row-reverse" : "row",
                        flex: 1,
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1,
                          bgcolor: isCurrentUser
                            ? "#5b63d3"
                            : "rgba(255, 255, 255, 0.05)",
                          borderRadius: 1.5,
                          position: "relative",
                          maxWidth: "100%",
                          minWidth: 0,
                          boxSizing: "border-box",
                          "&::before": {
                            content: '""',
                            position: "absolute",
                            top: 8,
                            [isCurrentUser ? "right" : "left"]: -6,
                            width: 0,
                            height: 0,
                            borderStyle: "solid",
                            borderWidth: isCurrentUser
                              ? "6px 0 6px 6px"
                              : "6px 6px 6px 0",
                            borderColor: isCurrentUser
                              ? "transparent transparent transparent #5b63d3"
                              : "transparent rgba(255, 255, 255, 0.05) transparent transparent",
                          },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.85rem",
                            color: "#FCFCFC",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            overflowWrap: "break-word",
                          }}
                        >
                          {message.message}
                        </Typography>
                      </Paper>
                      <Typography
                        sx={{
                          fontSize: "0.7rem",
                          color: "rgba(255, 255, 255, 0.5)",
                          flexShrink: 0,
                          mb: 0.25,
                        }}
                      >
                        {dayjs(message.created_at).format("HH:mm")}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} style={{ height: 1 }} />
      </Box>
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          bgcolor: "rgba(45, 45, 45, 0.95)",
          pt: 1.5,
          zIndex: 1,
          borderBottomLeftRadius: 1,
          borderBottomRightRadius: 1,
        }}
      >
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            size="small"
            fullWidth
            multiline
            maxRows={3}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力..."
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "#FCFCFC",
                fontSize: "0.85rem",
                bgcolor: "rgba(255, 255, 255, 0.05)",
                "& fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.1)",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.2)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#5b63d3",
                },
              },
            }}
          />
          <IconButton
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            sx={{
              width: 36,
              height: 36,
              bgcolor: "#5b63d3",
              color: "#FCFCFC",
              "&:hover": {
                bgcolor: "rgba(91, 99, 211, 0.8)",
              },
              "&.Mui-disabled": {
                bgcolor: "rgba(255, 255, 255, 0.1)",
                color: "rgba(255, 255, 255, 0.3)",
              },
            }}
          >
            <SendIcon sx={{ fontSize: "1.2rem" }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default PlanChat;
