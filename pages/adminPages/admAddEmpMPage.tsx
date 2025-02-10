import { useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import Papa from 'papaparse'; // CSVパース用ライブラリ
import Header from '../../components/Header';  // 追加
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FileUploadIcon from '@mui/icons-material/FileUpload';  // アップロードアイコン用

interface CSVRow {
  'メンバ属性 - メールアドレス': string;
  'メンバ属性 - 社員番号': string;
}

interface ResultRow {
  name: string;
  status: 'success' | 'error' | 'duplicate';
  emp_no: number;
  errorMessage?: string;
}

const AdmAddEmpMPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  const validateData = (row: { emp_no: number; email: string }) => {
    if (row.emp_no.toString().length >= 9) {
      return { isValid: false, reason: '社員番号が9桁以上' };
    }
    
    if (!row.email.endsWith('@comsize.com')) {
      return { isValid: false, reason: 'メールドメインが不正' };
    }

    return { isValid: true, reason: null };
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage('ファイルを選択してください');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setResults([]);

    try {
      // 既存データの取得
      const { data: existingData } = await supabase
        .from('ALL_USER_M')
        .select('emp_no, email');

      const existingEmpNos = new Set(existingData?.map(d => d.emp_no));

      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('shift-jis');
      const text = decoder.decode(arrayBuffer);
      
      Papa.parse<CSVRow>(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const processedData = results.data.map((row: CSVRow) => {
              const data = {
                emp_no: Number(row['メンバ属性 - 社員番号']),
                email: row['メンバ属性 - メールアドレス'],
              };
              
              const validation = validateData(data);
              
              return {
                ...data,
                isValid: validation.isValid,
                reason: validation.reason
              };
            }).filter(row => row.emp_no && row.email);

            // 有効なデータのみを抽出
            const validData = processedData.filter(row => row.isValid).map(row => ({
              emp_no: row.emp_no,
              email: row.email,
              act_kbn: true
            }));

            // データの登録
            const { error } = await supabase
              .from('ALL_USER_M')
              .upsert(validData, {
                onConflict: 'emp_no'
              });

            if (error) throw error;

            // 結果の作成
            const resultsList = processedData.map(row => ({
              name: row.email.split('@')[0],
              emp_no: row.emp_no,
              status: !row.isValid ? 'error' as const :
                      existingEmpNos.has(row.emp_no) ? 'duplicate' as const : 
                      'success' as const,
              errorMessage: row.reason || undefined
            })).sort((a, b) => {
              // errorを最初に表示
              if (a.status === 'error' && b.status !== 'error') return -1;
              if (a.status !== 'error' && b.status === 'error') return 1;
              // 次にsuccessを表示
              if (a.status === 'success' && b.status !== 'success') return -1;
              if (a.status !== 'success' && b.status === 'success') return 1;
              // 同じステータスの場合は社員番号順でソート
              return a.emp_no - b.emp_no;
            });

            // エラー件数を計算
            const errorCount = resultsList.filter(r => r.status === 'error').length;

            setResults(resultsList);
            setSuccessMessage(
              `処理が完了しました（新規：${validData.length}件、更新：${existingEmpNos.size - validData.length}件、エラー：${errorCount}件）`
            );
          } catch (error) {
            console.error('データ登録エラー:', error);
            setErrorMessage('データの登録中にエラーが発生しました');
          }
        }
      });
    } catch (error) {
      console.error('ファイル処理エラー:', error);
      setErrorMessage('ファイルの処理中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <div className="p-4">
        <h2 className="text-lg font-bold mb-4">社員マスタ登録</h2>
        <div className="flex flex-col items-center">
          <div className="bg-[#FCFCFC19] rounded-lg shadow-md p-4 sm:p-8 w-full max-w-[600px]">
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-[#FCFCFC] border-dashed rounded-lg cursor-pointer hover:bg-[#FCFCFC0D]">
                  {!file ? (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileUploadIcon className="text-[#FCFCFC] mb-2" sx={{ fontSize: 40 }} />
                      <p className="mb-2 text-sm text-[#FCFCFC] text-center px-2">
                        <span className="font-semibold">クリックしてファイルを選択</span>
                      </p>
                      <p className="text-xs text-[#FCFCFC]">CSV形式のファイル</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 px-2">
                      <InsertDriveFileIcon className="text-[#8E93DA] mb-2" sx={{ fontSize: 40 }} />
                      <p className="text-sm text-[#FCFCFC] text-center break-all">
                        <span className="font-semibold">{file.name}</span>
                      </p>
                      <p className="text-xs text-[#FCFCFC] mt-1">
                        クリックして別のファイルを選択
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              <button
                onClick={handleUpload}
                disabled={isLoading || !file}
                className="
                  w-full py-2 rounded-md
                  bg-[#8E93DA] text-black font-bold
                  hover:bg-opacity-90 transition-colors
                  disabled:opacity-50
                "
              >
                {isLoading ? "登録中..." : "登録"}
              </button>

              {errorMessage && (
                <div className="bg-[#EF6A6A] text-black p-3 rounded text-sm break-all">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="bg-[#66EA89] text-black p-3 rounded text-sm break-all">
                  {successMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <div className="mt-4">
            <div className="bg-[#FCFCFC19] rounded-lg shadow-md p-4 w-full max-w-[600px] mx-auto">
              <h2 className="text-lg font-bold mb-4 text-[#FCFCFC]">登録結果</h2>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-[#FCFCFC] break-all"
                  >
                    {result.status === 'success' && (
                      <AddCircleIcon className="text-green-500 flex-shrink-0" />
                    )}
                    {result.status === 'duplicate' && (
                      <CheckCircleIcon className="text-yellow-500 flex-shrink-0" />
                    )}
                    {result.status === 'error' && (
                      <ErrorIcon className="text-red-500 flex-shrink-0" />
                    )}
                    <span className="break-all">{result.name}</span>
                    {result.errorMessage && (
                      <span className="text-red-500 text-sm break-all">
                        （{result.errorMessage}）
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdmAddEmpMPage;
