import { Box, Typography } from "@mui/material";
import { Controller, Control } from "react-hook-form";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ja } from "date-fns/locale";
import { PlanFormData } from "../../types/plan";
import { ReactNode } from "react";

interface BaseFieldProps {
  className?: string;
  required?: boolean;
}

interface PlanEventFormProps {
  control: Control<PlanFormData>;
}

export const FormField = {
  Container: ({
    children,
    className = "",
    ...props
  }: BaseFieldProps & { children: ReactNode }) => (
    <Box
      className={`plan-event-form__field ${className}`}
      sx={{ mb: 1.5 }}
      {...props}
    >
      {children}
    </Box>
  ),

  Label: ({
    children,
    required,
    className = "",
    ...props
  }: BaseFieldProps & { children: ReactNode }) => (
    <Typography
      component="label"
      className={`plan-event-form__label ${className}`}
      sx={{
        display: "block",
        fontSize: "0.75rem",
        fontWeight: "medium",
        mb: 1,
        color: "#ACACAC",
      }}
      {...props}
    >
      {children}
      {required && (
        <Box
          component="span"
          className="plan-event-form__required"
          sx={{ color: "#f43f5e", ml: 0.5 }}
        >
          *
        </Box>
      )}
    </Typography>
  ),

  Input: ({
    className = "",
    ...props
  }: BaseFieldProps & React.InputHTMLAttributes<HTMLInputElement>) => (
    <Box
      component="input"
      className={`plan-event-form__input ${className}`}
      sx={{
        width: "100%",
        bgcolor: "#1D1D21",
        borderRadius: 1,
        p: 2,
        color: "#FCFCFC",
        height: "40px",
        border: "none",
        outline: "none",
        fontSize: "0.875rem",
      }}
      {...props}
    />
  ),

  Textarea: ({
    className = "",
    ...props
  }: BaseFieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <Box
      component="textarea"
      className={`plan-event-form__textarea ${className}`}
      sx={{
        width: "100%",
        bgcolor: "#1D1D21",
        borderRadius: 1,
        p: 2,
        minHeight: "96px",
        color: "#FCFCFC",
        resize: "none",
        border: "none",
        outline: "none",
        fontSize: "0.875rem",
        overflow: "hidden",
      }}
      onInput={(e) => {
        const target = e.target as HTMLTextAreaElement;
        target.style.height = "96px";
        target.style.height = `${target.scrollHeight}px`;
      }}
      {...props}
    />
  ),

  Error: ({
    children,
    className = "",
    ...props
  }: BaseFieldProps & { children: ReactNode }) => (
    <Typography
      className={`plan-event-form__error ${className}`}
      sx={{
        color: "#f43f5e",
        fontSize: "0.875rem",
        mt: 1,
      }}
      {...props}
    >
      {children}
    </Typography>
  ),
};

export const PlanEventForm: React.FC<PlanEventFormProps> = ({ control }) => {
  return (
    <Box
      className="plan-event-form"
      sx={{
        maxWidth: "600px",
        mx: "auto",
      }}
    >
      <Controller
        name="title"
        control={control}
        rules={{ required: "タイトルは必須です" }}
        render={({ field, fieldState }) => (
          <FormField.Container>
            <FormField.Label required>タイトル</FormField.Label>
            <FormField.Input {...field} type="text" />
            {fieldState.error && (
              <FormField.Error>{fieldState.error.message}</FormField.Error>
            )}
          </FormField.Container>
        )}
      />

      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <FormField.Container>
            <FormField.Label>備考</FormField.Label>
            <FormField.Textarea {...field} />
          </FormField.Container>
        )}
      />

      <Controller
        name="deadline"
        control={control}
        rules={{
          required: "締切日時は必須です",
          validate: (value) => {
            if (!value) return true;
            const now = new Date();
            const selectedDate = new Date(value);
            return selectedDate > now || "過去の日時は選択できません";
          },
        }}
        render={({ field, fieldState }) => (
          <FormField.Container>
            <FormField.Label required>締切日時</FormField.Label>
            <LocalizationProvider
              dateAdapter={AdapterDateFns}
              adapterLocale={ja}
            >
              <DateTimePicker
                value={field.value ? new Date(field.value) : null}
                onChange={(date) => {
                  if (date) {
                    // JSTの日時をそのまま保存するように調整
                    const jstDate = new Date(
                      date.getTime() - date.getTimezoneOffset() * 60000
                    );
                    field.onChange(jstDate.toISOString());
                  } else {
                    field.onChange(null);
                  }
                }}
                minDateTime={new Date()} // 現在時刻より前を選択不可に
                className="plan-event-form__datetime-picker"
                sx={{
                  width: "100%",
                  "& .MuiInputBase-root": {
                    backgroundColor: "#1D1D21",
                    color: "#FCFCFC",
                    height: "40px",
                    fontSize: "0.875rem",
                    border: "none",
                    outline: "none",
                  },
                  "& .MuiInputBase-input": {
                    padding: "8px 8px",
                    height: "24px",
                    "&::placeholder": {
                      color: "#6B7280",
                      opacity: 1,
                      fontSize: "0.875rem",
                    },
                  },
                  "& .MuiSvgIcon-root": {
                    color: "#FCFCFC",
                    fontSize: "20px",
                  },
                }}
              />
            </LocalizationProvider>
            {fieldState.error && (
              <FormField.Error>{fieldState.error.message}</FormField.Error>
            )}
          </FormField.Container>
        )}
      />
    </Box>
  );
};
