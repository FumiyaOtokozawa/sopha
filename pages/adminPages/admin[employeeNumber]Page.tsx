import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";

type Employee = {
  last_nm: string;
  first_nm: string;
  email?: string;
};

const AdminEmployeePage = () => {
  const router = useRouter();
  const { employeeNumber } = router.query;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [changePoints, setChangePoints] = useState<number>(0);
  const [changeType, setChangeType] = useState<"add" | "subtract">("add");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        if (!employeeNumber) return;

        const [employeeResponse, pointsResponse] = await Promise.all([
          supabase
            .from("EMPLOYEE_LIST")
            .select("last_nm, first_nm")
            .eq("employee_number", employeeNumber)
            .single(),
          supabase
            .from("EMPLOYEE_POINTS")
            .select("total_points")
            .eq("employee_number", employeeNumber)
            .single(),
        ]);

        if (employeeResponse.error) {
          throw new Error(
            `社員情報の取得エラー: ${employeeResponse.error.message}`
          );
        }
        if (pointsResponse.error) {
          throw new Error(
            `ポイントデータの取得エラー: ${pointsResponse.error.message}`
          );
        }

        setEmployee(employeeResponse.data as Employee);
        setPoints(pointsResponse.data?.total_points ?? 0);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("データ取得エラー:", error.message);
          setErrorMessage(error.message);
        } else {
          console.error("予期しないエラーが発生しました:", error);
          setErrorMessage("予期しないエラーが発生しました。");
        }
      }
    };

    fetchEmployeeData();
  }, [employeeNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeNumber) return;

    const adjustedPoints = changeType === "add" ? changePoints : -changePoints;

    try {
      // ポイントの更新
      const { error: updateError } = await supabase
        .from("EMPLOYEE_POINTS")
        .update({
          total_points: points! + adjustedPoints,
          updated_at: new Date(),
        })
        .eq("employee_number", employeeNumber);

      if (updateError) {
        throw new Error(`ポイント更新エラー: ${updateError.message}`);
      }

      // ポイント履歴の追加
      const history = {
        employee_number: Number(employeeNumber),
        change_type: changeType === "add" ? "増加" : "減少",
        points: Math.abs(adjustedPoints),
        reason: "管理者による調整",
        created_at: new Date(),
      };

      const { error: historyError } = await supabase
        .from("EMPLOYEE_POINT_HISTORY")
        .insert([history]);

      if (historyError) {
        throw new Error(`ポイント履歴追加エラー: ${historyError.message}`);
      }

      setPoints(points! + adjustedPoints);
      setActionMessage("ポイントを正常に更新しました。");
      setChangePoints(0);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("ポイント調整エラー:", error.message);
        setErrorMessage(error.message);
      } else {
        console.error("予期しないエラーが発生しました:", error);
        setErrorMessage("予期しないエラーが発生しました。");
      }
    }
  };

  if (errorMessage) {
    return <p style={{ color: "red" }}>エラー: {errorMessage}</p>;
  }

  if (!employee) {
    return <p>社員情報を読み込んでいます…</p>;
  }

  return (
    <div>
      <h1>{`${employee.last_nm} ${employee.first_nm} さんのページ`}</h1>
      <p>保有ポイント： {points !== null ? `${points} ciz` : "読み込み中…"}</p>

      <h2>ポイント調整</h2>
      {actionMessage && <p style={{ color: "green" }}>{actionMessage}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="changeType">調整タイプ:</label>
          <select
            id="changeType"
            value={changeType}
            onChange={(e) =>
              setChangeType(e.target.value as "add" | "subtract")
            }
          >
            <option value="add">増加</option>
            <option value="subtract">減少</option>
          </select>
        </div>
        <div>
          <label htmlFor="changePoints">ポイント数:</label>
          <input
            id="changePoints"
            type="number"
            value={changePoints}
            onChange={(e) => setChangePoints(Number(e.target.value))}
            required
            min={1}
          />
        </div>
        <button type="submit">ポイントを更新</button>
      </form>
    </div>
  );
};

export default AdminEmployeePage;
