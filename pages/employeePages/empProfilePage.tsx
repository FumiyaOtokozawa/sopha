import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../utils/supabaseClient";
import Image from "next/image";
import {
  Box,
  CircularProgress,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { ja } from "date-fns/locale";
import { format } from "date-fns";
import BadgeIcon from "@mui/icons-material/Badge";
import EmailIcon from "@mui/icons-material/Email";
import EditIcon from "@mui/icons-material/Edit";
import WcIcon from "@mui/icons-material/Wc";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import CakeIcon from "@mui/icons-material/Cake";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import DeleteIcon from "@mui/icons-material/Delete";
import { Cropper, CropperRef } from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";
import imageCompression from "browser-image-compression";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// カスタムスタイルを追加
const cropperStyle = `
  .advanced-cropper-wrapper {
    background-color: #23232A !important;
  }
  .advanced-cropper-boundary {
    border: 2px solid #5b63d3 !important;
  }
  .advanced-cropper-stencil {
    border: 2px solid #5b63d3 !important;
    cursor: move !important;
  }
  .advanced-cropper-handles-wrapper {
    border: none !important;
  }
  .advanced-cropper-handle {
    background-color: #5b63d3 !important;
    border: 3px solid #FCFCFC !important;
    width: 32px !important;
    height: 32px !important;
    opacity: 1 !important;
    cursor: pointer !important;
    transform: translate(-50%, -50%) !important;
    transition: all 0.2s ease !important;
    border-radius: 8px !important;
  }
  .advanced-cropper-handle:hover {
    background-color: #7A7FD0 !important;
    transform: translate(-50%, -50%) scale(1.1) !important;
    box-shadow: 0 0 8px rgba(91, 99, 211, 0.5) !important;
  }
  .advanced-cropper-handle-west,
  .advanced-cropper-handle-east,
  .advanced-cropper-handle-south,
  .advanced-cropper-handle-north {
    display: none !important;
  }
  .advanced-cropper-handle-west-north,
  .advanced-cropper-handle-east-north,
  .advanced-cropper-handle-west-south,
  .advanced-cropper-handle-east-south {
    background-color: #5b63d3 !important;
    border: 3px solid #FCFCFC !important;
    width: 40px !important;
    height: 40px !important;
  }
  .advanced-cropper-lines {
    border: none !important;
  }
  .advanced-cropper-rotate-wrapper {
    display: none !important;
  }
`;

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
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from("profile-images")
      .list();

    if (storageError) throw storageError;

    // 全ユーザーのicon_urlを取得
    const { data: userProfiles, error: userError } = await supabase
      .from("USER_INFO")
      .select("icon_url")
      .not("icon_url", "is", null);

    if (userError) throw userError;

    // 使用中のファイル名のセットを作成
    const usedFileNames = new Set(
      userProfiles
        .map((profile) => profile.icon_url?.split("/").pop())
        .filter(Boolean)
    );

    // 未使用のファイルを特定
    const unusedFiles = storageFiles
      .filter((file) => !usedFileNames.has(file.name))
      .map((file) => file.name);

    // 未使用ファイルを削除
    if (unusedFiles.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from("profile-images")
        .remove(unusedFiles);

      if (deleteError) throw deleteError;
      console.log(`${unusedFiles.length}件の未使用画像を削除しました`);
    }
  } catch (error) {
    console.error("クリーンアップエラー:", error);
  }
};

const EmpProfilePage = () => {
  const router = useRouter();
  const { emp_no: targetEmpNo } = router.query; // URLからemp_noを取得
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCurrentUser, setIsCurrentUser] = useState(false); // 表示中のプロフィールが自分のものかどうか
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropperKey, setCropperKey] = useState(0);
  const cropperRef = useRef<CropperRef>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // ログインユーザーの情報を取得
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/");
          return;
        }

        // ログインユーザーの社員番号を取得
        const { data: currentUserData } = await supabase
          .from("USER_INFO")
          .select("emp_no")
          .eq("email", user.email)
          .single();

        // URLパラメータのemp_noが指定されていない場合は、ログインユーザーのプロフィールを表示
        const profileEmpNo = targetEmpNo || currentUserData?.emp_no;

        // プロフィール情報を取得
        const { data: profileData, error } = await supabase
          .from("USER_INFO")
          .select("*")
          .eq("emp_no", profileEmpNo)
          .single();

        if (error) throw error;

        setProfile(profileData);
        setEditedProfile(profileData);
        // 表示中のプロフィールが自分のものかどうかを設定
        setIsCurrentUser(currentUserData?.emp_no === profileData.emp_no);
      } catch (error) {
        console.error("Error fetching profile:", error);
        setErrors({ general: "プロフィールの取得に失敗しました" });
      } finally {
        setLoading(false);
      }
    };

    if (router.isReady) {
      fetchProfile();
    }
  }, [router.isReady, router, targetEmpNo]);

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
    setErrors({});

    try {
      const newErrors: { [key: string]: string } = {};

      // 必須項目のバリデーション
      if (!editedProfile.myoji) newErrors.myoji = "名字を入力してください";
      if (!editedProfile.namae) newErrors.namae = "名前を入力してください";
      if (!editedProfile.last_nm) newErrors.last_nm = "MYOJIを入力してください";
      if (!editedProfile.first_nm)
        newErrors.first_nm = "NAMAEを入力してください";
      if (!editedProfile.gender) newErrors.gender = "性別を選択してください";

      // 英語名のバリデーション
      if (editedProfile.last_nm && !/^[A-Za-z]+$/.test(editedProfile.last_nm)) {
        newErrors.last_nm = "MYOJIは半角英字のみ入力可能です";
      }
      if (
        editedProfile.first_nm &&
        !/^[A-Za-z]+$/.test(editedProfile.first_nm)
      ) {
        newErrors.first_nm = "NAMAEは半角英字のみ入力可能です";
      }

      // エラーがある場合は処理を中断
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setIsSaving(false);
        return;
      }

      // 新しい画像がアップロードされている場合の処理
      let iconUrl = editedProfile.icon_url;
      if (
        editedProfile.icon_url &&
        editedProfile.icon_url.startsWith("blob:")
      ) {
        // Blob URLからFileオブジェクトを取得
        const response = await fetch(editedProfile.icon_url);
        const blob = await response.blob();
        const file = new File([blob], "profile-image.jpg", {
          type: "image/jpeg",
        });

        // 既存の画像を削除
        if (profile?.icon_url) {
          try {
            const oldPath = profile.icon_url.split("/").pop();
            if (oldPath) {
              const { error: deleteError } = await supabase.storage
                .from("profile-images")
                .remove([oldPath]);

              if (deleteError) {
                console.error("古い画像の削除に失敗しました:", deleteError);
              }
            }
          } catch (deleteError) {
            console.error("画像削除中にエラーが発生しました:", deleteError);
          }
        }

        // 新しい画像をアップロード
        const fileExt = "jpg";
        const fileName = `${editedProfile.emp_no}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // アップロードした画像のURLを取得
        const {
          data: { publicUrl },
        } = supabase.storage.from("profile-images").getPublicUrl(filePath);

        iconUrl = publicUrl;
      }

      // プロフィールの更新
      const { error } = await supabase
        .from("USER_INFO")
        .update({
          myoji: editedProfile.myoji,
          namae: editedProfile.namae,
          last_nm: editedProfile.last_nm.toUpperCase(),
          first_nm: editedProfile.first_nm.toUpperCase(),
          gender: editedProfile.gender,
          birthday: editedProfile.birthday,
          icon_url: iconUrl,
        })
        .eq("emp_no", editedProfile.emp_no);

      if (error) throw error;

      // 更新成功後、表示を更新
      setProfile({
        ...editedProfile,
        last_nm: editedProfile.last_nm.toUpperCase(),
        first_nm: editedProfile.first_nm.toUpperCase(),
        icon_url: iconUrl,
      });
      setIsEditing(false);

      // カスタムイベントを発行してヘッダーに通知
      const userUpdateEvent = new CustomEvent("userProfileUpdate", {
        detail: {
          myoji: editedProfile.myoji,
          namae: editedProfile.namae,
          icon_url: iconUrl,
        },
      });
      window.dispatchEvent(userUpdateEvent);

      // 未使用画像のクリーンアップを実行
      await cleanupUnusedImages();
    } catch (error: unknown) {
      console.error("更新エラー:", error);
      if (error instanceof Error && !Object.keys(errors).length) {
        setErrors({ general: "プロフィールの更新に失敗しました" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile(profile);
    setErrors({});
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !editedProfile) return;

    try {
      setIsUploading(true);
      setErrors({});

      // ファイルタイプのチェック
      if (!file.type.startsWith("image/")) {
        throw new Error("画像ファイルのみアップロード可能です");
      }

      // 既存のURLをクリーンアップ
      if (cropImage) {
        URL.revokeObjectURL(cropImage);
      }

      // 画像をURLに変換
      const imageUrl = URL.createObjectURL(file);
      setCropImage(imageUrl);

      // クロッパーをリセット
      setCropperKey((prev) => prev + 1);
      setShowCropDialog(true);

      // input要素をリセット
      if (event.target) {
        event.target.value = "";
      }
    } catch (error) {
      console.error("画像アップロードエラー:", error);
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "画像のアップロードに失敗しました",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCropComplete = async () => {
    if (!cropperRef.current || !editedProfile) return;

    try {
      setIsCropping(true);
      setErrors({});

      // クロップされた画像をcanvasとして取得
      const canvas = cropperRef.current.getCanvas();
      if (!canvas) {
        throw new Error("トリミング領域が設定されていません");
      }

      // canvasをBlobに変換
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob: Blob | null) => {
            if (blob) resolve(blob);
            else reject(new Error("画像の生成に失敗しました"));
          },
          "image/jpeg",
          0.95
        );
      });

      // 画像を圧縮
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 400,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(
        new File([blob], "profile.jpg", { type: "image/jpeg" }),
        options
      );

      // プレビュー用のURLを生成
      const previewUrl = URL.createObjectURL(compressedFile);

      // プロフィールを更新（プレビュー表示のみ）
      setEditedProfile({
        ...editedProfile,
        icon_url: previewUrl,
      });

      // クリーンアップ
      setShowCropDialog(false);
      if (cropImage) {
        URL.revokeObjectURL(cropImage);
        setCropImage(null);
      }
    } catch (error) {
      console.error("画像処理エラー:", error);
      setErrors({
        general:
          error instanceof Error ? error.message : "画像の処理に失敗しました",
      });
    } finally {
      setIsCropping(false);
      setIsUploading(false);
    }
  };

  // クロッパーのクリーンアップ
  const cleanupCropper = () => {
    if (cropImage) {
      URL.revokeObjectURL(cropImage);
      setCropImage(null);
    }
    setShowCropDialog(false);
  };

  // ダイアログが開かれたときにクロッパーを初期化
  useEffect(() => {
    if (!showCropDialog && cropImage) {
      URL.revokeObjectURL(cropImage);
      setCropImage(null);
    }

    return () => {
      if (cropImage) {
        URL.revokeObjectURL(cropImage);
      }
    };
  }, [showCropDialog, cropImage]);

  const handleImageDelete = async () => {
    if (!editedProfile?.icon_url) return;

    try {
      setIsUploading(true);
      setErrors({});

      // 編集中のプロフィールのアイコンURLのみを更新
      setEditedProfile({
        ...editedProfile,
        icon_url: null,
      });
    } catch (error) {
      console.error("画像削除エラー:", error);
      setErrors({ general: "画像の削除に失敗しました" });
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-b from-[#1D1D21] to-[#2D2D33]">
        <div className="flex justify-center items-center h-[80vh]">
          <CircularProgress sx={{ color: "#8E93DA" }} />
          <span className="ml-3 text-[#FCFCFC] font-medium">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <Box>
      <style jsx global>
        {cropperStyle}
      </style>
      <div className="bg-gradient-to-b from-[#1D1D21] to-[#2D2D33]">
        <div className="p-4">
          <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center"></div>

            {errors.general && (
              <div className="mb-4 p-3 rounded bg-red-500 bg-opacity-10 border border-red-500 text-red-500">
                {errors.general}
              </div>
            )}

            <div className="bg-[#2D2D33] rounded-xl overflow-hidden shadow-lg border border-[#3D3D43] relative">
              {/* 編集ボタンは自分のプロフィールの場合のみ表示 */}
              {!isEditing && isCurrentUser && (
                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={handleEdit}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-[#5b63d3] text-white transition-all duration-200 active:bg-[#7A7FD0] md:hover:bg-[#7A7FD0] shadow-md"
                    aria-label="編集"
                  >
                    <EditIcon fontSize="small" />
                  </button>
                </div>
              )}

              {/* 編集モード時のボタンも自分のプロフィールの場合のみ表示 */}
              {isEditing && isCurrentUser && (
                <div className="flex w-full border-b border-[#3D3D43]">
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-3 px-4 flex items-center justify-center gap-2 bg-[#23232A] text-[#FCFCFC] transition-all duration-200 active:bg-[#3A3B40] md:hover:bg-[#3A3B40]"
                    aria-label="キャンセル"
                  >
                    <CloseIcon fontSize="small" />
                    <span className="font-medium">キャンセル</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 py-3 px-4 flex items-center justify-center gap-2 bg-[#5b63d3] text-white transition-all duration-200 active:bg-[#7A7FD0] md:hover:bg-[#7A7FD0] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:bg-[#5b63d3] disabled:hover:bg-[#5b63d3]"
                    aria-label="保存"
                  >
                    <SaveIcon fontSize="small" />
                    <span className="font-medium">
                      {isSaving ? "保存中..." : "保存"}
                    </span>
                  </button>
                </div>
              )}

              {/* プロフィールヘッダー */}
              <div className="p-4 flex items-start gap-3 border-b border-[#3D3D43]">
                {/* プロフィール画像エリア */}
                <div className="flex flex-col items-center gap-3 pt-1">
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
                          {editedProfile?.myoji?.charAt(0)}
                          {editedProfile?.namae?.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  {isEditing && isCurrentUser && (
                    <div className="flex gap-1">
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
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-[#5b63d3] text-white hover:bg-[#7A7FD0] transition-all duration-200 shadow-md relative"
                        aria-label="画像をアップロード"
                      >
                        <AddAPhotoIcon
                          fontSize="small"
                          className="absolute"
                          sx={{
                            transform: "translate(-1px, -1px)",
                          }}
                        />
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
                  {isEditing && isCurrentUser ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <TextField
                          label="名字"
                          value={editedProfile?.myoji || ""}
                          onChange={(e) =>
                            setEditedProfile((prev) =>
                              prev ? { ...prev, myoji: e.target.value } : null
                            )
                          }
                          variant="outlined"
                          size="small"
                          error={!!errors.myoji}
                          helperText={errors.myoji}
                          InputProps={{
                            style: { color: "#FCFCFC", fontSize: "0.875rem" },
                          }}
                          InputLabelProps={{
                            style: { color: "#AEAEB2", fontSize: "0.75rem" },
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": {
                                borderColor: errors.myoji
                                  ? "#ef4444"
                                  : "#3D3D43",
                              },
                              "&:hover fieldset": {
                                borderColor: "#8E93DA",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: "#8E93DA",
                              },
                              backgroundColor: "#23232A",
                            },
                            "& .MuiFormHelperText-root": {
                              color: "#ef4444",
                            },
                          }}
                        />
                        <TextField
                          label="名前"
                          value={editedProfile?.namae || ""}
                          onChange={(e) =>
                            setEditedProfile((prev) =>
                              prev ? { ...prev, namae: e.target.value } : null
                            )
                          }
                          variant="outlined"
                          size="small"
                          error={!!errors.namae}
                          helperText={errors.namae}
                          InputProps={{
                            style: { color: "#FCFCFC", fontSize: "0.875rem" },
                          }}
                          InputLabelProps={{
                            style: { color: "#AEAEB2", fontSize: "0.75rem" },
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": {
                                borderColor: "#3D3D43",
                              },
                              "&:hover fieldset": {
                                borderColor: "#8E93DA",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: "#8E93DA",
                              },
                              backgroundColor: "#23232A",
                            },
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <TextField
                          label="MYOJI"
                          value={editedProfile?.last_nm || ""}
                          onChange={(e) =>
                            setEditedProfile((prev) =>
                              prev ? { ...prev, last_nm: e.target.value } : null
                            )
                          }
                          variant="outlined"
                          size="small"
                          error={!!errors.last_nm}
                          helperText={errors.last_nm}
                          InputProps={{
                            style: { color: "#FCFCFC", fontSize: "0.875rem" },
                          }}
                          InputLabelProps={{
                            style: { color: "#AEAEB2", fontSize: "0.75rem" },
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": {
                                borderColor: errors.last_nm
                                  ? "#ef4444"
                                  : "#3D3D43",
                              },
                              "&:hover fieldset": {
                                borderColor: "#8E93DA",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: "#8E93DA",
                              },
                              backgroundColor: "#23232A",
                            },
                            "& .MuiFormHelperText-root": {
                              color: "#ef4444",
                            },
                          }}
                        />
                        <TextField
                          label="NAMAE"
                          value={editedProfile?.first_nm || ""}
                          onChange={(e) =>
                            setEditedProfile((prev) =>
                              prev
                                ? { ...prev, first_nm: e.target.value }
                                : null
                            )
                          }
                          variant="outlined"
                          size="small"
                          error={!!errors.first_nm}
                          helperText={errors.first_nm}
                          InputProps={{
                            style: { color: "#FCFCFC", fontSize: "0.875rem" },
                          }}
                          InputLabelProps={{
                            style: { color: "#AEAEB2", fontSize: "0.75rem" },
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": {
                                borderColor: errors.first_nm
                                  ? "#ef4444"
                                  : "#3D3D43",
                              },
                              "&:hover fieldset": {
                                borderColor: "#8E93DA",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: "#8E93DA",
                              },
                              backgroundColor: "#23232A",
                            },
                            "& .MuiFormHelperText-root": {
                              color: "#ef4444",
                            },
                          }}
                        />
                      </div>
                      <FormControl component="fieldset">
                        <FormLabel
                          component="legend"
                          sx={{ color: "#AEAEB2", fontSize: "0.75rem" }}
                        >
                          性別
                        </FormLabel>
                        <RadioGroup
                          row
                          value={editedProfile?.gender || ""}
                          onChange={(e) =>
                            setEditedProfile((prev) =>
                              prev ? { ...prev, gender: e.target.value } : null
                            )
                          }
                        >
                          <FormControlLabel
                            value="1"
                            control={
                              <Radio
                                size="small"
                                sx={{
                                  color: "#AEAEB2",
                                  "&.Mui-checked": { color: "#8E93DA" },
                                }}
                              />
                            }
                            label={
                              <span
                                style={{
                                  color: "#FCFCFC",
                                  fontSize: "0.75rem",
                                }}
                              >
                                男性
                              </span>
                            }
                          />
                          <FormControlLabel
                            value="0"
                            control={
                              <Radio
                                size="small"
                                sx={{
                                  color: "#AEAEB2",
                                  "&.Mui-checked": { color: "#8E93DA" },
                                }}
                              />
                            }
                            label={
                              <span
                                style={{
                                  color: "#FCFCFC",
                                  fontSize: "0.75rem",
                                }}
                              >
                                女性
                              </span>
                            }
                          />
                          <FormControlLabel
                            value="2"
                            control={
                              <Radio
                                size="small"
                                sx={{
                                  color: "#AEAEB2",
                                  "&.Mui-checked": { color: "#8E93DA" },
                                }}
                              />
                            }
                            label={
                              <span
                                style={{
                                  color: "#FCFCFC",
                                  fontSize: "0.75rem",
                                }}
                              >
                                その他
                              </span>
                            }
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
                        <WcIcon sx={{ color: "#8E93DA", fontSize: 16 }} />
                        <span className="ml-1 text-xs text-[#FCFCFC]">
                          {profile?.gender === "1"
                            ? "男性"
                            : profile?.gender === "0"
                            ? "女性"
                            : "その他"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 基本情報 */}
              <div className="p-4">
                <h3 className="text-xs font-medium text-[#AEAEB2] mb-2 uppercase tracking-wider opacity-80">
                  基本情報
                </h3>

                <div className="space-y-3">
                  {/* 社員番号 */}
                  <div className="flex items-center p-2 bg-[#23232A] rounded-lg">
                    <BadgeIcon sx={{ color: "#8E93DA", fontSize: 20 }} />
                    <div className="ml-3 flex-1">
                      <div className="text-[10px] text-[#AEAEB2] opacity-75">
                        社員番号
                      </div>
                      <div className="text-[#FCFCFC] font-medium">
                        {profile?.emp_no}
                      </div>
                    </div>
                  </div>

                  {/* メールアドレス */}
                  <div className="flex items-center p-2 bg-[#23232A] rounded-lg">
                    <EmailIcon sx={{ color: "#8E93DA", fontSize: 20 }} />
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="text-[10px] text-[#AEAEB2] opacity-75">
                        メールアドレス
                      </div>
                      <div className="text-[#FCFCFC] truncate">
                        {profile?.email}
                      </div>
                    </div>
                  </div>

                  {/* 生年月日 */}
                  <div className="flex items-center p-2 bg-[#23232A] rounded-lg">
                    <CakeIcon sx={{ color: "#8E93DA", fontSize: 20 }} />
                    <div className="ml-3 flex-1">
                      <div className="text-[10px] text-[#AEAEB2] opacity-75">
                        生年月日
                      </div>
                      {isEditing ? (
                        <LocalizationProvider
                          dateAdapter={AdapterDateFns}
                          adapterLocale={ja}
                        >
                          <DatePicker
                            value={
                              editedProfile?.birthday
                                ? new Date(editedProfile.birthday)
                                : null
                            }
                            onChange={(newValue) => {
                              setEditedProfile((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      birthday: newValue
                                        ? format(newValue, "yyyy-MM-dd")
                                        : null,
                                    }
                                  : null
                              );
                            }}
                            format="yyyy年MM月dd日"
                            slotProps={{
                              textField: {
                                variant: "standard",
                                fullWidth: true,
                                placeholder: "生年月日を選択",
                                sx: {
                                  "& .MuiInputBase-root": {
                                    color: "#FCFCFC",
                                    "&:before": {
                                      borderBottomColor: "#3D3D43",
                                    },
                                    "&:hover:not(.Mui-disabled):before": {
                                      borderBottomColor: "#8E93DA",
                                    },
                                    "&.Mui-focused:after": {
                                      borderBottomColor: "#8E93DA",
                                    },
                                  },
                                  "& .MuiIconButton-root": {
                                    color: "#AEAEB2",
                                    marginRight: "8px",
                                  },
                                },
                              },
                              dialog: {
                                sx: {
                                  "& .MuiDialog-paper": {
                                    backgroundColor: "#2D2D33",
                                  },
                                  "& .MuiPickersLayout-root": {
                                    backgroundColor: "#2D2D33",
                                    color: "#FCFCFC",
                                  },
                                  "& .MuiPickersToolbar-root": {
                                    color: "#FCFCFC",
                                    "& .MuiTypography-root": {
                                      color: "#FCFCFC",
                                    },
                                    "& .MuiButton-root": {
                                      color: "#8E93DA",
                                    },
                                  },
                                  "& .MuiPickersDay-root": {
                                    color: "#FCFCFC",
                                    "&:hover": {
                                      backgroundColor: "#3D3D43",
                                    },
                                    "&.Mui-selected": {
                                      backgroundColor: "#5b63d3",
                                      "&:hover": {
                                        backgroundColor: "#7A7FD0",
                                      },
                                    },
                                  },
                                  "& .MuiDayCalendar-weekDayLabel": {
                                    color: "#AEAEB2",
                                  },
                                  "& .MuiPickersCalendarHeader-root": {
                                    "& .MuiPickersCalendarHeader-label": {
                                      color: "#FCFCFC",
                                    },
                                    "& .MuiIconButton-root": {
                                      color: "#8E93DA",
                                    },
                                  },
                                  "& .MuiDialogActions-root": {
                                    backgroundColor: "#23232A",
                                    borderTop: "1px solid #3D3D43",
                                    "& .MuiButton-root": {
                                      color: "#8E93DA",
                                    },
                                  },
                                  "& .MuiYearCalendar-root": {
                                    "& .MuiPickersYear-yearButton": {
                                      color: "#FCFCFC",
                                      "&:hover": {
                                        backgroundColor: "#3D3D43",
                                      },
                                      "&.Mui-selected": {
                                        backgroundColor: "#5b63d3",
                                      },
                                    },
                                  },
                                },
                              },
                            }}
                          />
                        </LocalizationProvider>
                      ) : (
                        <div className="text-[#FCFCFC]">
                          {profile?.birthday
                            ? format(
                                new Date(profile.birthday),
                                "yyyy年MM月dd日",
                                {
                                  locale: ja,
                                }
                              )
                            : "未設定"}
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
      {isCurrentUser && (
        <Dialog
          open={showCropDialog}
          onClose={cleanupCropper}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              height: { xs: "calc(100dvh - 200px)", sm: "auto" },
              maxHeight: { xs: "calc(100dvh - 200px)", sm: "90vh" },
              margin: { xs: 0, sm: 2 },
              position: "relative",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              backgroundColor: "#2D2D33",
            },
          }}
        >
          <DialogContent
            sx={{
              flex: 1,
              overflow: "hidden",
              position: "relative",
              padding: "0 !important",
              backgroundColor: "#2D2D33",
            }}
          >
            {cropImage && (
              <div className="flex-1 overflow-hidden h-full flex items-center justify-center bg-[#23232A]">
                <Cropper
                  key={cropperKey}
                  src={cropImage}
                  className="w-full h-full"
                  stencilProps={{
                    aspectRatio: 1,
                    grid: true,
                    handlers: {
                      eastNorth: true,
                      north: false,
                      westNorth: true,
                      west: false,
                      westSouth: true,
                      south: false,
                      eastSouth: true,
                      east: false,
                    },
                    movable: true,
                    resizable: true,
                    lines: {
                      cols: 2,
                      rows: 2,
                    },
                  }}
                  defaultSize={{
                    width: 250,
                    height: 250,
                  }}
                  minWidth={250}
                  minHeight={250}
                  ref={cropperRef}
                />
              </div>
            )}
          </DialogContent>
          <DialogActions
            sx={{
              position: "sticky",
              bottom: 0,
              backgroundColor: "#2D2D33",
              borderTop: "1px solid #3D3D43",
              zIndex: 1,
              padding: "1rem",
              marginTop: "auto",
            }}
          >
            <Button
              onClick={cleanupCropper}
              className="flex-1"
              variant="contained"
              sx={{
                backgroundColor: "#4A4B50",
                "&:hover": {
                  backgroundColor: "#3A3B40",
                },
                boxShadow: "none",
                color: "#FCFCFC",
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
                backgroundColor: "#5b63d3",
                "&:hover": {
                  backgroundColor: "#7A7FD0",
                },
                boxShadow: "none",
                color: "#FCFCFC",
              }}
            >
              {isCropping ? "処理中..." : "保存"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default EmpProfilePage;
