// pages/adminPages/admPointEditPage.tsx

import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
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

  // 各種UI・状態管理用
  const [changePoints, setChangePoints] = useState<number>(0);
  const [changeType, setChangeType] = useState<"add" | "subtract">("add");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeButton, setActiveButton] = useState<"add" | "subtract" | null>(
    null
  );

  // 社員情報＆ポイントをまとめてフェッチ
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
    setActiveButton("add");
    setChangeType("add");
    setChangePoints(0);
  };

  const handleSubtractPoints = () => {
    setActiveButton("subtract");
    setChangeType("subtract");
    setChangePoints(0);
  };

  // 実行前に加算/減算後の数値をプレビュー
  const previewPoints = (): number => {
    if (!points) return 0;
    if (activeButton === "add") {
      return points + changePoints;
    } else if (activeButton === "subtract") {
      return points - changePoints;
    }
    return points; // どちらも未選択なら現状
  };

  // 実行
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!empNo || points === null) return;

    // DBに送るときはadd/subtractを判断して +/- を決定
    const adjustedPoints = changeType === "add" ? changePoints : -changePoints;

    try {
      // ポイントの更新
      const { error: updateError } = await supabase
        .from("EMP_CIZ")
        .update({
          total_ciz: points + adjustedPoints,
          updated_at: new Date(),
        })
        .eq("emp_no", empNo);

      if (updateError) {
        throw new Error(`ポイント更新エラー: ${updateError.message}`);
      }

      // ポイント履歴の追加
      const history = {
        emp_no: empNo,
        change_type: changeType,
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

      // 状態を更新
      setPoints((prev) => (prev !== null ? prev + adjustedPoints : null));
      setActionMessage("ポイントを正常に更新しました。");
      // 実行後は吹き出しとプレビューとボタンを閉じる
      setActiveButton(null);
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

  // エラーがある場合
  if (errorMessage) {
    return <p style={{ color: "red" }}>エラー: {errorMessage}</p>;
  }

  // データ読込中
  if (!employee) {
    return <p>社員情報を読み込んでいます…</p>;
  }

  return (
    <div>
      {/* ヘッダー（共通部分） */}
      <AdminHeader />

      {/* メインコンテンツ */}
      <div className="p-6">
        {/* 社員情報 */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-orange-300 rounded-full flex items-center justify-center mb-4"></div>
          <h1 className="text-xl font-semibold">
            {`${employee.last_nm} ${employee.first_nm}`}
          </h1>
          <p className="text-gray-400">{`No.${empNo}`}</p>
        </div>

        {/* ポイントボックス */}
        <div className="bg-[#2f3033] rounded-lg shadow-md px-12 py-8 w-full max-w-xl flex flex-col items-center mx-auto">
          {/* 現在の保有CIZ */}
          <h2 className="text-3xl font-bold mb-6">
            {points?.toLocaleString()}{" "}
            <span className="text-gray-400 ml-1">ciz</span>
          </h2>
          {/* ADD/SUBTRACTボタン */}
          <div className="flex gap-4 w-full mb-6">
            {/* ADDボタン */}
            <div className="relative w-1/2">
              <button
                onClick={handleAddPoints}
                className={`w-full py-2 rounded text-lg font-bold ${
                  activeButton === "add"
                    ? "bg-[#66EA89] text-black"
                    : "bg-[#66EA89] bg-opacity-50 text-gray-700"
                } `}
              >
                ADD
              </button>
              {/* 吹き出し（ADDがアクティブのとき） */}
              {activeButton === "add" && (
                <div className="absolute top-full mt-1 left-0 w-full">
                  <div className="bg-white text-black rounded-full shadow flex items-center justify-center">
                    <span className="text-m font-bold mx-1">＋</span>
                    <input
                      type="number"
                      min={0}
                      value={changePoints}
                      onChange={(e) => setChangePoints(Number(e.target.value))}
                      className="w-12 text-center text-m font-bold border-b border-gray-300 focus:outline-none"
                      placeholder="0"
                    />
                    <span className="ml-1 text-m">ciz</span>
                  </div>
                </div>
              )}
            </div>

            {/* SUBTRACTボタン */}
            <div className="relative w-1/2">
              <button
                onClick={handleSubtractPoints}
                className={`w-full py-2 rounded text-lg font-bold ${
                  activeButton === "subtract"
                    ? "bg-[#EF6A6A] text-black"
                    : "bg-[#EF6A6A] bg-opacity-50 text-gray-700"
                } `}
              >
                SUBTRACT
              </button>
              {/* 吹き出し（SUBTRACTがアクティブのとき） */}
              {activeButton === "subtract" && (
                <div className="absolute top-full mt-1 left-0 w-full">
                  <div className="bg-white text-black rounded-full shadow flex items-center justify-center">
                    <span className="text-m font-bold mx-1">－</span>
                    <input
                      type="number"
                      min={0}
                      value={changePoints}
                      onChange={(e) => setChangePoints(Number(e.target.value))}
                      className="w-12 text-center text-m font-bold border-b border-gray-300 focus:outline-none"
                    />
                    <span className="ml-1 text-m">ciz</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/**
           * プレビュー＆実行ボタンは
           * activeButton が null ではないときだけ表示
           */}
          {activeButton !== null && (
            <>
              {/* 実行前プレビュー */}
              <div className="text-center mt-6 mb-6">
                <p className="text-xl">
                  {" "}
                  <span className="font-bold text-3xl">
                    {previewPoints().toLocaleString()}{" "}
                    <span className="text-gray-400">ciz</span>
                  </span>
                </p>
              </div>
              {/* 実行ボタン */}
              <form onSubmit={handleSubmit} className="space-y-4 w-full">
                <button
                  type="submit"
                  className="bg-[#8E93DA] text-black font-bold py-2 rounded w-full"
                >
                  EXECUTE
                </button>
              </form>
            </>
          )}
          {/* 更新成功メッセージ */}
          {actionMessage && (
            <p className="text-green-400 my-4">{actionMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminEmployeePage;
