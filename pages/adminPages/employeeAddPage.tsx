// pages/adminPages/employeeAddPage.tsx

import { useState } from "react";
import { useRouter } from "next/router";
import supabase from "../../supabaseClient";
import Papa from "papaparse";
import jschardet from "jschardet";
import Encoding from "encoding-japanese";

type Employee = {
  employee_number: number;
  last_nm: string;
  first_nm: string;
  last_nm_alp: string;
  first_nm_alp: string;
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

  const requiredFields: (keyof EmployeeCSVRow)[] = [
    "メンバ属性 - 社員番号",
    "メンバ属性 - 氏名",
    "メンバ属性 - 性別",
    "メンバ属性 - メールアドレス",
  ];

  const validateRow = (
    row: EmployeeCSVRow,
    rowNumber: number
  ): Employee | null => {
    console.log(`行${rowNumber}のデータ:`, row);

    for (const field of requiredFields) {
      if (!row[field] || row[field].trim() === "") {
        setErrorMessage(`行${rowNumber}: '${field}' が欠落しています。`);
        return null;
      }
    }

    // メール形式のバリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row["メンバ属性 - メールアドレス"])) {
      setErrorMessage(`行${rowNumber}: 無効なメールアドレスです。`);
      return null;
    }

    // 性別のバリデーションと変換
    const genderStr = row["メンバ属性 - 性別"].trim();
    let gender: number;
    if (genderStr.includes("女")) {
      gender = 0;
    } else if (genderStr.includes("男")) {
      gender = 1;
    } else {
      setErrorMessage(
        `行${rowNumber}: 性別は '男性' または '女性' のいずれかでなければなりません。`
      );
      return null;
    }

    // 社員番号のパース
    const employeeNumber = parseInt(row["メンバ属性 - 社員番号"], 10);
    if (isNaN(employeeNumber)) {
      setErrorMessage(`行${rowNumber}: 社員番号が数値ではありません。`);
      return null;
    }

    // 氏名の分割
    const fullName = row["メンバ属性 - 氏名"].trim();
    const nameParts = fullName.split(" ");

    let last_nm: string;
    let first_nm: string;

    if (nameParts.length >= 2) {
      // 半角スペースで分割できた場合
      last_nm = nameParts[0];
      first_nm = nameParts.slice(1).join(" "); // 名前が複数単語の場合に対応
    } else {
      // 半角スペースで分割できなかった場合
      last_nm = fullName;
      first_nm = "";
    }

    // メールアドレスから名字英字と名前英字を抽出
    const emailLocalPart = row["メンバ属性 - メールアドレス"]
      .split("@")[0]
      .trim();
    const emailNameParts = emailLocalPart.split(".");
    let last_nm_alp: string;
    let first_nm_alp: string = "";
    if (emailNameParts.length === 2) {
      first_nm_alp = capitalize(emailNameParts[0]);
      last_nm_alp = capitalize(emailNameParts[1]);
    } else if (emailNameParts.length === 1) {
      last_nm_alp = capitalize(emailNameParts[0]);
    } else {
      setErrorMessage(
        `行${rowNumber}: メールアドレスの形式が正しくありません。`
      );
      return null;
    }

    return {
      employee_number: employeeNumber,
      last_nm: last_nm,
      first_nm: first_nm,
      last_nm_alp: last_nm_alp,
      first_nm_alp: first_nm_alp,
      gender: gender,
      email: row["メンバ属性 - メールアドレス"].trim(),
    };
  };

  const capitalize = (str: string): string => {
    if (str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
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

      // ArrayBufferをUint8Arrayに変換
      const uint8Array = new Uint8Array(arrayBuffer as ArrayBuffer);

      // Uint8Arrayをバイナリ文字列に変換
      const binaryString = Array.from(uint8Array)
        .map((byte) => String.fromCharCode(byte))
        .join("");

      // 文字エンコーディングを検出
      const detection = jschardet.detect(binaryString);
      console.log("Detected Encoding:", detection);

      let decodedText: string;

      if (detection.encoding === "SHIFT_JIS" || detection.encoding === "SJIS") {
        // Shift-JISの場合
        decodedText = Encoding.convert(uint8Array, {
          to: "UNICODE",
          from: "SJIS",
          type: "string",
        });
      } else {
        // デフォルトはUTF-8として扱う
        decodedText = new TextDecoder("utf-8").decode(uint8Array);
      }

      // デバッグ用にデコード後のテキストをログ出力
      console.log("Decoded Text:", decodedText);

      Papa.parse<EmployeeCSVRow>(decodedText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) =>
          header
            .replace(/^\ufeff/, "")
            .replace(/[−–—]/g, "-")
            .trim(),
        complete: async (results) => {
          console.log("Parsed Headers:", results.meta.fields);
          console.log("Parsed Data:", results.data);

          const { data, errors } = results;

          if (errors.length > 0) {
            setErrorMessage(`CSV解析エラー: ${errors[0].message}`);
            setIsLoading(false);
            return;
          }

          const employees: Employee[] = [];

          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const validatedRow = validateRow(row, i + 2);
            if (validatedRow) {
              employees.push(validatedRow);
            } else {
              setIsLoading(false);
              return;
            }
          }

          // supabaseにデータを挿入
          const { error } = await supabase
            .from("EMPLOYEE_LIST")
            .insert(employees);

          if (error) {
            setErrorMessage(`データベース挿入エラー: ${error.message}`);
          } else {
            setSuccessMessage("社員を正常に追加しました。");
            setFile(null);
          }
          setIsLoading(false);
        },
        error: (error: { message: unknown }) => {
          setErrorMessage(`CSV解析エラー: ${error.message}`);
          setIsLoading(false);
        },
      });
    };

    // ファイルをArrayBufferとして読み込む
    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <h1>社員追加ページ</h1>
      {errorMessage && <p style={{ color: "red" }}>エラー: {errorMessage}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="csvFile">CSVファイルを選択:</label>
          <input
            id="csvFile"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            required
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "処理中..." : "社員を追加"}
        </button>
      </form>
      <button onClick={() => router.back()}>戻る</button>
      <div style={{ marginTop: "20px" }}>
        <h2>CSVフォーマットの例</h2>
        <pre>
          {`メンバ属性 - 社員番号,メンバ属性 - 氏名,メンバ属性 - 性別,メンバ属性 - メールアドレス
            001,山田 太郎,男性,taro.suzuki@comsize.com
            002,鈴木 花子,女性,hanako.suzuki@comsize.com
            003,佐藤 次郎,男性,jiro.sato@comsize.com
            004,高橋 美咲,女性,misaki.takahashi@comsize.com`}
        </pre>
      </div>
    </div>
  );
};

export default EmployeeAddPage;
