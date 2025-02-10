import { useEffect, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import { supabase } from "../utils/supabaseClient";

interface User {
  emp_no: number;
  myoji: string;
  namae: string;
  last_nm: string;
  first_nm: string;
}

interface UserSearchListProps {
  title: string;
  excludeEmpNo?: number;
  onUserSelect: (user: User) => void;
}

const UserSearchList = ({ title, excludeEmpNo, onUserSelect }: UserSearchListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  // 検索処理
  const handleSearch = async (e: React.FormEvent) => {
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
  };

  // 初期表示
  useEffect(() => {
    handleSearch({ preventDefault: () => {} } as React.FormEvent);
  }, [excludeEmpNo]);

  return (
    <div className="p-6 flex flex-col items-center">
      {/* 検索ボックス */}
      <div className="w-full max-w-xl">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="type name here"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded py-2 pl-3 pr-10 bg-[#2f3033] focus:outline-none placeholder-gray-400"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 text-gray-400 hover:text-gray-200"
          >
            <SearchIcon />
          </button>
        </form>
      </div>

      {/* 検索結果 */}
      <div className="w-full max-w-xl mt-6">
        <h3 className="text-lg font-semibold mb-2">検索結果</h3>
        <div className="flex items-center bg-[#2f3033] text-sm font-semibold text-gray-200 rounded-t-md px-4 py-2 border-b border-gray-600">
          <span className="w-8 h-8 flex items-center justify-center mr-4">
            <PersonIcon />
          </span>
          <p className="flex-1">Name</p>
        </div>
        <ul className="rounded-b-md">
          {users.length === 0 ? (
            <li className="px-4 py-3 text-gray-400">該当する社員がいません</li>
          ) : (
            users.map((user) => (
              <li
                key={user.emp_no}
                className="flex items-center cursor-pointer hover:bg-[#3a3b3e] border-b border-gray-400"
              >
                <button
                  className="px-4 py-3 flex items-center w-full"
                  onClick={() => onUserSelect(user)}
                >
                  <div className="w-8 h-8 bg-gray-500 rounded-full flex-shrink-0 mr-4" />
                  <div>
                    <p className="text-base">{`${user.myoji} ${user.namae}`}</p>
                    <p className="text-sm text-gray-400">{`${user.last_nm} ${user.first_nm}`}</p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default UserSearchList; 