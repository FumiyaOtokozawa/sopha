import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, CircularProgress } from "@mui/material";
import Image from "next/image";
import BadgeIcon from "@mui/icons-material/Badge";
import EmailIcon from "@mui/icons-material/Email";
import WcIcon from "@mui/icons-material/Wc";
import CakeIcon from "@mui/icons-material/Cake";
import { supabase } from "../utils/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  empNo: number | null;
}

// 画像拡大モーダルのコンポーネント
const ImageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  userName: string;
}> = ({ isOpen, onClose, imageUrl, userName }) => {
  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: "transparent",
          boxShadow: "none",
          overflow: "hidden",
        },
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
        className="relative w-full aspect-square max-w-2xl mx-auto"
      >
        <Image
          src={imageUrl}
          alt={`${userName}のプロフィール画像`}
          fill
          className="object-contain rounded-lg"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority
        />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          ×
        </button>
      </motion.div>
    </Dialog>
  );
};

const ProfileModal: React.FC<ProfileModalProps> = ({
  open,
  onClose,
  empNo,
}) => {
  const [profile, setProfile] = useState<{
    emp_no: string;
    myoji: string;
    namae: string;
    last_nm: string;
    first_nm: string;
    gender: string;
    email: string;
    icon_url: string | null;
    birthday: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!empNo) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("USER_INFO")
          .select("*")
          .eq("emp_no", empNo)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (open && empNo) {
      fetchProfile();
    }
  }, [open, empNo]);

  if (!open) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "#2D2D33",
            borderRadius: "1rem",
            border: "1px solid #3D3D43",
          },
        }}
      >
        <DialogContent sx={{ padding: 0 }}>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <CircularProgress sx={{ color: "#8E93DA" }} />
            </div>
          ) : profile ? (
            <div>
              {/* プロフィールヘッダー */}
              <div className="p-4 flex items-start gap-3 border-b border-[#3D3D43]">
                {/* プロフィール画像 */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1D1D21] to-[#2D2D33] overflow-hidden border-2 border-[#8E93DA] flex-shrink-0 cursor-pointer"
                  onClick={() => profile.icon_url && setIsImageModalOpen(true)}
                >
                  {profile.icon_url ? (
                    <Image
                      src={profile.icon_url}
                      alt="プロフィール画像"
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#FCFCFC] bg-gradient-to-br from-[#2D2D33] to-[#1D1D21]">
                      <span className="text-base font-medium">
                        {profile.myoji?.charAt(0)}
                        {profile.namae?.charAt(0)}
                      </span>
                    </div>
                  )}
                </motion.div>

                {/* 名前と性別 */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-[#FCFCFC] truncate">
                    {profile.myoji} {profile.namae}
                  </h2>
                  <p className="text-[#AEAEB2] text-xs">
                    {profile.last_nm} {profile.first_nm}
                  </p>
                  <div className="mt-1 flex items-center">
                    <WcIcon sx={{ color: "#8E93DA", fontSize: 16 }} />
                    <span className="ml-1 text-xs text-[#FCFCFC]">
                      {profile.gender === "1"
                        ? "男性"
                        : profile.gender === "0"
                        ? "女性"
                        : "その他"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 基本情報 */}
              <div className="p-4">
                <h3 className="text-xs font-medium text-[#AEAEB2] mb-2 uppercase tracking-wider opacity-80">
                  基本情報
                </h3>
                <div className="space-y-3">
                  {/* 社員番号 */}
                  <div className="flex items-center p-2 bg-[#23232A] rounded-lg">
                    <BadgeIcon sx={{ color: "#8E93DA", fontSize: 20 }} />
                    <div className="ml-3 flex-1">
                      <div className="text-[10px] text-[#AEAEB2] opacity-75">
                        社員番号
                      </div>
                      <div className="text-[#FCFCFC] font-medium">
                        {profile.emp_no}
                      </div>
                    </div>
                  </div>

                  {/* メールアドレス */}
                  <div className="flex items-center p-2 bg-[#23232A] rounded-lg">
                    <EmailIcon sx={{ color: "#8E93DA", fontSize: 20 }} />
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="text-[10px] text-[#AEAEB2] opacity-75">
                        メールアドレス
                      </div>
                      <div className="text-[#FCFCFC] truncate">
                        {profile.email}
                      </div>
                    </div>
                  </div>

                  {/* 生年月日 */}
                  <div className="flex items-center p-2 bg-[#23232A] rounded-lg">
                    <CakeIcon sx={{ color: "#8E93DA", fontSize: 20 }} />
                    <div className="ml-3 flex-1">
                      <div className="text-[10px] text-[#AEAEB2] opacity-75">
                        生年月日
                      </div>
                      <div className="text-[#FCFCFC]">
                        {profile.birthday
                          ? new Date(profile.birthday).toLocaleDateString(
                              "ja-JP",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )
                          : "未設定"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-48 text-[#FCFCFC]">
              プロフィールの取得に失敗しました
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 画像拡大モーダル */}
      <AnimatePresence>
        {profile?.icon_url && (
          <ImageModal
            isOpen={isImageModalOpen}
            onClose={() => setIsImageModalOpen(false)}
            imageUrl={profile.icon_url}
            userName={`${profile.myoji} ${profile.namae}`}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default ProfileModal;
