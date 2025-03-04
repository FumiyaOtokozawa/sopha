import { useEffect, useState, useCallback } from "react";
import SearchIcon from "@mui/icons-material/Search";
import { supabase } from "../utils/supabaseClient";
import type { User } from "../types/user";

interface UserSearchListProps {
  title: string;
  excludeEmpNo?: number;
  onUserSelect: (user: User) => void;
}

const UserSearchList = ({ title, excludeEmpNo, onUserSelect }: UserSearchListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  // 検索処理
  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    let query = supabase
      .from("USER_INFO")
      .select("emp_no, myoji, namae, last_nm, first_nm")
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
      setUsers(data || []);
    }
  }, [searchTerm, excludeEmpNo]);

  // 初期表示
  useEffect(() => {
    handleSearch({ preventDefault: () => {} } as React.FormEvent);
  }, [excludeEmpNo, handleSearch]);

  return (
    <div className="bg-[#2D2D33] rounded-lg p-6">
      {/* 検索ボックス */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-4 text-white">{title}</h2>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="ユーザー名を入力"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded py-2 pl-3 pr-10 bg-[#1D1D21] border border-[#3D3D45] focus:outline-none focus:border-[#8E93DA] text-sm text-white placeholder-gray-400"
            autoFocus
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#ACACAC] hover:text-white"
          >
            <SearchIcon fontSize="small" />
          </button>
        </form>
      </div>

      {/* 検索結果 */}
      <div className="mt-4">
        {users.length === 0 ? (
          <div className="text-center py-8 text-[#ACACAC] text-sm">
            該当するユーザーがいません
          </div>
        ) : (
          <ul className="divide-y divide-[#3D3D45]">
            {users.map((user) => (
              <li
                key={user.emp_no}
                className="hover:bg-[#3a3b3e] transition-colors"
              >
                <button
                  className="px-3 py-2 flex items-center w-full text-left"
                  onClick={() => onUserSelect(user)}
                >
                  <div className="w-8 h-8 bg-[#8E93DA] rounded-full flex items-center justify-center text-black font-medium flex-shrink-0 mr-3">
                    {user.myoji.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{`${user.myoji} ${user.namae}`}</p>
                    <p className="text-xs text-[#ACACAC]">{`${user.last_nm} ${user.first_nm}`}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UserSearchList; 