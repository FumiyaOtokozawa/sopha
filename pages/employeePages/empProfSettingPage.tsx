import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../utils/supabaseClient";
import Header from "../../components/Header";

type UserProfile = {
  emp_no: number;
  myoji: string;
  namae: string;
  last_nm: string;
  first_nm: string;
};

// 共通の入力欄スタイル
const inputClassName = `
    w-full p-2 rounded-md
    bg-[#CFD8DC80] text-[#37373F] placeholder-[#37373F]
    focus:outline-none focus:ring-2 focus:ring-blue-500
    focus:bg-[#FCFCFC] focus:placeholder-[#808080]
    [&:not(:placeholder-shown)]:bg-[#FCFCFC]
`;

const EmpProfSettingPage = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({
    emp_no: 0,
    myoji: "",
    namae: "",
    last_nm: "",
    first_nm: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 初期データの取得
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/loginPage");
        return;
      }

      const { data, error } = await supabase
        .from("USER_INFO")
        .select("emp_no, myoji, namae, last_nm, first_nm")
        .eq("email", user.email)
        .single();

      if (error) {
        console.error("プロフィール取得エラー:", error);
        return;
      }

      setProfile(data);
    };

    fetchProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // 入力値の検証
      if (!profile.myoji || !profile.namae || !profile.last_nm || !profile.first_nm) {
        throw new Error("すべての項目を入力してください");
      }

      // プロフィールの更新
      const { error } = await supabase
        .from("USER_INFO")
        .update({
          myoji: profile.myoji,
          namae: profile.namae,
          last_nm: profile.last_nm,
          first_nm: profile.first_nm,
        })
        .eq("emp_no", profile.emp_no);

      if (error) throw error;

      // 更新成功後、メインページへ遷移
      router.push("/employeePages/empMainPage");

    } catch (error: unknown) {
      console.error("更新エラー:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("プロフィールの更新に失敗しました");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Header isAdmin={false} />

      <div className="p-4">
        <div className="w-full max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-[#FCFCFC]">プロフィール設定</h1>

          <div className="bg-[#2f3033] rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 漢字名 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#FCFCFC] mb-1">
                    姓（漢字）
                  </label>
                  <input
                    type="text"
                    value={profile.myoji}
                    onChange={(e) => setProfile({ ...profile, myoji: e.target.value })}
                    className={inputClassName}
                    placeholder="根菜"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#FCFCFC] mb-1">
                    名（漢字）
                  </label>
                  <input
                    type="text"
                    value={profile.namae}
                    onChange={(e) => setProfile({ ...profile, namae: e.target.value })}
                    className={inputClassName}
                    placeholder="太郎"
                  />
                </div>
              </div>

              {/* ローマ字名 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#FCFCFC] mb-1">
                    姓（ローマ字）
                  </label>
                  <input
                    type="text"
                    value={profile.last_nm}
                    onChange={(e) => setProfile({ ...profile, last_nm: e.target.value })}
                    className={inputClassName}
                    placeholder="Konsai"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#FCFCFC] mb-1">
                    名（ローマ字）
                  </label>
                  <input
                    type="text"
                    value={profile.first_nm}
                    onChange={(e) => setProfile({ ...profile, first_nm: e.target.value })}
                    className={inputClassName}
                    placeholder="Taro"
                  />
                </div>
              </div>

              {/* エラーメッセージ */}
              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              {/* 送信ボタン */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-[#8E93DA] text-black font-bold rounded-md hover:bg-opacity-90 disabled:opacity-50"
              >
                {isLoading ? "更新中..." : "更新する"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmpProfSettingPage; 