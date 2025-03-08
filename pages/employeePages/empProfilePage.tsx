import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import Image from 'next/image';
import { Box, CircularProgress, TextField, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, Dialog, DialogContent, DialogActions, Button } from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import EditIcon from '@mui/icons-material/Edit';
import WcIcon from '@mui/icons-material/Wc';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import CakeIcon from '@mui/icons-material/Cake';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import DeleteIcon from '@mui/icons-material/Delete';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import imageCompression from 'browser-image-compression';

interface UserProfile {
  emp_no: string;
  myoji: string;
  namae: string;
  last_nm: string;
  first_nm: string;
  gender: string;
  email: string;
  icon_url: string | null;
  birthday: string | null;
}

// クリーンアップ関数を追加
const cleanupUnusedImages = async () => {
  try {
    // バケット内の全画像を取得
    const { data: storageFiles, error: storageError } = await supabase
      .storage
      .from('profile-images')
      .list();

    if (storageError) throw storageError;

    // 全ユーザーのicon_urlを取得
    const { data: userProfiles, error: userError } = await supabase
      .from('USER_INFO')
      .select('icon_url')
      .not('icon_url', 'is', null);

    if (userError) throw userError;

    // 使用中のファイル名のセットを作成
    const usedFileNames = new Set(
      userProfiles
        .map(profile => profile.icon_url?.split('/').pop())
        .filter(Boolean)
    );

    // 未使用のファイルを特定
    const unusedFiles = storageFiles
      .filter(file => !usedFileNames.has(file.name))
      .map(file => file.name);

    // 未使用ファイルを削除
    if (unusedFiles.length > 0) {
      const { error: deleteError } = await supabase
        .storage
        .from('profile-images')
        .remove(unusedFiles);

      if (deleteError) throw deleteError;
      console.log(`${unusedFiles.length}件の未使用画像を削除しました`);
    }
  } catch (error) {
    console.error('クリーンアップエラー:', error);
  }
};

const EmpProfilePage = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5,
  });
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const [isCropping, setIsCropping] = useState(false);

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

      // 新しい画像がアップロードされている場合の処理
      let iconUrl = editedProfile.icon_url;
      if (editedProfile.icon_url && editedProfile.icon_url.startsWith('blob:')) {
        // Blob URLからFileオブジェクトを取得
        const response = await fetch(editedProfile.icon_url);
        const blob = await response.blob();
        const file = new File([blob], 'profile-image.jpg', { type: 'image/jpeg' });

        // 既存の画像を削除
        if (profile?.icon_url) {
          try {
            const oldPath = profile.icon_url.split('/').pop();
            if (oldPath) {
              const { error: deleteError } = await supabase.storage
                .from('profile-images')
                .remove([oldPath]);
              
              if (deleteError) {
                console.error('古い画像の削除に失敗しました:', deleteError);
              }
            }
          } catch (deleteError) {
            console.error('画像削除中にエラーが発生しました:', deleteError);
          }
        }

        // 新しい画像をアップロード
        const fileExt = 'jpg';
        const fileName = `${editedProfile.emp_no}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // アップロードした画像のURLを取得
        const { data: { publicUrl } } = supabase.storage
          .from('profile-images')
          .getPublicUrl(filePath);

        iconUrl = publicUrl;
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
          birthday: editedProfile.birthday,
          icon_url: iconUrl,
        })
        .eq("emp_no", editedProfile.emp_no);

      if (error) throw error;

      // 更新成功後、表示を更新
      setProfile({
        ...editedProfile,
        icon_url: iconUrl
      });
      setIsEditing(false);

      // カスタムイベントを発行してヘッダーに通知
      const userUpdateEvent = new CustomEvent('userProfileUpdate', {
        detail: {
          myoji: editedProfile.myoji,
          namae: editedProfile.namae,
          icon_url: iconUrl
        }
      });
      window.dispatchEvent(userUpdateEvent);

      // 未使用画像のクリーンアップを実行
      await cleanupUnusedImages();

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editedProfile) return;

    try {
      setIsUploading(true);
      setError("");

      // ファイルタイプのチェック
      if (!file.type.startsWith('image/')) {
        throw new Error("画像ファイルのみアップロード可能です");
      }

      // 画像をURLに変換
      const imageUrl = URL.createObjectURL(file);
      setCropImage(imageUrl);
      setShowCropDialog(true);

    } catch (error) {
      console.error("画像アップロードエラー:", error);
      setError(error instanceof Error ? error.message : "画像のアップロードに失敗しました");
      setIsUploading(false);
    }
  };

  const handleCropComplete = async () => {
    if (!imageRef || !cropImage || !editedProfile) return;

    try {
      setIsCropping(true);
      const canvas = document.createElement('canvas');
      const scaleX = imageRef.naturalWidth / imageRef.width;
      const scaleY = imageRef.naturalHeight / imageRef.height;
      canvas.width = crop.width * scaleX;
      canvas.height = crop.height * scaleY;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      ctx.drawImage(
        imageRef,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width * scaleX,
        crop.height * scaleY
      );

      // トリミングした画像をBlobに変換
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.8);
      });

      // BlobをFileオブジェクトに変換
      const file = new File([blob], 'profile-image.jpg', { type: 'image/jpeg' });

      // 画像を圧縮
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 400,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);

      // プレビュー用のURLを生成
      const previewUrl = URL.createObjectURL(compressedFile);

      // プロフィールを更新（プレビュー表示のみ）
      setEditedProfile({
        ...editedProfile,
        icon_url: previewUrl
      });

      // クリーンアップ
      setShowCropDialog(false);
      setCropImage(null);
      URL.revokeObjectURL(cropImage);
      setCrop({
        unit: '%',
        width: 90,
        height: 90,
        x: 5,
        y: 5,
      });

    } catch (error) {
      console.error("画像処理エラー:", error);
      setError(error instanceof Error ? error.message : "画像の処理に失敗しました");
    } finally {
      setIsCropping(false);
      setIsUploading(false);
    }
  };

  const handleImageDelete = async () => {
    if (!editedProfile?.icon_url) return;

    try {
      setIsUploading(true);
      setError("");

      // 編集中のプロフィールのアイコンURLのみを更新
      setEditedProfile({
        ...editedProfile,
        icon_url: null
      });

    } catch (error) {
      console.error("画像削除エラー:", error);
      setError("画像の削除に失敗しました");
    } finally {
      setIsUploading(false);
    }
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
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[#5b63d3] text-white hover:bg-[#7A7FD0] transition-all duration-200 shadow-md"
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
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1D1D21] to-[#2D2D33] overflow-hidden border-2 border-[#8E93DA] flex-shrink-0">
                    {editedProfile?.icon_url ? (
                      <Image
                        src={editedProfile.icon_url}
                        alt="プロフィール画像"
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#FCFCFC] bg-gradient-to-br from-[#2D2D33] to-[#1D1D21]">
                        <span className="text-base font-medium">
                          {editedProfile?.myoji?.charAt(0)}{editedProfile?.namae?.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <div className="absolute -bottom-1 -right-1 flex gap-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-[#5b63d3] text-white hover:bg-[#7A7FD0] transition-all duration-200 shadow-md"
                        aria-label="画像をアップロード"
                      >
                        <AddAPhotoIcon fontSize="small" />
                      </button>
                      {editedProfile?.icon_url && (
                        <button
                          onClick={handleImageDelete}
                          disabled={isUploading}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-all duration-200 shadow-md"
                          aria-label="画像を削除"
                        >
                          <DeleteIcon fontSize="small" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* 名前と性別 */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <TextField
                          label="名字"
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
                          label="名前"
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
                          label="LastName"
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
                          label="FirstName"
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

                  {/* 生年月日 */}
                  <div className="flex items-center p-2 bg-[#23232A] rounded-lg">
                    <CakeIcon sx={{ color: '#8E93DA', fontSize: 20 }} />
                    <div className="ml-3 flex-1">
                      <div className="text-[10px] text-[#AEAEB2] opacity-75">生年月日</div>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editedProfile?.birthday ? new Date(editedProfile.birthday).toISOString().split('T')[0] : ''}
                          onChange={(e) => setEditedProfile(prev => prev ? {...prev, birthday: e.target.value} : null)}
                          className="w-full p-1 rounded bg-[#23232A] text-[#FCFCFC] border border-[#3D3D43] focus:outline-none focus:border-[#8E93DA] [&::-webkit-calendar-picker-indicator]:invert"
                        />
                      ) : (
                        <div className="text-[#FCFCFC]">
                          {profile?.birthday ? new Date(profile.birthday).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : '未設定'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* トリミングダイアログ */}
      <Dialog
        open={showCropDialog}
        onClose={() => {
          setShowCropDialog(false);
          if (cropImage) {
            URL.revokeObjectURL(cropImage);
            setCropImage(null);
          }
          setCrop({
            unit: '%',
            width: 90,
            height: 90,
            x: 5,
            y: 5,
          });
          setImageRef(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            height: { xs: 'calc(100dvh - 200px)', sm: 'auto' },
            maxHeight: { xs: 'calc(100dvh - 200px)', sm: '90vh' },
            margin: { xs: 0, sm: 2 },
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }
        }}
      >
        <DialogContent 
          className="bg-[#2D2D33] p-0 flex flex-col"
          sx={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
            padding: '0 !important'
          }}
        >
          {cropImage && (
            <div className="flex-1 overflow-auto h-full flex items-center justify-center" style={{ WebkitOverflowScrolling: 'touch' }}>
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  src={cropImage}
                  alt="トリミング対象"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setImageRef(img);
                    const size = Math.min(img.width, img.height);
                    setCrop({
                      unit: 'px',
                      width: size,
                      height: size,
                      x: (img.width - size) / 2,
                      y: (img.height - size) / 2,
                    });
                  }}
                  className="max-w-full max-h-full"
                  style={{
                    maxHeight: 'calc(100dvh - 200px)',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              </ReactCrop>
            </div>
          )}
        </DialogContent>
        <DialogActions 
          className="bg-[#2D2D33] gap-2"
          sx={{
            position: 'sticky',
            bottom: 0,
            backgroundColor: '#2D2D33',
            borderTop: '1px solid #3D3D43',
            zIndex: 1,
            padding: '1rem',
            marginTop: 'auto'
          }}
        >
          <Button
            onClick={() => {
              setShowCropDialog(false);
              if (cropImage) {
                URL.revokeObjectURL(cropImage);
                setCropImage(null);
              }
              setCrop({
                unit: '%',
                width: 90,
                height: 90,
                x: 5,
                y: 5,
              });
              setImageRef(null);
            }}
            className="flex-1"
            variant="contained"
            sx={{
              backgroundColor: '#4A4B50',
              '&:hover': {
                backgroundColor: '#3A3B40',
              },
              boxShadow: 'none',
              color: '#FCFCFC',
            }}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleCropComplete}
            disabled={isCropping}
            className="flex-1"
            variant="contained"
            sx={{
              backgroundColor: '#5b63d3',
              '&:hover': {
                backgroundColor: '#7A7FD0',
              },
              boxShadow: 'none',
              color: '#FCFCFC',
            }}
          >
            {isCropping ? '処理中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmpProfilePage; 