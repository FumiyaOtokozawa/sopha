import { Dayjs } from "dayjs";

export interface DateTimeSelection {
  id: string;
  date: Dayjs;
  time: string;
}

export interface PlanFormData {
  title: string;
  description: string;
  deadline: string;
}

export interface CreatePlanEventRequest {
  title: string;
  description?: string;
  deadline: string;
  dates: {
    date: string; // ISO 8601形式 (YYYY-MM-DD)
    time: string; // 24時間形式 (HH:mm)
  }[];
  createdBy: number; // emp_no
}

export interface CreatePlanEventResponse {
  planId: number;
  success: boolean;
  message?: string;
}
