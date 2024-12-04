CREATE OR REPLACE FUNCTION add_employee_transaction(
  employees JSONB -- 複数レコードをJSON形式で受け取る
) RETURNS VOID AS $$
DECLARE
  emp RECORD;
  email_parts TEXT[];
  first_name_alp TEXT;
  last_name_alp TEXT;
BEGIN
  -- トランザクション開始
  BEGIN
    FOR emp IN SELECT * FROM jsonb_to_recordset(employees) AS x(
      employee_number INTEGER,
      last_name TEXT,
      first_name TEXT,
      gender INTEGER,
      email TEXT,
      role INTEGER
    )
    LOOP
      -- Emailの@より手前を.で分割
      email_parts := string_to_array(split_part(emp.email, '@', 1), '.');
      first_name_alp := CASE WHEN array_length(email_parts, 1) >= 1 THEN initcap(email_parts[1]) ELSE NULL END;
      last_name_alp := CASE WHEN array_length(email_parts, 1) >= 2 THEN initcap(email_parts[2]) ELSE NULL END;

      -- EMPLOYEE_LIST に既存のデータがある場合はスキップ
      IF EXISTS (
        SELECT 1
        FROM public."EMPLOYEE_LIST"
        WHERE employee_number = emp.employee_number
      ) THEN
        RAISE NOTICE 'Employee number % already exists. Skipping.', emp.employee_number;
        CONTINUE; -- 次のループにスキップ
      END IF;

      -- EMPLOYEE_LIST テーブルに挿入
      INSERT INTO public."EMPLOYEE_LIST" (
        employee_number, last_name, first_name, last_name_alp, first_name_alp, gender, email
      ) VALUES (
        emp.employee_number, emp.last_name, emp.first_name, last_name_alp, first_name_alp, emp.gender, emp.email
      );

      -- USER_ROLE テーブルに挿入
      INSERT INTO public."USER_ROLE" (
        employee_number, role, last_name, first_name
      ) VALUES (
        emp.employee_number, emp.role, emp.last_name, emp.first_name
      );
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    -- エラーが発生した場合はロールバック
    RAISE EXCEPTION 'Error occurred while processing employees: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql;
