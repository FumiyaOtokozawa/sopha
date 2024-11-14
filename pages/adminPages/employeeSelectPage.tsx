// pages/adminPages/employeeSelectPage.tsx

import { useState } from "react";
import { useRouter } from "next/router";
import LogoutButton from "../../components/LogoutButton";
import supabase from "../../supabaseClient";

type Employee = {
  employee_number: number;
  last_nm: string;
  first_nm: string;
  last_nm_alp: string;
  first_nm_alp: string;
  gender: number;
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
      .from("EMPLOYEES_LIST")
      .select(
        "employee_number, last_nm, first_nm, last_nm_alp, first_nm_alp, gender, email"
      )
      .or(
        `last_nm.ilike.%${searchTerm}%,first_nm.ilike.%${searchTerm}%,last_nm_alp.ilike.%${searchTerm}%,first_nm_alp.ilike.%${searchTerm}%`
      ); // 氏名の部分一致検索

    if (error) {
      console.error("エラーが発生しました：", error.message);
    } else {
      console.log("データが取得されました:", data);
      setEmployees(data as Employee[]);
    }
  };

  // 社員名をクリックした際の処理
  const handleEmployeeClick = (employeeId: number) => {
    router.push(`/employeePages/${employeeId}`);
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
          <li key={employee.employee_number}>
            <button
              onClick={() => handleEmployeeClick(employee.employee_number)}
              style={{
                cursor: "pointer",
                color: "blue",
                background: "none",
                border: "none",
                padding: "0",
                textDecoration: "underline",
              }}
              aria-label={`社員${employee.last_nm} ${employee.first_nm}のマイページへ`}
            >
              {`${employee.last_nm} ${employee.first_nm} (${employee.email})`}
            </button>
          </li>
        ))}
      </ul>
      <LogoutButton />
    </div>
  );
};

export default EmployeeSelect;
