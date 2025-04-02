import { Dialog, DialogContent } from "@mui/material";
import { useState, useCallback, useEffect } from "react";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { supabase } from "../utils/supabaseClient";
import type { User } from "../types/user";
import Image from "next/image";
import { Skeleton } from "@mui/material";

interface UserSelectModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (user: User) => void;
  excludeEmpNo?: number;
}

const UserSelectModal: React.FC<UserSelectModalProps> = ({
  open,
  onClose,
  onSelect,
  excludeEmpNo,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loadingImages, setLoadingImages] = useState<{
    [key: number]: boolean;
  }>({});

  // 画像の読み込み状態を管理
  const handleImageLoad = (empNo: number) => {
    setLoadingImages((prev) => ({
      ...prev,
      [empNo]: false,
    }));
  };

  // 検索処理
  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      let query = supabase
        .from("USER_INFO")
        .select("emp_no, myoji, namae, last_nm, first_nm, icon_url")
        .eq("act_kbn", true);

      if (excludeEmpNo) {
        query = query.neq("emp_no", excludeEmpNo);
      }

      if (searchTerm) {
        query = query.or(
          `myoji.ilike.%${searchTerm}%,namae.ilike.%${searchTerm}%,last_nm.ilike.%${searchTerm}%,first_nm.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query.order("emp_no");

      if (error) {
        console.error("検索エラー:", error);
      } else {
        // 画像の読み込み状態を初期化
        const initialLoadingState = (data || []).reduce(
          (acc, user) => ({
            ...acc,
            [user.emp_no]: true,
          }),
          {}
        );
        setLoadingImages(initialLoadingState);
        setUsers(data || []);
      }
    },
    [searchTerm, excludeEmpNo]
  );

  // 初期表示
  useEffect(() => {
    if (open) {
      handleSearch();
    }
  }, [open, handleSearch]);

  // ユーザー選択時のハンドラー
  const handleUserSelect = (user: User) => {
    onSelect(user);
    onClose();
  };

  // ユーザー情報の安全な表示のためのヘルパー関数
  const getUserDisplayName = (user: User) => {
    const myoji = user?.myoji || "未設定";
    const namae = user?.namae || "";
    const lastName = user?.last_nm || "";
    const firstName = user?.first_nm || "";

    return {
      fullName: `${myoji} ${namae}`.trim(),
      romanName: `${lastName} ${firstName}`.trim() || "未設定",
    };
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-label="ユーザー選択"
      PaperProps={{
        style: {
          backgroundColor: "#2D2D33",
          color: "#FCFCFC",
          height: "60vh",
          margin: "16px",
          borderRadius: "8px",
          overflow: "hidden",
        },
      }}
    >
      <DialogContent
        sx={{
          padding: "16px",
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#3D3D45",
            borderRadius: "4px",
          },
        }}
      >
        {/* 検索ボックス */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="relative flex-1">
              <input
                type="text"
                placeholder="ユーザー名を入力"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded py-2 pl-3 pr-10 bg-[#1D1D21] border border-[#3D3D45] focus:outline-none focus:border-[#8E93DA] text-sm"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#ACACAC] hover:text-[#FCFCFC]"
                aria-label="検索"
              >
                <SearchIcon fontSize="small" />
              </button>
            </form>
            <button
              onClick={onClose}
              className="text-[#ACACAC] hover:text-[#FCFCFC] p-1 rounded-full hover:bg-[#3D3D45] flex-shrink-0"
              aria-label="閉じる"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>
        </div>

        {/* 検索結果 */}
        <div className="mt-2">
          {users.length === 0 ? (
            <div className="text-center py-8 text-[#ACACAC] text-sm">
              該当するユーザーがいません
            </div>
          ) : (
            <ul className="divide-y divide-[#3D3D45] -mx-2">
              {users.map((user) => {
                if (!user?.emp_no) return null;
                const { fullName, romanName } = getUserDisplayName(user);

                return (
                  <li
                    key={user.emp_no}
                    className="hover:bg-[#3a3b3e] transition-colors"
                  >
                    <button
                      className="px-3 py-2 flex items-center w-full text-left"
                      onClick={() => handleUserSelect(user)}
                    >
                      {user?.icon_url ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mr-3 relative">
                          {loadingImages[user.emp_no] && (
                            <Skeleton
                              variant="circular"
                              width={32}
                              height={32}
                              className="absolute inset-0 z-10"
                              sx={{
                                backgroundColor: "#3D3D45",
                              }}
                            />
                          )}
                          <Image
                            src={user.icon_url}
                            alt={`${fullName}のアイコン`}
                            width={32}
                            height={32}
                            className="object-cover"
                            onLoadingComplete={() =>
                              handleImageLoad(user.emp_no)
                            }
                            loading="eager"
                            priority={true}
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-[#8E93DA] rounded-full flex items-center justify-center text-black font-medium flex-shrink-0 mr-3">
                          {(user?.myoji || "未").charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{fullName}</p>
                        <p className="text-xs text-[#ACACAC]">{romanName}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserSelectModal;
