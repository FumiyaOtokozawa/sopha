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

      if (user?.email) {
        // まずUSER_INFOテーブルからemailに基づいてemp_noを取得
        const { data: userData, error: userError } = await supabase
          .from("USER_INFO")
          .select("emp_no")
          .eq("email", user.email)
          .single();

        if (userError || !userData) {
          console.error("User info retrieval error:", userError);
          router.push("/loginPage");
          return;
        }

        // 次にUSER_ROLEテーブルからemp_noに基づいてroleを取得
        const { data: roleData, error: roleError } = await supabase
          .from("USER_ROLE")
          .select("role")
          .eq("emp_no", userData.emp_no)
          .single();

        if (roleError || !roleData) {
          console.error("Role retrieval error:", roleError);
          router.push("/loginPage");
          return;
        }

        // roleに基づくリダイレクト
        if (roleData.role === "0") {
          router.push("/employeePages/empMainPage"); // employeeのリダイレクト先
        } else if (roleData.role === "1") {
          router.push("/adminPages/admMainPage"); // adminのリダイレクト先
        }
      } else {
        // 未ログインの場合はログインページへリダイレクト
        router.push("/loginPage");
      }
    };

    checkUserRole();
  }, [router]);

  return null;
};

export default IndexPage;
