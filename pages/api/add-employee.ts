import { NextApiRequest, NextApiResponse } from "next";
import supabaseAdmin from "../../supabaseAdminClient";

type Employee = {
  emp_no: number;
  myoji: string;
  namae: string;
  last_nm: string;
  first_nm: string;
  gender: string;
  email: string;
  act_kbn: boolean;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // リクエストヘッダーから認証トークンを取得
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "認証が必要です" });
  }

  // Bearerトークンを設定
  const token = authHeader.split(' ')[1];
  supabaseAdmin.auth.setSession({
    access_token: token,
    refresh_token: ''
  });

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { employees } = req.body as { employees: Employee[] };

    // すべての処理を単一のストアドプロシージャ内で実行
    const { error: procError } = await supabaseAdmin.rpc('add_employees_transaction', {
      employee_data: employees
    });

    if (procError) {
      throw new Error(`処理エラー: ${procError.message}`);
    }

    return res.status(200).json({ message: "社員情報が正常に登録されました" });

  } catch (error) {
    console.error("社員登録エラー:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "社員登録中にエラーが発生しました",
    });
  }
} 