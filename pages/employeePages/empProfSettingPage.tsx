import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../utils/supabaseClient";

type UserProfile = {
  emp_no: number;
  myoji: string;
  namae: string;
  last_nm: string;
  first_nm: string;
  gender: string;
};

// 性別の定数を定義
const GENDER = {
  FEMALE: "0",
  MALE: "1",
  OTHER: "2"
} as const;

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
    gender: "",
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
        .select("emp_no, myoji, namae, last_nm, first_nm, gender")
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
      if (!profile.myoji || !profile.namae || !profile.last_nm || !profile.first_nm || !profile.gender) {
        throw new Error("氏名の項目を入力してください");
      }

      // プロフィールの更新
      const { error } = await supabase
        .from("USER_INFO")
        .update({
          myoji: profile.myoji,
          namae: profile.namae,
          last_nm: profile.last_nm,
          first_nm: profile.first_nm,
          gender: profile.gender,
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

  const handleCancel = () => {
    router.push('/employeePages/empProfilePage');
  };

  return (
    <div>
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

              {/* 性別選択欄を修正 */}
              <div>
                <label className="block text-sm font-medium text-[#FCFCFC] mb-1">
                  性別
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value={GENDER.MALE}
                      checked={profile.gender === GENDER.MALE}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      className="text-[#8E93DA] focus:ring-[#8E93DA]"
                    />
                    <span className="text-[#FCFCFC]">男性</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value={GENDER.FEMALE}
                      checked={profile.gender === GENDER.FEMALE}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      className="text-[#8E93DA] focus:ring-[#8E93DA]"
                    />
                    <span className="text-[#FCFCFC]">女性</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value={GENDER.OTHER}
                      checked={profile.gender === GENDER.OTHER}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      className="text-[#8E93DA] focus:ring-[#8E93DA]"
                    />
                    <span className="text-[#FCFCFC]">その他</span>
                  </label>
                </div>
              </div>

              {/* エラーメッセージ */}
              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}

              {/* ボタングループ */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded bg-[#4A4B50] text-[#FCFCFC] hover:bg-opacity-80"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded bg-[#8E93DA] text-black font-bold hover:bg-opacity-80"
                >
                  {isLoading ? "更新中..." : "更新"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmpProfSettingPage; 