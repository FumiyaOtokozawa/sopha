// pages/index.tsx

import { useEffect } from "react";
import { useRouter } from "next/router";
import supabase from "../supabaseClient";

const IndexPage = () => {
  const router = useRouter();

  useEffect(() => {
    const checkUserRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // USER_ROLEテーブルからuser_idに基づいてroleを取得
        const { data, error } = await supabase
          .from("USER_ROLE")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error || !data) {
          console.error("Role retrieval error:", error);
          router.push("/loginPage"); // エラー時はログイン画面に戻す
          return;
        }

        // roleに基づくリダイレクト
        if (data.role === 0) {
          router.push("/employeePages/empMainPage"); // employeeのリダイレクト先
        } else if (data.role === 1) {
          router.push("/adminPages/admMainPage"); // adminのリダイレクト先
        }
      } else {
        // ミドグインの場合はログインページへリダイレクト
        router.push("/loginPage");
      }
    };

    checkUserRole();
  }, [router]);

  return null;
};

export default IndexPage;
