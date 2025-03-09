| schema_name | table_name          | column_name                 | ordinal_position | data_type                   | is_nullable | column_default          | constraints |
| ----------- | ------------------- | --------------------------- | ---------------- | --------------------------- | ----------- | ----------------------- | ----------- |
| auth        | users               | instance_id                 | 1                | uuid                        | YES         | null                    | null        |
| auth        | users               | id                          | 2                | uuid                        | NO          | null                    | PK          |
| auth        | users               | aud                         | 3                | character varying           | YES         | null                    | null        |
| auth        | users               | role                        | 4                | character varying           | YES         | null                    | null        |
| auth        | users               | email                       | 5                | character varying           | YES         | null                    | null        |
| auth        | users               | encrypted_password          | 6                | character varying           | YES         | null                    | null        |
| auth        | users               | email_confirmed_at          | 7                | timestamp with time zone    | YES         | null                    | null        |
| auth        | users               | invited_at                  | 8                | timestamp with time zone    | YES         | null                    | null        |
| auth        | users               | confirmation_token          | 9                | character varying           | YES         | null                    | null        |
| auth        | users               | confirmation_sent_at        | 10               | timestamp with time zone    | YES         | null                    | null        |
| auth        | users               | recovery_token              | 11               | character varying           | YES         | null                    | null        |
| auth        | users               | recovery_sent_at            | 12               | timestamp with time zone    | YES         | null                    | null        |
| auth        | users               | email_change_token_new      | 13               | character varying           | YES         | null                    | null        |
| auth        | users               | email_change                | 14               | character varying           | YES         | null                    | null        |
| auth        | users               | email_change_sent_at        | 15               | timestamp with time zone    | YES         | null                    | null        |
| auth        | users               | last_sign_in_at             | 16               | timestamp with time zone    | YES         | null                    | null        |
| auth        | users               | raw_app_meta_data           | 17               | jsonb                       | YES         | null                    | null        |
| auth        | users               | raw_user_meta_data          | 18               | jsonb                       | YES         | null                    | null        |
| auth        | users               | is_super_admin              | 19               | boolean                     | YES         | null                    | null        |
| auth        | users               | created_at                  | 20               | timestamp with time zone    | YES         | null                    | null        |
| auth        | users               | updated_at                  | 21               | timestamp with time zone    | YES         | null                    | null        |
| auth        | users               | phone                       | 22               | text                        | YES         | NULL::character varying | UQ          |
| auth        | users               | phone_confirmed_at          | 23               | timestamp with time zone    | YES         | null                    | null        |
| auth        | users               | phone_change                | 24               | text                        | YES         | ''::character varying   | null        |
| auth        | users               | phone_change_token          | 25               | character varying           | YES         | ''::character varying   | null        |
| auth        | users               | phone_change_sent_at        | 26               | timestamp with time zone    | YES         | null                    | null        |
| auth        | users               | confirmed_at                | 27               | timestamp with time zone    | YES         | null                    | null        |
| auth        | users               | email_change_token_current  | 28               | character varying           | YES         | ''::character varying   | null        |
| auth        | users               | email_change_confirm_status | 29               | smallint                    | YES         | 0                       | null        |
| auth        | users               | banned_until                | 30               | timestamp with time zone    | YES         | null                    | null        |
| auth        | users               | reauthentication_token      | 31               | character varying           | YES         | ''::character varying   | null        |
| auth        | users               | reauthentication_sent_at    | 32               | timestamp with time zone    | YES         | null                    | null        |
| auth        | users               | is_sso_user                 | 33               | boolean                     | NO          | false                   | null        |
| auth        | users               | deleted_at                  | 34               | timestamp with time zone    | YES         | null                    | null        |
| auth        | users               | is_anonymous                | 35               | boolean                     | NO          | false                   | null        |
| public      | ALL_USER_M          | emp_no                      | 1                | bigint                      | NO          | null                    | PK          |
| public      | ALL_USER_M          | email                       | 2                | text                        | NO          | null                    | null        |
| public      | ALL_USER_M          | act_kbn                     | 3                | boolean                     | YES         | null                    | null        |
| public      | CONTACT_REPORTS     | id                          | 1                | bigint                      | NO          | null                    | PK          |
| public      | CONTACT_REPORTS     | category                    | 2                | text                        | NO          | null                    | null        |
| public      | CONTACT_REPORTS     | title                       | 3                | text                        | YES         | null                    | null        |
| public      | CONTACT_REPORTS     | description                 | 4                | text                        | YES         | null                    | null        |
| public      | CONTACT_REPORTS     | email                       | 5                | text                        | YES         | null                    | null        |
| public      | CONTACT_REPORTS     | status                      | 6                | text                        | YES         | 'pending'::text         | null        |
| public      | CONTACT_REPORTS     | created_at                  | 7                | timestamp without time zone | YES         | null                    | null        |
| public      | CONTACT_REPORTS     | updated_at                  | 8                | timestamp without time zone | YES         | null                    | null        |
| public      | CONTACT_REPORTS     | resolved_at                 | 9                | timestamp without time zone | YES         | null                    | null        |
| public      | CONTACT_REPORTS     | resolved_by                 | 10               | bigint                      | YES         | null                    | null        |
| public      | CONTACT_REPORTS     | response                    | 11               | text                        | YES         | null                    | null        |
| public      | EMP_CIZ             | ciz_id                      | 1                | bigint                      | NO          | null                    | UQ, PK      |
| public      | EMP_CIZ             | emp_no                      | 2                | bigint                      | NO          | null                    | FK          |
| public      | EMP_CIZ             | total_ciz                   | 3                | bigint                      | NO          | null                    | null        |
| public      | EMP_CIZ             | updated_at                  | 4                | timestamp without time zone | YES         | null                    | null        |
| public      | EMP_CIZ             | updated_by                  | 5                | text                        | YES         | null                    | null        |
| public      | EMP_CIZ             | act_kbn                     | 6                | boolean                     | NO          | true                    | null        |
| public      | EMP_CIZ_HISTORY     | history_id                  | 1                | bigint                      | NO          | null                    | PK          |
| public      | EMP_CIZ_HISTORY     | emp_no                      | 2                | bigint                      | NO          | null                    | FK          |
| public      | EMP_CIZ_HISTORY     | change_type                 | 3                | text                        | YES         | ''::text                | null        |
| public      | EMP_CIZ_HISTORY     | ciz                         | 4                | bigint                      | YES         | null                    | null        |
| public      | EMP_CIZ_HISTORY     | event_id                    | 5                | bigint                      | YES         | null                    | null        |
| public      | EMP_CIZ_HISTORY     | reason                      | 6                | text                        | YES         | null                    | null        |
| public      | EMP_CIZ_HISTORY     | created_at                  | 7                | timestamp without time zone | YES         | null                    | null        |
| public      | EMP_CIZ_HISTORY     | created_by                  | 8                | text                        | YES         | null                    | null        |
| public      | EMP_CIZ_HISTORY     | act_kbn                     | 9                | boolean                     | NO          | true                    | null        |
| public      | EVENT_LIST          | event_id                    | 1                | bigint                      | NO          | null                    | PK          |
| public      | EVENT_LIST          | title                       | 2                | text                        | NO          | null                    | null        |
| public      | EVENT_LIST          | owner                       | 4                | bigint                      | YES         | null                    | null        |
| public      | EVENT_LIST          | start_date                  | 5                | timestamp without time zone | YES         | null                    | null        |
| public      | EVENT_LIST          | end_date                    | 6                | timestamp without time zone | YES         | null                    | null        |
| public      | EVENT_LIST          | created_at                  | 7                | timestamp without time zone | YES         | null                    | null        |
| public      | EVENT_LIST          | created_by                  | 8                | bigint                      | YES         | null                    | null        |
| public      | EVENT_LIST          | updated_at                  | 9                | timestamp without time zone | YES         | null                    | null        |
| public      | EVENT_LIST          | updated_by                  | 10               | bigint                      | YES         | null                    | null        |
| public      | EVENT_LIST          | act_kbn                     | 11               | boolean                     | NO          | true                    | null        |
| public      | EVENT_LIST          | description                 | 12               | text                        | YES         | null                    | null        |
| public      | EVENT_LIST          | genre                       | 13               | text                        | YES         | null                    | null        |
| public      | EVENT_LIST          | repeat_id                   | 14               | bigint                      | YES         | null                    | null        |
| public      | EVENT_LIST          | abbreviation                | 15               | text                        | YES         | null                    | null        |
| public      | EVENT_LIST          | format                      | 16               | text                        | YES         | null                    | null        |
| public      | EVENT_LIST          | url                         | 17               | text                        | YES         | null                    | null        |
| public      | EVENT_LIST          | venue_radius                | 20               | bigint                      | YES         | null                    | null        |
| public      | EVENT_LIST          | venue_id                    | 21               | bigint                      | YES         | null                    | FK          |
| public      | EVENT_LIST          | manage_member               | 22               | text                        | YES         | null                    | null        |
| public      | EVENT_PARTICIPATION | emp_no                      | 1                | bigint                      | NO          | null                    | PK, FK      |
| public      | EVENT_PARTICIPATION | official_count              | 2                | bigint                      | NO          | null                    | null        |
| public      | EVENT_PARTICIPATION | unofficial_count            | 3                | bigint                      | YES         | null                    | null        |
| public      | EVENT_PARTICIPATION | updated_at                  | 4                | timestamp without time zone | YES         | null                    | null        |
| public      | EVENT_PAR_HISTORY   | history_id                  | 1                | bigint                      | NO          | null                    | PK          |
| public      | EVENT_PAR_HISTORY   | emp_no                      | 2                | bigint                      | YES         | null                    | FK          |
| public      | EVENT_PAR_HISTORY   | event_id                    | 3                | bigint                      | NO          | null                    | FK          |
| public      | EVENT_PAR_HISTORY   | participated_at             | 5                | timestamp without time zone | YES         | null                    | null        |
| public      | EVENT_TEMP_ENTRY    | entry_id                    | 1                | bigint                      | NO          | null                    | PK          |
| public      | EVENT_TEMP_ENTRY    | event_id                    | 2                | bigint                      | NO          | null                    | FK          |
| public      | EVENT_TEMP_ENTRY    | emp_no                      | 3                | bigint                      | YES         | null                    | FK          |
| public      | EVENT_TEMP_ENTRY    | status                      | 4                | text                        | YES         | null                    | null        |
| public      | EVENT_TEMP_ENTRY    | updated_at                  | 5                | timestamp without time zone | YES         | now()                   | null        |
| public      | EVENT_VENUE         | venue_id                    | 1                | bigint                      | NO          | null                    | PK          |
| public      | EVENT_VENUE         | venue_nm                    | 2                | text                        | NO          | null                    | null        |
| public      | EVENT_VENUE         | address                     | 3                | text                        | YES         | null                    | null        |
| public      | EVENT_VENUE         | latitude                    | 4                | null                        | YES         | null                    | null        |
| public      | EVENT_VENUE         | longitude                   | 5                | null                        | YES         | null                    | null        |
| public      | USER_INFO           | emp_no                      | 1                | bigint                      | NO          | null                    | UQ, PK      |
| public      | USER_INFO           | myoji                       | 3                | text                        | YES         | null                    | null        |
| public      | USER_INFO           | namae                       | 4                | text                        | YES         | null                    | null        |
| public      | USER_INFO           | last_nm                     | 5                | text                        | YES         | null                    | null        |
| public      | USER_INFO           | first_nm                    | 6                | text                        | YES         | null                    | null        |
| public      | USER_INFO           | gender                      | 7                | text                        | NO          | '1'::text               | null        |
| public      | USER_INFO           | email                       | 8                | text                        | YES         | null                    | null        |
| public      | USER_INFO           | act_kbn                     | 9                | boolean                     | NO          | true                    | null        |
| public      | USER_INFO           | login_count                 | 10               | bigint                      | YES         | '0'::bigint             | null        |
| public      | USER_INFO           | birthday                    | 11               | date                        | YES         | null                    | null        |
| public      | USER_INFO           | icon_url                    | 12               | text                        | YES         | null                    | null        |
| public      | USER_ROLE           | role_id                     | 1                | bigint                      | NO          | null                    | PK          |
| public      | USER_ROLE           | role                        | 3                | text                        | YES         | null                    | null        |
| public      | USER_ROLE           | updated_at                  | 4                | timestamp without time zone | YES         | null                    | null        |
| public      | USER_ROLE           | updated_by                  | 5                | text                        | YES         | null                    | null        |
| public      | USER_ROLE           | act_kbn                     | 6                | boolean                     | NO          | true                    | null        |
| public      | USER_ROLE           | emp_no                      | 7                | bigint                      | YES         | null                    | FK          |