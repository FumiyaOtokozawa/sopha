import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../utils/supabaseClient";

const RegistConfirmedPage = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { employeeId } = router.query; // URLパラメータから社員番号を取得

  useEffect(() => {
    const checkSessionAndAddRole = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        setError("セッションの確認中にエラーが発生しました");
        return;
      }

      if (!session) {
        setError("無効なセッションです");
        return;
      }

      // メールアドレス確認済みかチェック
      if (!session.user.email_confirmed_at) {
        setError("メールアドレスが確認できていません");
        return;
      }

      try {
        // ALL_USER_Mテーブルからユーザー情報を取得
        const { data: userData, error: userDataError } = await supabase
          .from("ALL_USER_M")
          .select("myoji, namae, joinDate")
          .eq("emp_no", Number(employeeId))
          .single();

        if (userDataError) {
          console.error("ユーザーマスタ取得エラー:", userDataError);
          setError("ユーザー情報の取得中にエラーが発生しました");
          return;
        }

        // メールアドレスから姓名を抽出
        const emailParts = session.user.email?.split("@")[0].split(".") || [];
        const first_nm = emailParts[0]?.toUpperCase() || "";
        const last_nm = emailParts[1]?.toUpperCase() || "";

        // 先にUSER_INFOテーブルに基本情報を登録
        const { error: userInfoError } = await supabase
          .from("USER_INFO")
          .insert([
            {
              emp_no: Number(employeeId),
              email: session.user.email,
              act_kbn: true,
              myoji: userData?.myoji,
              namae: userData?.namae,
              last_nm: last_nm,
              first_nm: first_nm,
              joinDate: userData?.joinDate,
            },
          ]);

        if (userInfoError) {
          console.error("ユーザー情報登録エラー:", userInfoError);
          setError("ユーザー情報の登録中にエラーが発生しました");
          return;
        }

        // USER_ROLEテーブルにユーザー情報を追加
        const { error: insertError } = await supabase.from("USER_ROLE").insert([
          {
            emp_no: Number(employeeId),
            role: "0",
            act_kbn: true,
            updated_at: new Date().toISOString(),
            updated_by: Number(employeeId),
          },
        ]);

        if (insertError) {
          console.error("ロール登録エラー:", insertError);
          setError("ユーザー情報の登録中にエラーが発生しました");
          return;
        }

        // EMP_CIZテーブルに初期ポイント情報を追加
        // まず最大のciz_idを取得
        const { data: maxCizData, error: maxCizError } = await supabase
          .from("EMP_CIZ")
          .select("ciz_id")
          .order("ciz_id", { ascending: false })
          .limit(1)
          .single();

        if (maxCizError && !maxCizError.message.includes("No rows found")) {
          console.error("CIZ ID取得エラー:", maxCizError);
          setError("ユーザー情報の登録中にエラーが発生しました");
          return;
        }

        // 新しいciz_idを設定（既存データがない場合は1から開始）
        const nextCizId = maxCizData ? maxCizData.ciz_id + 1 : 1;

        // EMP_CIZテーブルに登録
        const { error: cizError } = await supabase.from("EMP_CIZ").insert([
          {
            ciz_id: nextCizId,
            emp_no: Number(employeeId),
            total_ciz: 0,
            act_kbn: true,
            updated_at: new Date().toISOString(),
            updated_by: 0, // 0 = admin
          },
        ]);

        if (cizError) {
          console.error("ポイント情報登録エラー:", cizError);
          setError("ユーザー情報の登録中にエラーが発生しました");
          return;
        }

        // EVENT_PARTICIPATIONテーブルに初期データを登録
        const { error: participationError } = await supabase
          .from("EVENT_PARTICIPATION")
          .insert([
            {
              emp_no: Number(employeeId),
              official_count: 0,
              unofficial_count: 0,
              updated_at: new Date().toISOString(),
            },
          ]);

        if (participationError) {
          console.error("イベント参加情報登録エラー:", participationError);
          setError("ユーザー情報の登録中にエラーが発生しました");
          return;
        }
      } catch (error) {
        console.error("登録エラー:", error);
        setError("ユーザー情報の登録中にエラーが発生しました");
      }
    };

    if (employeeId) {
      // 社員番号が存在する場合のみ処理を実行
      checkSessionAndAddRole();
    }
  }, [employeeId]); // employeeIdを依存配列に追加

  const handleLoginClick = () => {
    router.push("/loginPage");
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden touch-none">
      <div className="bg-[#FCFCFC19] rounded-lg shadow-md p-8 w-[400px] mx-8 sm:mx-auto">
        {error ? (
          <>
            <h1 className="text-2xl font-bold mb-6 text-center text-[#FCFCFC]">
              エラー
            </h1>
            <div className="bg-red-500 text-white p-3 rounded mb-4">
              {error}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-6 text-center text-[#FCFCFC]">
              メール確認完了
            </h1>
            <p className="text-[#FCFCFC] text-center mb-6">
              メールアドレスの確認が完了しました。
              <br />
              ログインページからログインしてください。
            </p>
          </>
        )}

        <button
          onClick={handleLoginClick}
          className="
            w-full py-2 rounded-md
            bg-[#5b63d3] text-white font-semibold
            hover:bg-opacity-90 transition-colors
          "
        >
          ログインページへ
        </button>
      </div>
    </div>
  );
};

export default RegistConfirmedPage;
