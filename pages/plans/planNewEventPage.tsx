import { NextPage } from "next";
import { Box, Button } from "@mui/material";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import FooterMenu from "../../components/FooterMenu";
import { PlanEventForm, FormField } from "../../components/forms/PlanEventForm";
import { DateTimeSelector } from "../../components/forms/DateTimeSelector";
import {
  PlanFormData,
  DateTimeSelection,
  CreatePlanEventRequest,
  CreatePlanEventResponse,
} from "../../types/plan";

const PlanNewEventPage: NextPage = () => {
  const user = useUser();
  const router = useRouter();
  const [selectedDateTimes, setSelectedDateTimes] = useState<
    DateTimeSelection[]
  >([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 日本語ロケールを設定
  dayjs.locale("ja");

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormData>({
    defaultValues: {
      title: "",
      description: "",
      deadline: "",
    },
  });

  // エラー発生時のスクロール処理
  useEffect(() => {
    if (
      Object.keys(errors).length > 0 ||
      submitError ||
      (isSubmitting && selectedDateTimes.length === 0)
    ) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [errors, submitError, isSubmitting, selectedDateTimes.length]);

  // 時間選択オプション
  const timeOptions = Array.from({ length: 97 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  });

  const onSubmit = async (data: PlanFormData) => {
    try {
      setSubmitError(null);

      if (!user?.email) {
        setSubmitError("ログインが必要です");
        return;
      }

      if (selectedDateTimes.length === 0) {
        setSubmitError("候補日時を少なくとも1つ選択してください");
        return;
      }

      // ユーザー情報の取得
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: userData, error: userError } = await supabase
        .from("USER_INFO")
        .select("emp_no")
        .eq("email", user.email)
        .single();

      if (userError) {
        setSubmitError("ユーザー情報の取得に失敗しました");
        return;
      }

      if (!userData) {
        setSubmitError("ユーザー情報が見つかりません");
        return;
      }

      const request: CreatePlanEventRequest = {
        title: data.title,
        description: data.description,
        deadline: data.deadline,
        dates: selectedDateTimes.map((dt) => ({
          date: dt.date.format("YYYY-MM-DD"),
          time: dt.time,
        })),
        createdBy: userData.emp_no,
      };

      console.log("Creating plan with data:", request);

      const response = await createPlanEvent(request);

      console.log("Plan creation response:", response);

      if (response.success) {
        router.push("/plans/planMainPage");
      } else {
        setSubmitError(response.message || "エラーが発生しました");
      }
    } catch (error) {
      console.error("Error submitting plan:", error);
      setSubmitError("予定の作成に失敗しました");
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
      <Box
        className="plan-new-event"
        sx={{
          minHeight: "100vh",
          color: "#FCFCFC",
          pb: "84px",
          position: "relative",
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{
            p: 1.5,
            maxWidth: "600px",
            mx: "auto",
            mb: 2.5,
          }}
        >
          {submitError && (
            <FormField.Error className="plan-new-event__error">
              {submitError}
            </FormField.Error>
          )}

          <Box
            sx={{
              p: 1.5,
              mb: 2,
              bgcolor: "#2D2D2D",
              borderRadius: "8px",
            }}
          >
            <PlanEventForm control={control} />

            <DateTimeSelector
              selectedDateTimes={selectedDateTimes}
              onDateTimeSelect={setSelectedDateTimes}
              timeOptions={timeOptions}
            />
          </Box>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            className="plan-new-event__submit"
            disabled={selectedDateTimes.length === 0}
            sx={{
              bgcolor: "#5b63d3",
              color: "#FCFCFC",
              py: 1,
              fontSize: "0.875rem",
              fontWeight: "bold",
              "&:hover": {
                bgcolor: "#4850c9",
              },
              "&.Mui-disabled": {
                bgcolor: "rgba(91, 99, 211, 0.3)",
                color: "rgba(255, 255, 255, 0.3)",
              },
            }}
          >
            作成する
          </Button>
        </Box>
        <FooterMenu />
      </Box>
    </LocalizationProvider>
  );
};

export default PlanNewEventPage;

// バリデーション用の関数
function validatePlanEventRequest(req: CreatePlanEventRequest): string | null {
  if (!req.title.trim()) {
    return "タイトルは必須です";
  }

  if (!req.deadline) {
    return "締切日時は必須です";
  }

  if (!dayjs(req.deadline).isValid()) {
    return "不正な締切日時です";
  }

  if (!req.dates.length) {
    return "候補日時を少なくとも1つ選択してください";
  }

  for (const date of req.dates) {
    if (!dayjs(`${date.date} ${date.time}`).isValid()) {
      return "不正な日時が含まれています";
    }
  }

  if (!req.createdBy || req.createdBy <= 0) {
    return "不正なユーザー情報です";
  }

  return null;
}

// API関数
export async function createPlanEvent(
  req: CreatePlanEventRequest
): Promise<CreatePlanEventResponse> {
  // バリデーション
  const validationError = validatePlanEventRequest(req);
  if (validationError) {
    return {
      planId: 0,
      success: false,
      message: validationError,
    };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { data, error } = await supabase.rpc("create_plan_event", {
      p_title: req.title,
      p_description: req.description || "",
      p_deadline: req.deadline,
      p_created_by: req.createdBy,
      p_dates: req.dates.map((d) => ({
        datetime: `${d.date} ${d.time}`,
      })),
    });

    if (error) throw error;

    if (!data.success) {
      return {
        planId: 0,
        success: false,
        message: data.message || "イベントの作成に失敗しました",
      };
    }

    return {
      planId: data.plan_id,
      success: true,
    };
  } catch (error) {
    console.error("Error creating plan event:", error);
    return {
      planId: 0,
      success: false,
      message: "イベントの作成に失敗しました",
    };
  }
}
