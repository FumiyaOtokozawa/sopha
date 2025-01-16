// pages/adminPages/admSearchEmpPage.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import supabase from "../../supabaseClient";
import AdminHeader from "../../components/AdminHeader";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";

type Employee = {
  emp_no: number;
  myoji: string;
  namae: string;
  last_nm: string;
  first_nm: string;
  gender: string;
  email: string;
};

const EmployeeSelect = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(""); // 検索ワード
  const [employees, setEmployees] = useState<Employee[]>([]); // 検索結果の社員リスト

  // 初期表示で全件を取得
  useEffect(() => {
    (async () => {
      await fetchAllEmployees();
    })();
  }, []);

  // 全件取得
  const fetchAllEmployees = async () => {
    const { data, error } = await supabase
      .from("USER_INFO")
      .select("emp_no, myoji, namae, last_nm, first_nm, gender, email")
      .eq("act_kbn", true)
      .order("emp_no");

    if (error) {
      console.error("全件取得エラー:", error.message);
    } else if (data) {
      setEmployees(data as Employee[]);
    }
  };

  // 検索用関数
  const fetchEmployees = async () => {
    // 検索文字が空の場合は全件取得
    if (!searchTerm.trim()) {
      await fetchAllEmployees();
      return;
    }

    console.log("部分一致検索を実行します:", searchTerm);
    const { data, error } = await supabase
      .from("USER_INFO")
      .select("emp_no, myoji, namae, last_nm, first_nm, gender, email")
      .or(
        `myoji.ilike.%${searchTerm}%,namae.ilike.%${searchTerm}%,last_nm.ilike.%${searchTerm}%,first_nm.ilike.%${searchTerm}%`
      )
      .eq("act_kbn", true)
      .order("emp_no");

    if (error) {
      console.error("検索エラー:", error.message);
    } else {
      console.log("検索結果:", data);
      setEmployees(data as Employee[]);
    }
  };

  // 検索ボタン押下時
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchEmployees();
  };

  // 社員名クリック時: ポイント編集ページへ遷移
  const handleEmployeeClick = (empNo: number) => {
    router.push(`/adminPages/admPointEditPage?empNo=${empNo}`);
  };

  return (
    <div className="bg-[#1f1f1f] min-h-screen text-white">
      {/* ヘッダー（共通部分） */}
      <AdminHeader />

      {/* メインコンテンツ */}
      <div className="p-6 flex flex-col items-center">
        {/* 検索ボックス */}
        <div className="w-full max-w-xl">
          <h2 className="text-lg font-semibold mb-2">社員検索</h2>
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="type name here"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded py-2 pl-3 pr-10 bg-[#2f3033] focus:outline-none placeholder-gray-400"
            />
            {/* 虫眼鏡マーク */}
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
          {/* ヘッダー部分 */}
          <div className="flex items-center bg-[#2f3033] text-sm font-semibold text-gray-200 rounded-t-md px-4 py-2 border-b border-gray-600">
            <span className="w-8 h-8 flex items-center justify-center mr-4">
              <PersonIcon />
            </span>
            <p className="flex-1">Name</p>
          </div>
          {/* リスト部分 */}
          <ul className="rounded-b-md ">
            {employees.length === 0 ? (
              <li className="px-4 py-3 text-gray-400">
                該当する社員がいません
              </li>
            ) : (
              employees.map((employee) => (
                <li
                  key={employee.emp_no}
                  className="flex items-center cursor-pointer hover:bg-[#3a3b3e] border-b border-gray-400"
                >
                  <button
                    className="px-4 py-3 flex items-center"
                    onClick={() => handleEmployeeClick(employee.emp_no)}
                  >
                    {/* 丸アイコン */}
                    <div className="w-8 h-8 bg-gray-500 rounded-full flex-shrink-0 mr-4" />
                    {/* 社員名 */}
                    <p className="text-base">{`${employee.myoji} ${employee.namae}`}</p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSelect;
