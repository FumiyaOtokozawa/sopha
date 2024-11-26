import { createClient } from "@supabase/supabase-js";

// サーバーサイド専用のSupabaseクライアント
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send({ error: "Method not allowed" });
    return;
  }

  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).send({ error: "Email and password are required" });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // メール確認をスキップ
  });

  if (error) {
    res.status(400).send({ error: error.message });
    return;
  }

  res.status(200).send({ message: "User created successfully", data });
}
