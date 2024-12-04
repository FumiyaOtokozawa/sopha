// supabaseAdminClient.js
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("Service Role Key:", process.env.SUPABASE_SERVICE_ROLE_KEY);
  throw new Error("Supabase URL and Service Role Key must be provided.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export default supabaseAdmin;
