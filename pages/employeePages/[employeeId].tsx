// pages/employeePages/[employeeId].tsx

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";

type Employee = {
  last_nm: string;
  first_nm: string;
};

const EmployeePage = () => {
  const router = useRouter();
  const { employeeId } = router.query;
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    //社員データを取得
    const fetchEmployee = async () => {
      if (employeeId) {
        const { data, error } = await supabase
          .from("EMPLOYEE_LIST")
          .select("last_nm, first_nm")
          .eq("employee_number", employeeId)
          .single();

        if (error) {
          console.error("エラーが発生しました：", error.message);
        } else {
          setEmployee(data as Employee);
        }
      }
    };

    fetchEmployee();
  }, [employeeId]);

  if (!employee) {
    return <p>社員情報を読み込んでいます…</p>;
  }

  return (
    <div>
      <h1>{`${employee.last_nm} ${employee.first_nm} さんのページ`}</h1>
    </div>
  );
};

export default EmployeePage;
