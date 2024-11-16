// pages/employeePages/employee[employeeNumber]Page.tsx

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";

type Employee = {
  last_nm: string;
  first_nm: string;
};

const EmployeeSelfPage = () => {
  const router = useRouter();
  const { employeeNumber } = router.query;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    console.log("取得したemployeeId:", employeeNumber);
    //社員データを取得
    const fetchEmployee = async () => {
      if (employeeNumber) {
        const { data, error } = await supabase
          .from("EMPLOYEE_LIST")
          .select("last_nm, first_nm")
          .eq("employee_number", employeeNumber)
          .single();

        if (error) {
          console.error("エラーが発生しました：", error.message);
        } else {
          setEmployee(data as Employee);
        }
      }
    };

    fetchEmployee();

    // 社員の保有ポイントを取得
    const fetchPoints = async () => {
      if (employeeNumber) {
        const { data, error } = await supabase
          .from("EMPLOYEE_POINTS")
          .select("total_points")
          .eq("employee_number", employeeNumber)
          .single();

        if (error) {
          console.error("ポイントデータの取得エラー：", error.message);
        } else {
          setPoints(data?.total_points ?? 0);
        }
      }
    };

    fetchPoints();
  }, [employeeNumber]);

  if (!employee) {
    return <p>社員情報を読み込んでいます…</p>;
  }

  return (
    <div>
      <h1>{`${employee.last_nm} ${employee.first_nm} さんのページ`}</h1>
      <p>保有ポイント： {points !== null ? `${points} ciz` : "読み込み中…"}</p>
    </div>
  );
};

export default EmployeeSelfPage;
