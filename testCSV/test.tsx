import { useState } from "react";
import { useRouter } from "next/router";
import Papa, { ParseResult } from "papaparse";
import jschardet from "jschardet";
import Encoding from "encoding-japanese";

type Employee = {
  employee_number: number;
  last_name: string;
  first_name: string;
  last_name_alp: string;
  first_name_alp: string;
  gender: number;
  email: string;
};

type EmployeeCSVRow = {
  "メンバ属性 - 社員番号": string;
  "メンバ属性 - 氏名": string;
  "メンバ属性 - 性別": string;
  "メンバ属性 - メールアドレス": string;
};

const EmployeeAddPage = () => {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (
        selectedFile.type !== "text/csv" &&
        selectedFile.type !== "application/vnd.ms-excel"
      ) {
        setErrorMessage("CSVファイルを選択してください。");
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const validateRow = (
    row: EmployeeCSVRow,
    rowNumber: number
  ): Employee | null => {
    // バリデーション処理は現行のコードをそのまま使用
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!file) {
      setErrorMessage("CSVファイルを選択してください。");
      return;
    }

    setIsLoading(true);

    const reader = new FileReader();

    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result;
      if (!arrayBuffer) {
        setErrorMessage("ファイルの読み込みに失敗しました。");
        setIsLoading(false);
        return;
      }

      const uint8Array = new Uint8Array(arrayBuffer as ArrayBuffer);
      const binaryString = Array.from(uint8Array)
        .map((byte) => String.fromCharCode(byte))
        .join("");

      const detection = jschardet.detect(binaryString);
      let decodedText: string;

      if (detection.encoding === "SHIFT_JIS" || detection.encoding === "SJIS") {
        decodedText = Encoding.convert(uint8Array, {
          to: "UNICODE",
          from: "SJIS",
          type: "string",
        });
      } else {
        decodedText = new TextDecoder("utf-8").decode(uint8Array);
      }

      Papa.parse<EmployeeCSVRow>(decodedText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) =>
          header
            .replace(/^\ufeff/, "")
            .replace(/[−–—]/g, "-")
            .trim(),
        complete: async (results: ParseResult<EmployeeCSVRow>) => {
          const { data, errors } = results;

          if (errors.length > 0) {
            setErrorMessage(`CSV解析エラー： ${errors[0].message}`);
            setIsLoading(false);
            return;
          }

          const employees: Employee[] = [];

          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const validatedRow = validateRow(row, i + 2);
            if (validatedRow) {
              employees.push(validatedRow);
            }
          }

          if (employees.length === 0) {
            setErrorMessage("有効なデータが有りません");
            setIsLoading(false);
            return;
          }

          try {
            const response = await fetch("/api/add-employees", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ employees }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error);
            }

            setSuccessMessage("全ての社員が正常に追加されました。");
          } catch (error) {
            const typedError = error as Error;
            setErrorMessage(`エラー： ${typedError.message}`);
          } finally {
            setIsLoading(false);
          }
        },
        error: (error: Error) => {
          setErrorMessage(`CSV解析エラー： ${error.message}`);
          setIsLoading(false);
        },
      });
    };

    reader.readAsArrayBuffer(file);
  };

  return <div>{/* JSXは変更不要 */}</div>;
};

export default EmployeeAddPage;
