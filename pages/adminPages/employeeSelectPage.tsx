// pages/adminPages/employeeSelectPage.tsx

import { useState } from "react";
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
      .ilike("last_nm", `%${searchTerm}%`); // 姓の部分一致検索

    if (error) {
      console.error("エラーが発生しました：", error.message);
    } else {
      console.log("データが取得されました:", data);
      setEmployees(data as Employee[]);
    }
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
            {`${employee.last_nm} ${employee.first_nm} (${employee.email})`}
          </li>
        ))}
      </ul>
      <LogoutButton />
    </div>
  );
};

export default EmployeeSelect;
