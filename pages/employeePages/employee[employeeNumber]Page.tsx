// pages/employeePages/employee[employeeNumber]Page.tsx

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";

type Employee = {
  last_name: string;
  first_name: string;
};

type PointHistory = {
  created_at: string;
  change_type: string;
  points: number;
  reason: string;
};

const EmployeeSelfPage = () => {
  const router = useRouter();
  const { employeeNumber } = router.query;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [history, setHistory] = useState<PointHistory[]>([]);

  useEffect(() => {
    console.log("取得したemployeeId:", employeeNumber);

    //社員データを取得
    const fetchEmployee = async () => {
      if (employeeNumber) {
        const { data, error } = await supabase
          .from("EMPLOYEE_LIST")
          .select("last_name, first_name")
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

    // ポイント履歴を取得
    const fetchHistory = async () => {
      if (employeeNumber) {
        const { data, error } = await supabase
          .from("EMPLOYEE_POINT_HISTORY")
          .select("created_at, change_type, points, reason")
          .eq("employee_number", employeeNumber)
          .order("created_at", { ascending: false }); // 最新の履歴を上に表示

        if (error) {
          console.error("ポイント履歴の取得エラー：", error.message);
        } else {
          setHistory(data as PointHistory[]);
        }
      }
    };

    fetchHistory();
  }, [employeeNumber]);

  if (!employee) {
    return <p>社員情報を読み込んでいます…</p>;
  }

  return (
    <div>
      <h1>{`${employee.last_name} ${employee.first_name} さんのページ`}</h1>
      <p>保有ポイント： {points !== null ? `${points} ciz` : "読み込み中…"}</p>

      <h2>ポイント履歴</h2>
      {history.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>日付</th>
              <th>種別</th>
              <th>変動ポイント</th>
              <th>理由</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.created_at}>
                <td>{new Date(item.created_at).toLocaleString()}</td>
                <td>{item.change_type}</td>
                <td>{item.points}</td>
                <td>{item.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>履歴データがありません。</p>
      )}
    </div>
  );
};

export default EmployeeSelfPage;
