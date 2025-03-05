// pages/adminPages/admPointEditPage.tsx

import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import Header from "../../components/Header";

type Employee = {
  last_nm: string;
  first_nm: string;
  email?: string;
};

// 履歴テーブルの型
type HistoryItem = {
  history_id: number;
  emp_no: number;
  change_type: "add" | "subtract";
  ciz: number;
  reason: string;
  created_at: string;
};

const AdminEmployeePage = () => {
  const router = useRouter();
  const { empNo } = router.query;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ページネーション用のState
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const ITEMS_PER_PAGE = 15;

  // 各種UI・状態管理用
  const [changePoints, setChangePoints] = useState<number>(0);
  const [changeType, setChangeType] = useState<"add" | "subtract">("add");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeButton, setActiveButton] = useState<"add" | "subtract" | null>(
    null
  );

  // ポイント履歴を保存する配列
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);

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

  // ポイント履歴を取得
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        if (!empNo) return;

        // 総件数を取得
        const { count: totalRecords } = await supabase
          .from("EMP_CIZ_HISTORY")
          .select("*", { count: "exact" })
          .eq("emp_no", empNo);
        
        setTotalCount(totalRecords || 0);

        // ページに応じたデータを取得
        const { data, error } = await supabase
          .from("EMP_CIZ_HISTORY")
          .select("*")
          .eq("emp_no", empNo)
          .order("created_at", { ascending: false })
          .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);
          
        if (error) {
          throw new Error(`履歴データの取得エラー: ${error.message}`);
        }

        // 取得した履歴をstateに格納
        setHistoryList((data as HistoryItem[]) ?? []);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("履歴取得エラー:", error.message);
          setErrorMessage(error.message);
        } else {
          console.error("予期しないエラーが発生しました:", error);
        }
      }
    };

    fetchHistory();
  }, [empNo, currentPage]);

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

    // add/subtractを判断して +/- を決定
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

      const { data: insertData, error: historyError } = await supabase
        .from("EMP_CIZ_HISTORY")
        .insert([history])
        .select();

      if (historyError) {
        throw new Error(`ポイント履歴追加エラー: ${historyError.message}`);
      }

      // 状態を更新
      setPoints((prev) => (prev !== null ? prev + adjustedPoints : null));
      setActionMessage("ポイントを正常に更新しました。");

      // 実行後は吹き出しとプレビューとボタンを閉じる
      setActiveButton(null);
      setChangePoints(0);

      // 新しく追加した履歴を戦闘に反映
      if (insertData && insertData.length > 0) {
        setHistoryList((prev) => [insertData[0] as HistoryItem, ...prev]);
      }
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

  // 日付表示用フォーマット
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const HH = String(d.getHours()).padStart(2, "0");
    const MM = String(d.getMinutes()).padStart(2, "0");
    const SS = String(d.getSeconds()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd} ${HH}:${MM}:${SS}`;
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
      <Header />

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
                  <div className="bg-white text-black rounded-full shadow flex items-center justify-between px-2 py-0.5">
                    <button
                      onClick={() => setChangePoints(prev => Math.max(0, prev - 1))}
                      className="text-gray-600 hover:text-black w-6 h-6 flex items-center justify-center text-sm"
                    >
                      &#9660;
                    </button>
                    <div className="flex items-center justify-center flex-1 min-w-0">
                      <input
                        type="number"
                        min={0}
                        value={changePoints}
                        onChange={(e) => setChangePoints(Number(e.target.value))}
                        className="w-full max-w-[60px] text-center text-sm font-bold border-b border-gray-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none py-0.5"
                        placeholder="0"
                      />
                      <span className="text-sm ml-1">ciz</span>
                    </div>
                    <button
                      onClick={() => setChangePoints(prev => prev + 1)}
                      className="text-gray-600 hover:text-black w-6 h-6 flex items-center justify-center text-sm"
                    >
                      &#9650;
                    </button>
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
                  <div className="bg-white text-black rounded-full shadow flex items-center justify-between px-2 py-0.5">
                    <button
                      onClick={() => setChangePoints(prev => Math.max(0, prev - 1))}
                      className="text-gray-600 hover:text-black w-6 h-6 flex items-center justify-center text-sm"
                    >
                      &#9660;
                    </button>
                    <div className="flex items-center justify-center flex-1 min-w-0">
                      <input
                        type="number"
                        min={0}
                        value={changePoints}
                        onChange={(e) => setChangePoints(Number(e.target.value))}
                        className="w-full max-w-[60px] text-center text-sm font-bold border-b border-gray-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none py-0.5"
                        placeholder="0"
                      />
                      <span className="text-sm ml-1">ciz</span>
                    </div>
                    <button
                      onClick={() => setChangePoints(prev => prev + 1)}
                      className="text-gray-600 hover:text-black w-6 h-6 flex items-center justify-center text-sm"
                    >
                      &#9650;
                    </button>
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

        {/* ポイント履歴一覧 */}
        <div className="bg-[#2f3033] rounded-lg shadow-md mt-8 w-full max-w-xl mx-auto p-4">
          <h3 className="text-xl font-bold mb-4">Points History</h3>

          {historyList.length === 0 ? (
            <p className="text-gray-400">履歴はありません</p>
          ) : (
            <>
              {/* ページネーションコントロールを上部に移動 */}
              <div className="flex justify-center mb-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev -1, 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded ${
                    currentPage === 1
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-[#8E93DA] text-black font-bold hover:bg-opacity-90'
                  }`}
                >
                  Prev
                </button>
                <span className="flex items-center mx-4">
                  {currentPage} / {Math.ceil(totalCount / ITEMS_PER_PAGE)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)}
                  className={`px-4 py-2 rounded ${
                    currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-[#8E93DA] text-black font-bold hover:bg-opacity-90'
                  }`}
                >
                  Next
                </button>
              </div>

              <div className="space-y-3">
                {historyList.map((item) => {
                  const isAdd = item.change_type === "add";
                  const sign = isAdd ? "+ " : "- ";
                  const colorClass = isAdd ? "text-green-400" : "text-red-400";

                  return (
                    <div
                      key={item.history_id}
                      className="bg-[#404040] px-4 py-3 rounded-md"
                    >
                      {/* 左側: reasonと日付 */}
                      <div className="flex justify-between items-center">
                        <div className="flex-1 mr-4">
                          <p className="font-medium break-all">{item.reason}</p>
                          <p className="text-sm text-gray-400 mt-1">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                        {/* 右側: 変動ポイント */}
                        <div className={`${colorClass} text-lg font-medium flex-shrink-0`}>
                          {sign}
                          {item.ciz.toLocaleString()} ciz
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>
      </div>

    </div>
  );
};

export default AdminEmployeePage;
