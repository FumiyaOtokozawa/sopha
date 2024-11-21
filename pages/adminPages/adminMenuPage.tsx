// pages/adminPages/adminMenuPage.tsx

import { useRouter } from "next/router";
import LogoutButton from "../../components/LogoutButton";

const AdminMenu = () => {
  const router = useRouter();

  const navigateToEmployeeSelectPage = () => {
    router.push("/adminPages/employeeSelectPage");
  };

  const navigateToEmployeeAddPage = () => {
    router.push("/adminPages/employeeAddPage");
  };

  return (
    <div>
      <h1>Admin menu page</h1>
      <button onClick={navigateToEmployeeSelectPage}>社員一覧</button>
      <button onClick={navigateToEmployeeAddPage}>社員追加</button>
      <LogoutButton />
    </div>
  );
};

export default AdminMenu;
