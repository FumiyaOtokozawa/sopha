// pages/employeePages/empMainPage.tsx

import { useEffect, useState } from "react";
import LogoutButton from "../../components/LogoutButton";
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

const EmpMainPage = () => {
  // 社員番号
  const [employeeNumber, setEmployeeNumber] = useState<string | null>(null);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [history, setHistory] = useState<PointHistory[]>([]);

  // ログインユーザーからemployeeNumberを取得する
  useEffect(() => {
    const fetchUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // USER_ROLEからemployee_numberを取得
        const { data, error } = await supabase
          .from("USER_LINK_EMPLOYEE")
          .select("employee_number")
          .eq("uid", user.id)
          .single();

        if (error) {
          console.error("社員番号の取得エラー：", error.message);
        } else {
          setEmployeeNumber(data?.employee_number ?? null);
        }
      }
    };

    fetchUserId();
  }, []);

  // employeeNumberがセットされたら、社員情報・ポイント情報・履歴を一括で取得
  useEffect(() => {
    if (!employeeNumber) return;

    // 社員データを取得
    const fetchEmployee = async () => {
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
    };
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

    // まとめて呼び出し
    fetchEmployee();
    fetchPoints();
    fetchHistory();
  }, [employeeNumber]);

  // まだ社員情報を読み込んでなければローディングを表示
  if (!employee) {
    return <p>社員情報を読み込んでいます...</p>;
  }

  return (
    <div>
      <h1>Employee Main Page</h1>

      <h2>{`${employee.last_name} ${employee.first_name} さんのページ`}</h2>
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

      <LogoutButton />
    </div>
  );
};

export default EmpMainPage;
