import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import Header from '../../components/Header';
import Image from 'next/image';
import { Box } from '@mui/material';
import FooterMenu from '../../components/FooterMenu';

interface UserProfile {
  emp_no: string;
  myoji: string;
  namae: string;
  last_nm: string;
  first_nm: string;
  gender: string;
  email: string;
  profile_url: string | null;
}

const EmpProfilePage = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/');
          return;
        }

        const { data, error } = await supabase
          .from('USER_INFO')
          .select('*')
          .eq('email', user.email)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleEdit = () => {
    router.push('/employeePages/empProfSettingPage');
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="p-4">
          <div>読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <Box sx={{ pb: 7 }}>
      <div className="min-h-screen">
        <Header />
        <div className="p-4">
          <div className="max-w-xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-xl font-bold text-[#FCFCFC]">プロフィール</h1>
              <button
                onClick={handleEdit}
                className="px-4 py-2 rounded bg-[#8E93DA] text-black font-bold hover:bg-opacity-80"
              >
                編集
              </button>
            </div>

            <div className="bg-[#2D2D33] rounded-lg p-6 space-y-4">
              {/* プロフィール画像 */}
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 rounded-full bg-[#1D1D21] overflow-hidden">
                  {profile?.profile_url ? (
                    <Image
                      src={profile.profile_url}
                      alt="プロフィール画像"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#FCFCFC]">
                      No Image
                    </div>
                  )}
                </div>
              </div>

              {/* 基本情報 */}
              <div>
                <h2 className="text-lg font-medium text-[#FCFCFC] mb-4">基本情報</h2>
                <div className="space-y-3">
                  <div className="flex">
                    <div className="w-32 text-sm text-[#FCFCFC]">社員番号</div>
                    <div className="flex-1 text-[#FCFCFC]">{profile?.emp_no}</div>
                  </div>
                  <div className="flex">
                    <div className="w-32 text-sm text-[#FCFCFC]">氏名</div>
                    <div className="flex-1 text-[#FCFCFC]">
                      {profile?.myoji} {profile?.namae}
                    </div>
                  </div>
                  <div className="flex">
                    <div className="w-32 text-sm text-[#FCFCFC]">英語名</div>
                    <div className="flex-1 text-[#FCFCFC]">
                      {profile?.last_nm} {profile?.first_nm}
                    </div>
                  </div>
                  <div className="flex">
                    <div className="w-32 text-sm text-[#FCFCFC]">性別</div>
                    <div className="flex-1 text-[#FCFCFC]">
                      {profile?.gender === '1' ? '男性' : '女性'}
                    </div>
                  </div>
                  <div className="flex">
                    <div className="w-32 text-sm text-[#FCFCFC]">メールアドレス</div>
                    <div className="flex-1 text-[#FCFCFC]">{profile?.email}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <FooterMenu />
    </Box>
  );
};

export default EmpProfilePage; 