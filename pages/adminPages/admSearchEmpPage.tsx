// pages/adminPages/admSearchEmpPage.tsx

import { useState } from "react";
import { useRouter } from "next/router";
import LogoutButton from "../../components/LogoutButton";
import supabase from "../../supabaseClient";

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

  // 検索の実行
  const fetchEmployees = async () => {
    console.log("fetchEmployees関数が実行されました");
    const { data, error } = await supabase
      .from("USER_INFO")
      .select("emp_no, myoji, namae, last_nm, first_nm, gender, email")
      // 部分一致検索: myoji, namae, last_nm, first_nmのいずれかに含まれる
      .or(
        `myoji.ilike.%${searchTerm}%,namae.ilike.%${searchTerm}%,last_nm.ilike.%${searchTerm}%,first_nm.ilike.%${searchTerm}%`
      )
      .eq("act_kbn", true);

    if (error) {
      console.error("エラーが発生しました：", error.message);
    } else {
      console.log("データが取得されました:", data);
      // 取得データを状態に格納
      setEmployees(data as Employee[]);
    }
  };

  // 社員名をクリックした際の処理
  const handleEmployeeClick = (empNo: number) => {
    // ポイント編集ページに遷移
    router.push(`/adminPages/admPointEditPage?empNo=${empNo}`);
  };

  // 検索ボタンが押された時の処理
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("検索ボタンが押されました");
    fetchEmployees();
  };

  return (
    <div>
      <h1>EmployeeSelect page</h1>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="社員名を入力"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="submit">検索</button>
      </form>

      <ul>
        {employees.map((employee) => (
          <li key={employee.emp_no}>
            <button
              onClick={() => handleEmployeeClick(employee.emp_no)}
              style={{
                cursor: "pointer",
                color: "blue",
                background: "none",
                border: "none",
                padding: "0",
                textDecoration: "underline",
              }}
              aria-label={`社員${employee.myoji} ${employee.namae}のポイント管理ページへ`}
            >
              {`${employee.myoji} ${employee.namae} (${employee.email})`}
            </button>
          </li>
        ))}
      </ul>
      <LogoutButton />
    </div>
  );
};

export default EmployeeSelect;
