import supabaseAdmin from "../../supabaseAdminClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { employees } = req.body;

  // 送信データの構造を確認
  console.log("Sending employees:", employees);

  // last_nameが欠落している場合のデバッグ
  employees.forEach((employee) => {
    if (!employee.last_name) {
      console.warn("Missing last_name for:", employee);
    }
  });

  if (!Array.isArray(employees) || employees.length === 0) {
    return res.status(400).json({ error: "Invalid or empty employee data." });
  }

  try {
    // ストアドプロシージャを呼び出してバルクインサート
    const { error: rpcError } = await supabaseAdmin.rpc(
      "add_employee_transaction",
      {
        employees, // JSON形式で送信
      }
    );

    if (rpcError) {
      throw new Error(`ストアドプロシージャエラー: ${rpcError.message}`);
    }

    return res.status(200).json({ message: "Employees added successfully." });
  } catch (error) {
    console.error("Unexpected error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
