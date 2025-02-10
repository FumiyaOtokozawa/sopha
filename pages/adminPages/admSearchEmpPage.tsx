// pages/adminPages/admSearchEmpPage.tsx

import { useRouter } from "next/router";
import Header from "../../components/Header";
import UserSearchList from "../../components/UserSearchList";

const EmployeeSelect = () => {
  const router = useRouter();
  const handleUserSelect = (user: any) => {
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
