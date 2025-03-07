import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import Image from 'next/image';
import { Box, CircularProgress, TextField, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel } from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import EditIcon from '@mui/icons-material/Edit';
import WcIcon from '@mui/icons-material/Wc';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';

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
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
        setEditedProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleEdit = () => {
    if (isEditing) {
      // 編集モードを終了
      setIsEditing(false);
      setEditedProfile(profile);
    } else {
      // 編集モードを開始
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!editedProfile) return;
    
    setIsSaving(true);
    setError("");
    
    try {
      // 入力値の検証
      if (!editedProfile.myoji || !editedProfile.namae || !editedProfile.last_nm || !editedProfile.first_nm) {
        throw new Error("すべての項目を入力してください");
      }

      // プロフィールの更新
      const { error } = await supabase
        .from("USER_INFO")
        .update({
          myoji: editedProfile.myoji,
          namae: editedProfile.namae,
          last_nm: editedProfile.last_nm,
          first_nm: editedProfile.first_nm,
          gender: editedProfile.gender,
        })
        .eq("emp_no", editedProfile.emp_no);

      if (error) throw error;

      // 更新成功後、表示を更新
      setProfile(editedProfile);
      setIsEditing(false);
    } catch (error: Error | unknown) {
      console.error("更新エラー:", error);
      setError(error instanceof Error ? error.message : "プロフィールの更新に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile(profile);
    setError("");
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-b from-[#1D1D21] to-[#2D2D33]">
        <div className="flex justify-center items-center h-[80vh]">
          <CircularProgress sx={{ color: '#8E93DA' }} />
          <span className="ml-3 text-[#FCFCFC] font-medium">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <Box>
      <div className="bg-gradient-to-b from-[#1D1D21] to-[#2D2D33]">
        <div className="p-4">
          <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-bold text-[#FCFCFC] tracking-wide">
                {isEditing ? 'プロフィール編集' : 'プロフィール'}
              </h1>
              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[#4A4B50] text-white hover:bg-[#3A3B40] transition-all duration-200 shadow-md"
                    aria-label="キャンセル"
                  >
                    <CloseIcon fontSize="small" />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[#8E93DA] text-white hover:bg-[#7A7FD0] transition-all duration-200 shadow-md"
                    aria-label="保存"
                  >
                    <SaveIcon fontSize="small" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleEdit}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[#5b63d3] text-white hover:bg-[#7A7FD0] transition-all duration-200 shadow-md"
                  aria-label="編集"
                >
                  <EditIcon fontSize="small" />
                </button>
              )}
            </div>

            {error && (
              <div className="bg-red-500 bg-opacity-20 text-red-100 text-sm p-2 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="bg-[#2D2D33] rounded-xl overflow-hidden shadow-lg border border-[#3D3D43]">
              {/* プロフィールヘッダー */}
              <div className="p-4 flex items-center gap-3 border-b border-[#3D3D43]">
                {/* プロフィール画像 */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1D1D21] to-[#2D2D33] overflow-hidden border-2 border-[#8E93DA] flex-shrink-0">
                  {profile?.profile_url ? (
                    <Image
                      src={profile.profile_url}
                      alt="プロフィール画像"
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#FCFCFC] bg-gradient-to-br from-[#2D2D33] to-[#1D1D21]">
                      <span className="text-base font-medium">
                        {profile?.myoji?.charAt(0)}{profile?.namae?.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* 名前と性別 */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <TextField
                          label="姓（漢字）"
                          value={editedProfile?.myoji || ''}
                          onChange={(e) => setEditedProfile(prev => prev ? {...prev, myoji: e.target.value} : null)}
                          variant="outlined"
                          size="small"
                          InputProps={{
                            style: { color: '#FCFCFC', fontSize: '0.875rem' }
                          }}
                          InputLabelProps={{
                            style: { color: '#AEAEB2', fontSize: '0.75rem' }
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#3D3D43',
                              },
                              '&:hover fieldset': {
                                borderColor: '#8E93DA',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#8E93DA',
                              },
                              backgroundColor: '#23232A',
                            },
                          }}
                        />
                        <TextField
                          label="名（漢字）"
                          value={editedProfile?.namae || ''}
                          onChange={(e) => setEditedProfile(prev => prev ? {...prev, namae: e.target.value} : null)}
                          variant="outlined"
                          size="small"
                          InputProps={{
                            style: { color: '#FCFCFC', fontSize: '0.875rem' }
                          }}
                          InputLabelProps={{
                            style: { color: '#AEAEB2', fontSize: '0.75rem' }
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#3D3D43',
                              },
                              '&:hover fieldset': {
                                borderColor: '#8E93DA',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#8E93DA',
                              },
                              backgroundColor: '#23232A',
                            },
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <TextField
                          label="姓（ローマ字）"
                          value={editedProfile?.last_nm || ''}
                          onChange={(e) => setEditedProfile(prev => prev ? {...prev, last_nm: e.target.value} : null)}
                          variant="outlined"
                          size="small"
                          InputProps={{
                            style: { color: '#FCFCFC', fontSize: '0.875rem' }
                          }}
                          InputLabelProps={{
                            style: { color: '#AEAEB2', fontSize: '0.75rem' }
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#3D3D43',
                              },
                              '&:hover fieldset': {
                                borderColor: '#8E93DA',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#8E93DA',
                              },
                              backgroundColor: '#23232A',
                            },
                          }}
                        />
                        <TextField
                          label="名（ローマ字）"
                          value={editedProfile?.first_nm || ''}
                          onChange={(e) => setEditedProfile(prev => prev ? {...prev, first_nm: e.target.value} : null)}
                          variant="outlined"
                          size="small"
                          InputProps={{
                            style: { color: '#FCFCFC', fontSize: '0.875rem' }
                          }}
                          InputLabelProps={{
                            style: { color: '#AEAEB2', fontSize: '0.75rem' }
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#3D3D43',
                              },
                              '&:hover fieldset': {
                                borderColor: '#8E93DA',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#8E93DA',
                              },
                              backgroundColor: '#23232A',
                            },
                          }}
                        />
                      </div>
                      <FormControl component="fieldset">
                        <FormLabel component="legend" sx={{ color: '#AEAEB2', fontSize: '0.75rem' }}>性別</FormLabel>
                        <RadioGroup
                          row
                          value={editedProfile?.gender || ''}
                          onChange={(e) => setEditedProfile(prev => prev ? {...prev, gender: e.target.value} : null)}
                        >
                          <FormControlLabel 
                            value="1" 
                            control={<Radio size="small" sx={{ color: '#AEAEB2', '&.Mui-checked': { color: '#8E93DA' } }} />} 
                            label={<span style={{ color: '#FCFCFC', fontSize: '0.75rem' }}>男性</span>} 
                          />
                          <FormControlLabel 
                            value="0" 
                            control={<Radio size="small" sx={{ color: '#AEAEB2', '&.Mui-checked': { color: '#8E93DA' } }} />} 
                            label={<span style={{ color: '#FCFCFC', fontSize: '0.75rem' }}>女性</span>} 
                          />
                          <FormControlLabel 
                            value="2" 
                            control={<Radio size="small" sx={{ color: '#AEAEB2', '&.Mui-checked': { color: '#8E93DA' } }} />} 
                            label={<span style={{ color: '#FCFCFC', fontSize: '0.75rem' }}>その他</span>} 
                          />
                        </RadioGroup>
                      </FormControl>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-bold text-[#FCFCFC] truncate">
                        {profile?.myoji} {profile?.namae}
                      </h2>
                      <p className="text-[#AEAEB2] text-xs">
                        {profile?.last_nm} {profile?.first_nm}
                      </p>
                      <div className="mt-1 flex items-center">
                        <WcIcon sx={{ color: '#8E93DA', fontSize: 16 }} />
                        <span className="ml-1 text-xs text-[#FCFCFC]">
                          {profile?.gender === '1' ? '男性' : profile?.gender === '0' ? '女性' : 'その他'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 基本情報 */}
              <div className="p-4">
                <h3 className="text-xs font-medium text-[#AEAEB2] mb-2 uppercase tracking-wider opacity-80">基本情報</h3>
                
                <div className="space-y-3">
                  {/* 社員番号 */}
                  <div className="flex items-center p-2 bg-[#23232A] rounded-lg">
                    <BadgeIcon sx={{ color: '#8E93DA', fontSize: 20 }} />
                    <div className="ml-3 flex-1">
                      <div className="text-[10px] text-[#AEAEB2] opacity-75">社員番号</div>
                      <div className="text-[#FCFCFC] font-medium">{profile?.emp_no}</div>
                    </div>
                  </div>
                  
                  {/* メールアドレス */}
                  <div className="flex items-center p-2 bg-[#23232A] rounded-lg">
                    <EmailIcon sx={{ color: '#8E93DA', fontSize: 20 }} />
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="text-[10px] text-[#AEAEB2] opacity-75">メールアドレス</div>
                      <div className="text-[#FCFCFC] truncate">{profile?.email}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Box>
  );
};

export default EmpProfilePage; 