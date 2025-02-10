// pages/adminPages/admSearchEmpPage.tsx

import { useRouter } from "next/router";
import Header from "../../components/Header";
import UserSearchList from "../../components/UserSearchList";
import type { User } from "../../types/user";

const EmployeeSelect = () => {
  const router = useRouter();
  const handleUserSelect = (user: User) => {
    router.push(`/adminPages/admPointEditPage?empNo=${user.emp_no}`);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <UserSearchList
        title="社員検索"
        onUserSelect={handleUserSelect}
      />
    </div>
  );
};

export default EmployeeSelect;
