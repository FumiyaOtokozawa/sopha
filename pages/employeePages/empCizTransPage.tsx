import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import Header from '../../components/Header';
import UserSearchList from '../../components/UserSearchList';
import type { User } from '../../types/user';
import CizTransferModal from '../../components/CizTransferModal';

const EmpCizTransPage = () => {
  const router = useRouter();
  const [currentUserEmpNo, setCurrentUserEmpNo] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('USER_INFO')
          .select('emp_no')
          .eq('email', user.email)
          .single();
        
        if (data) {
          setCurrentUserEmpNo(data.emp_no);
        }
      }
    };
    fetchCurrentUser();
  }, []);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
    setError('');
  };

  const handleTransfer = async (points: number) => {
    try {
      // トランザクション開始
      const { error: transactionError } = await supabase.rpc('transfer_points', {
        p_from_emp_no: currentUserEmpNo,
        p_to_emp_no: selectedUser?.emp_no,
        p_points: points
      });
      
      if (transactionError) throw transactionError;

      setIsModalOpen(false);
      setSelectedUser(null);
      router.push('/employeePages/empMainPage'); // 成功したらメイン画面に戻る
    } catch (error) {
      console.error('ポイント譲渡エラー:', error);
      setError(error instanceof Error ? error.message : 'ポイントの譲渡に失敗しました');
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <UserSearchList
        title="ポイント譲渡"
        excludeEmpNo={currentUserEmpNo || undefined}
        onUserSelect={handleUserSelect}
      />
      <CizTransferModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleTransfer}
        selectedUser={selectedUser}
        error={error}
      />
    </div>
  );
};

export default EmpCizTransPage; 