// pages/adminPages/admSearchEmpPage.tsx

import { useRouter } from "next/router";
import Header from "../../components/Header";
import UserSearchList from "../../components/UserSearchList";
import type { User } from "../../types/user";

const EmployeeSelect = () => {
  const router = useRouter();

  const handleUserSelect = async (user: User) => {
    try {
      await router.push({
        pathname: '/adminPages/admPointEditPage',
        query: { empNo: user.emp_no }
      });
    } catch (error) {
      console.error('遷移エラー:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1b1e]">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <UserSearchList
          title="社員検索"
          onUserSelect={handleUserSelect}
        />
      </main>
    </div>
  );
};

export default EmployeeSelect;
