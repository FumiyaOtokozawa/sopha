// pages/adminPages/employeeSelectPage.tsx

import { useState } from "react";
import { useRouter } from "next/router";
import LogoutButton from "../../components/LogoutButton";
import supabase from "../../supabaseClient";

type Employee = {
  employee_number: number;
  last_name: string;
  first_name: string;
  last_name_alp: string;
  first_name_alp: string;
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
      .from("EMPLOYEE_LIST")
      .select(
        "employee_number, last_name, first_name, last_name_alp, first_name_alp, gender, email"
      )
      .or(
        `last_name.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name_alp.ilike.%${searchTerm}%,first_name_alp.ilike.%${searchTerm}%`
      ); // 氏名の部分一致検索

    if (error) {
      console.error("エラーが発生しました：", error.message);
    } else {
      console.log("データが取得されました:", data);
      setEmployees(data as Employee[]);
    }
  };

  // 社員名をクリックした際の処理
  const handleEmployeeClick = (employeeNumber: number) => {
    router.push(
      `/adminPages/admin[employeeNumber]Page?employeeNumber=${employeeNumber}`
    );
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
              aria-label={`社員${employee.last_name} ${employee.first_name}のマイページへ`}
            >
              {`${employee.last_name} ${employee.first_name} (${employee.email})`}
            </button>
          </li>
        ))}
      </ul>
      <LogoutButton />
    </div>
  );
};

export default EmployeeSelect;
