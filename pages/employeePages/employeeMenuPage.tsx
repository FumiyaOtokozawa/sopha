// pages/employeePages/employeeMenuPage.tsx

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import LogoutButton from "../../components/LogoutButton";
import supabase from "../../supabaseClient";

const EmployeeMenuPage = () => {
  const router = useRouter();
  const [employeeNumber, setEmployeeNumber] = useState<string | null>(null);

  useEffect(() => {
    // ログインしているユーザーのIDを取得
    const fetchUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // USER_ROLEからemployee_numberを取得
        const { data, error } = await supabase
          .from("USER_LINK_EMPLOYEE")
          .select("employee_number")
          .eq("uid", user.id)
          .single();

        if (error) {
          console.error("社員番号の取得エラー：", error.message);
        } else {
          setEmployeeNumber(data?.employee_number ?? null);
        }
      }
    };

    fetchUserId();
  }, []);

  // [保有ciz確認ボタン]のクリック時の処理
  const handleCheckPoints = () => {
    if (employeeNumber) {
      router.push(
        `/employeePages/employee[employeeNumber]Page?employeeNumber=${employeeNumber}`
      );
    }
  };

  return (
    <div>
      <h1>Employee menu page</h1>
      <button onClick={handleCheckPoints}>保有cizを確認する</button>
      <LogoutButton />
    </div>
  );
};

export default EmployeeMenuPage;
