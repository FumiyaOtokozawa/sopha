// pages/adminPages/admPointEditPage.tsx

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import AdminHeader from "../../components/AdminHeader";

type Employee = {
  last_nm: string;
  first_nm: string;
  email?: string;
};

const AdminEmployeePage = () => {
  const router = useRouter();
  const { empNo } = router.query;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [changePoints, setChangePoints] = useState<number>(0);
  const [changeType, setChangeType] = useState<"add" | "subtract">("add");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeButton, setActiveButton] = useState<"add" | "subtract" | null>(
    null
  );

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        if (!empNo) return;

        const [employeeResponse, pointsResponse] = await Promise.all([
          supabase
            .from("USER_INFO")
            .select("last_nm, first_nm")
            .eq("emp_no", empNo)
            .single(),
          supabase
            .from("EMP_CIZ")
            .select("total_ciz")
            .eq("emp_no", empNo)
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
        setPoints(pointsResponse.data?.total_ciz ?? 0);
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
  }, [empNo]);

  const handleAddPoints = () => {
    console.log("ポイント加算ボタンがクリックされました");
    setActiveButton("add");
    // TODO: ポイント加算処理を実装
  };

  const handleSubtractPoints = () => {
    console.log("ポイント減算ボタンがクリックされました");
    setActiveButton("subtract");
    // TODO: ポイント減算処理を実装
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empNo) return;

    const adjustedPoints = changeType === "add" ? changePoints : -changePoints;

    try {
      // ポイントの更新
      const { error: updateError } = await supabase
        .from("EMP_CIZ")
        .update({
          total_ciz: points! + adjustedPoints,
          updated_at: new Date(),
        })
        .eq("emp_no", empNo);

      if (updateError) {
        throw new Error(`ポイント更新エラー: ${updateError.message}`);
      }

      // ポイント履歴の追加
      const history = {
        emp_no: empNo,
        change_type: changeType === "add" ? "add" : "subtract",
        ciz: Math.abs(adjustedPoints),
        reason: "管理者による調整",
        created_at: new Date(),
        act_kbn: true,
      };

      const { error: historyError } = await supabase
        .from("EMP_CIZ_HISTORY")
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
      {/* ヘッダー（共通部分） */}
      <AdminHeader />

      {/* メインコンテンツ */}
      <div className="p-6">
        {/* アイコンと社員情報 */}
        <div className="flex flex-col items-center mb-6">
          {/* アイコン */}
          <div className="w-16 h-16 bg-orange-300 rounded-full flex items-center justify-center mb-4"></div>

          {/* 名前 */}
          <h1 className="text-xl font-semibold">
            {`${employee.last_nm} ${employee.first_nm}`}
          </h1>

          {/* 社員番号 */}
          <p className="text-gray-400">{`No.${empNo}`}</p>
        </div>

        {/* ポイントボックス */}
        <div className="bg-[#2f3033] rounded-lg shadow-md p-6 w-full max-w flex flex-col items-center mb-6 mx-auto">
          <h2 className="text-3xl font-bold mb-2">
            {points?.toLocaleString()}{" "}
            <span className="text-gray-400">ciz</span>
          </h2>
          {/* 加算減算ボタン */}
          <div className="flex justify-center gap-4 w-full max-w-md">
            <button
              onClick={handleAddPoints}
              className={`w-24 py-2 rounded w-1/2 ${
                activeButton === "add"
                  ? "bg-[#66EA89] text-black"
                  : "bg-[#66EA89] bg-opacity-50 text-gray-700"
              } `}
            >
              ADD
            </button>
            <button
              onClick={handleSubtractPoints}
              className={`w-24 py-2 rounded w-1/2 ${
                activeButton === "subtract"
                  ? "bg-[#EF6A6A] text-black"
                  : "bg-[#EF6A6A] bg-opacity-50 text-gray-700"
              } `}
            >
              SUBTRACT
            </button>
          </div>
          {/* 吹き出し */}
          {activeButton && (
            <div className={`relative flex justify-center`}>
              <div
                className={`absolute mt-4 ${
                  activeButton === "add" ? "right-10" : "left-10"
                }`}
              >
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 items-center text-black text-2xl font-bold">
                    {activeButton === "add" ? "＋" : "－"}
                  </span>
                  <input
                    type="number"
                    value={changePoints}
                    onChange={(e) => setChangePoints(Number(e.target.value))}
                    className="text-black inset-y-0 pl-10 text-xl font-bold rounded-full w-[150px]"
                    placeholder="Enter value"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <h2 className="text-lg font-semibold mb-2">ポイント調整</h2>
        {actionMessage && (
          <p className="text-green-400 mb-4">{actionMessage}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="changeType" className="block mb-1">
              調整タイプ:
            </label>
            <select
              id="changeType"
              value={changeType}
              onChange={(e) =>
                setChangeType(e.target.value as "add" | "subtract")
              }
              className="p-2 rounded bg-gray-800 border border-gray-700"
            >
              <option value="add">増加</option>
              <option value="subtract">減少</option>
            </select>
          </div>
          <div>
            <label htmlFor="changePoints" className="block mb-1">
              ポイント数:
            </label>
            <input
              id="changePoints"
              type="number"
              value={changePoints}
              onChange={(e) => setChangePoints(Number(e.target.value))}
              required
              min={1}
              className="p-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600"
          >
            ポイントを更新
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminEmployeePage;
