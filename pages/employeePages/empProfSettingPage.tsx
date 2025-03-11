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
  const [errors, setErrors] = useState<{[key: string]: string}>({});
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
    setErrors({});

    try {
      const newErrors: {[key: string]: string} = {};

      // 必須項目のバリデーション
      if (!profile.myoji) newErrors.myoji = "名字を入力してください";
      if (!profile.namae) newErrors.namae = "名前を入力してください";
      if (!profile.last_nm) newErrors.last_nm = "LASTNAMEを入力してください";
      if (!profile.first_nm) newErrors.first_nm = "FIRSTNAMEを入力してください";
      if (!profile.gender) newErrors.gender = "性別を選択してください";

      // 英語名のバリデーション
      if (profile.last_nm && !/^[A-Za-z]+$/.test(profile.last_nm)) {
        newErrors.last_nm = "LASTNAMEは半角英字のみ入力可能です";
      }
      if (profile.first_nm && !/^[A-Za-z]+$/.test(profile.first_nm)) {
        newErrors.first_nm = "FIRSTNAMEは半角英字のみ入力可能です";
      }

      // エラーがある場合は処理を中断
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setIsLoading(false);
        return;
      }

      // プロフィールの更新
      const { error } = await supabase
        .from("USER_INFO")
        .update({
          myoji: profile.myoji,
          namae: profile.namae,
          last_nm: profile.last_nm.toUpperCase(),
          first_nm: profile.first_nm.toUpperCase(),
          gender: profile.gender,
        })
        .eq("emp_no", profile.emp_no);

      if (error) throw error;

      // カスタムイベントを発行してヘッダーに通知
      const userUpdateEvent = new CustomEvent('userProfileUpdate', {
        detail: {
          myoji: profile.myoji,
          namae: profile.namae,
          icon_url: null // アイコンURLがある場合は適切な値を設定
        }
      });
      window.dispatchEvent(userUpdateEvent);

      // 更新成功後、メインページへ遷移
      router.push("/employeePages/empMainPage");

    } catch (error: unknown) {
      console.error("更新エラー:", error);
      if (error instanceof Error && !Object.keys(errors).length) {
        setErrors({ general: "プロフィールの更新に失敗しました" });
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
          <h1 className="text-2xl font-bold mb-2 text-[#FCFCFC]">プロフィール設定</h1>

          <div className="bg-[#2f3033] rounded-lg shadow-md p-6">
            {errors.general && (
              <div className="mb-4 p-3 rounded bg-red-500 bg-opacity-10 border border-red-500 text-red-500">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 漢字名 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#FCFCFC] mb-1">
                    名字
                  </label>
                  <input
                    type="text"
                    value={profile.myoji}
                    onChange={(e) => setProfile({ ...profile, myoji: e.target.value })}
                    className={`${inputClassName} ${errors.myoji ? 'border-red-500 border-2' : ''}`}
                    placeholder="根菜"
                  />
                  {errors.myoji && (
                    <p className="mt-1 text-sm text-red-500">{errors.myoji}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#FCFCFC] mb-1">
                    名前
                  </label>
                  <input
                    type="text"
                    value={profile.namae}
                    onChange={(e) => setProfile({ ...profile, namae: e.target.value })}
                    className={`${inputClassName} ${errors.namae ? 'border-red-500 border-2' : ''}`}
                    placeholder="太郎"
                  />
                  {errors.namae && (
                    <p className="mt-1 text-sm text-red-500">{errors.namae}</p>
                  )}
                </div>
              </div>

              {/* ローマ字名 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#FCFCFC] mb-1">
                    LASTNAME
                  </label>
                  <input
                    type="text"
                    value={profile.last_nm}
                    onChange={(e) => setProfile({ ...profile, last_nm: e.target.value })}
                    className={`${inputClassName} ${errors.last_nm ? 'border-red-500 border-2' : ''}`}
                    placeholder="KONSAI"
                  />
                  {errors.last_nm && (
                    <p className="mt-1 text-sm text-red-500">{errors.last_nm}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#FCFCFC] mb-1">
                    FIRSTNAME
                  </label>
                  <input
                    type="text"
                    value={profile.first_nm}
                    onChange={(e) => setProfile({ ...profile, first_nm: e.target.value })}
                    className={`${inputClassName} ${errors.first_nm ? 'border-red-500 border-2' : ''}`}
                    placeholder="TARO"
                  />
                  {errors.first_nm && (
                    <p className="mt-1 text-sm text-red-500">{errors.first_nm}</p>
                  )}
                </div>
              </div>

              {/* 性別選択欄 */}
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
                      className={`text-[#8E93DA] focus:ring-[#8E93DA] ${errors.gender ? 'border-red-500' : ''}`}
                    />
                    <span className="text-[#FCFCFC]">男性</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value={GENDER.FEMALE}
                      checked={profile.gender === GENDER.FEMALE}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      className={`text-[#8E93DA] focus:ring-[#8E93DA] ${errors.gender ? 'border-red-500' : ''}`}
                    />
                    <span className="text-[#FCFCFC]">女性</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value={GENDER.OTHER}
                      checked={profile.gender === GENDER.OTHER}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      className={`text-[#8E93DA] focus:ring-[#8E93DA] ${errors.gender ? 'border-red-500' : ''}`}
                    />
                    <span className="text-[#FCFCFC]">その他</span>
                  </label>
                </div>
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-500">{errors.gender}</p>
                )}
              </div>

              {/* ボタングループ */}
              <div className="flex justify-end gap-4 pt-4">
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
                  className="px-4 py-2 rounded bg-[#5b63d3] text-white font-bold hover:bg-opacity-80"
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