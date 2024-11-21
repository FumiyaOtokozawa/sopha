// pages/adminPages/employeeAddPage.tsx

import { useState } from "react";
import { useRouter } from "next/router";
import supabase from "../../supabaseClient";
import Papa from "papaparse";

type Employee = {
  employee_number: string;
  last_nm: string;
  first_nm: string;
  last_nm_alp: string;
  first_nm_alp: string;
  gender: number;
  email: string;
};

type EmployeeCSVRow = {
  employee_number: string;
  last_nm: string;
  first_nm: string;
  last_nm_alp: string;
  first_nm_alp: string;
  gender: string;
  email: string;
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
      if (selectedFile.type !== "text/csv") {
        setErrorMessage("CSVファイルを選択してください。");
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const requiredFields: (keyof EmployeeCSVRow)[] = [
    "employee_number",
    "last_nm",
    "first_nm",
    "last_nm_alp",
    "first_nm_alp",
    "gender",
    "email",
  ];

  const validateRow = (
    row: EmployeeCSVRow,
    rowNumber: number
  ): Employee | null => {
    for (const field of requiredFields) {
      if (!row[field] || row[field].trim() === "") {
        setErrorMessage(`行${rowNumber}: '${field}' が欠落しています。`);
        return null;
      }
    }

    // メール形式のバリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email)) {
      setErrorMessage(`行${rowNumber}: 無効なメールアドレスです。`);
      return null;
    }

    // 性別のバリデーション
    const genderStr = row.gender.trim();
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

    return {
      employee_number: row.employee_number.trim(),
      last_nm: row.last_nm.trim(),
      first_nm: row.first_nm.trim(),
      last_nm_alp: row.last_nm_alp.trim(),
      first_nm_alp: row.first_nm_alp.trim(),
      gender: gender,
      email: row.email.trim(),
    };
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

    Papa.parse<EmployeeCSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const { data, errors } = results;

        if (errors.length > 0) {
          setErrorMessage(`CSV解析エラー: ${errors[0].message}`);
          setIsLoading(false);
          return;
        }

        const employees: Employee[] = [];

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const validatedRow = validateRow(row, i + 2); // ヘッダーが1行目なのでデータは2行目から
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
      error: (error) => {
        setErrorMessage(`CSV解析エラー: ${error.message}`);
        setIsLoading(false);
      },
    });
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
          {`employee_number,last_nm,first_nm,last_nm_alp,first_nm_alp,gender,email
            001,山田,太郎,Yamada,Taro,男性,taro.yamada@example.com
            002,鈴木,花子,Suzuki,Hanako,女性,hanako.suzuki@example.com`}
        </pre>
      </div>
    </div>
  );
};

export default EmployeeAddPage;
