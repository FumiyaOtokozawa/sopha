import { SupabaseClient } from "@supabase/supabase-js";
import { isConfirmationAllowed } from "../pages/events/eventDetailPage";

interface Event {
  title: string;
  genre: string;
  start_date: string;
  end_date?: string;
  venue_id?: number;
  format: "hybrid" | "online" | "offline";
}

// 2点間の距離を計算する関数（ヘイバーサイン公式）
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // 地球の半径（メートル）
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // メートル単位での距離
};

// JSTの現在時刻を取得するユーティリティ関数
const getCurrentJSTISOString = () => {
  const now = new Date();
  const jstOffset = 9 * 60; // JSTは+9時間
  const jstDate = new Date(now.getTime() + jstOffset * 60 * 1000);
  return jstDate.toISOString();
};

export const handleAttendanceConfirmation = async (
  supabase: SupabaseClient,
  eventId: string | string[] | undefined,
  event: Event | null,
  currentUserEmpNo: number | null,
  currentPosition: GeolocationPosition | null,
  attendanceFormat?: "online" | "offline" | "admin"
): Promise<{ success: boolean; message?: string }> => {
  try {
    console.log("出席確定処理開始");

    // イベントの開始時刻をチェック
    if (!event?.start_date) {
      return {
        success: false,
        message: "イベントの開始日時が設定されていません",
      };
    }

    console.log("イベント開始日時:", event.start_date);

    // 出席確定可能かチェック
    const validationResult = isConfirmationAllowed(event.start_date);
    if (!validationResult.isValid) {
      return {
        success: false,
        message: validationResult.message,
      };
    }

    // 管理者による一括確定の場合は位置情報チェックをスキップ
    const isAdminConfirmation = attendanceFormat === "admin";

    // オンライン出席または管理者による確定の場合は位置情報チェックをスキップ
    const skipLocationCheck =
      event.format === "online" ||
      (event.format === "hybrid" && attendanceFormat === "online") ||
      isAdminConfirmation;

    if (!skipLocationCheck) {
      // 既存の位置情報チェックロジック
      if (!currentPosition) {
        return {
          success: false,
          message: "位置情報が取得できませんでした",
        };
      }

      if (!event.venue_id) {
        return {
          success: false,
          message: "イベント会場が設定されていません",
        };
      }

      // イベント会場の位置情報を取得
      const { data: venueData, error: venueError } = await supabase
        .from("EVENT_VENUE")
        .select("latitude, longitude, venue_nm")
        .eq("venue_id", event.venue_id)
        .single();

      if (venueError) {
        console.error("会場情報の取得に失敗:", venueError);
        return {
          success: false,
          message: "会場情報の取得に失敗しました",
        };
      }

      // イベントの許容半径を取得
      const { data: eventData, error: eventError } = await supabase
        .from("EVENT_LIST")
        .select("venue_radius")
        .eq("event_id", eventId)
        .single();

      if (eventError) {
        console.error("イベント情報の取得に失敗:", eventError);
        return {
          success: false,
          message: "イベント情報の取得に失敗しました",
        };
      }

      const allowedRadius = eventData?.venue_radius ?? 100; // NULLの場合は100mをデフォルト値として使用

      console.log("イベント会場の位置情報:", {
        venue_name: venueData.venue_nm,
        latitude: venueData.latitude,
        longitude: venueData.longitude,
        allowed_radius: allowedRadius,
      });

      // 位置情報チェック
      const distance = calculateDistance(
        currentPosition.coords.latitude,
        currentPosition.coords.longitude,
        venueData.latitude,
        venueData.longitude
      );

      console.log("位置情報の計算結果:", {
        distance: Math.round(distance),
        allowedRadius,
        isWithinRange: distance <= allowedRadius,
        currentPosition: {
          latitude: currentPosition.coords.latitude,
          longitude: currentPosition.coords.longitude,
        },
      });

      if (distance > allowedRadius) {
        return {
          success: false,
          message: `イベント会場から離れすぎています（${allowedRadius}m以内に近づいてください）`,
        };
      }
    } else {
      console.log("位置情報チェックをスキップします");
    }

    // イベント開催期間チェック（管理者による一括確定の場合はスキップ）
    if (!isAdminConfirmation) {
      const now = new Date();
      const jstOffset = 9 * 60;
      const nowJST = new Date(now.getTime() + jstOffset * 60 * 1000);

      console.log("イベント開催時間の詳細:", {
        開始時刻_生データ: event?.start_date,
        終了時刻_生データ: event?.end_date,
        現在時刻_UTC: now.toISOString(),
        現在時刻_JST: nowJST.toISOString(),
      });

      // 文字列から日付を作成する際にタイムゾーンを考慮
      const parseJSTDate = (dateString: string | undefined) => {
        if (!dateString) {
          throw new Error("日時が設定されていません");
        }

        try {
          let date: Date;
          if (dateString.includes("T")) {
            // ISO形式の場合、UTCとして解釈されるのでJSTに変換
            const utcDate = new Date(dateString);
            date = new Date(utcDate.getTime() + jstOffset * 60 * 1000);
          } else {
            // スラッシュ形式の場合、既にJSTとして解釈
            const [datePart, timePart] = dateString.split(" ");
            const [year, month, day] = datePart.split("/").map(Number);
            const [hours, minutes, seconds] = timePart.split(":").map(Number);
            date = new Date(year, month - 1, day, hours, minutes, seconds);
          }

          if (isNaN(date.getTime())) {
            throw new Error("不正な日時形式です");
          }

          console.log("日時パース結果:", {
            入力: dateString,
            パース後_ISO: date.toISOString(),
            パース後_JST: date.toLocaleString("ja-JP", {
              timeZone: "Asia/Tokyo",
            }),
          });

          return date;
        } catch (error) {
          throw new Error(
            `日時のパースに失敗しました: ${dateString} (${error})`
          );
        }
      };

      try {
        const eventStartJST = parseJSTDate(event?.start_date);
        const eventEndJST = parseJSTDate(event?.end_date);

        console.log("時間チェック:", {
          現在時刻: nowJST.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
          開始時刻: eventStartJST.toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
          }),
          終了時刻: eventEndJST.toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
          }),
          開始時刻より後か: nowJST >= eventStartJST,
          終了時刻より前か: nowJST <= eventEndJST,
        });

        if (nowJST < eventStartJST || nowJST > eventEndJST) {
          return {
            success: false,
            message: "イベントの開催時間外です",
          };
        }
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "イベントの日時情報が不正です",
        };
      }
    }

    // 出席者（status=1）のみを取得
    const { data: attendees, error: attendeesError } = await supabase
      .from("EVENT_TEMP_ENTRY")
      .select("emp_no, status")
      .eq("event_id", eventId)
      .eq("status", "1");

    if (attendeesError) throw attendeesError;
    console.log("取得した参加者データ:", attendees);

    // 出席予定者がいない場合は警告を返す
    if (!attendees?.length) {
      return {
        success: false,
        message: "出席予定者がいません",
      };
    }

    // 出席者のみを抽出
    const presentAttendees = [currentUserEmpNo]; // 修正：本出席処理を行った人のみを対象とする
    console.log("出席者:", presentAttendees);

    // 1. EVENT_PAR_HISTORYの最新history_id取得
    const { data: maxHistoryId, error: maxHistoryError } = await supabase
      .from("EVENT_PAR_HISTORY")
      .select("history_id")
      .order("history_id", { ascending: false })
      .limit(1)
      .single();

    if (maxHistoryError && maxHistoryError.code !== "PGRST116")
      throw maxHistoryError;
    const nextHistoryId = (maxHistoryId?.history_id || 0) + 1;
    console.log("次のhistory_id:", nextHistoryId);

    // 2. EVENT_PAR_HISTORYに出席履歴を追加（出席形式を含む）
    const { error: historyError } = await supabase
      .from("EVENT_PAR_HISTORY")
      .insert({
        history_id: nextHistoryId,
        event_id: eventId,
        emp_no: currentUserEmpNo,
        participated_at: getCurrentJSTISOString(),
        format: isAdminConfirmation
          ? "admin"
          : skipLocationCheck
          ? "online"
          : "offline", // formatの設定を修正
      });

    if (historyError) throw historyError;
    console.log("出席履歴追加完了");

    // 3. EVENT_TEMP_ENTRYのステータスを更新
    const { error: updateError } = await supabase
      .from("EVENT_TEMP_ENTRY")
      .update({
        status: "11",
        updated_at: getCurrentJSTISOString(),
        format: isAdminConfirmation
          ? "admin"
          : skipLocationCheck
          ? "online"
          : "offline", // formatの設定を修正
      })
      .eq("event_id", eventId)
      .eq("emp_no", currentUserEmpNo);

    if (updateError) throw updateError;
    console.log("出席者のステータス更新完了");

    // 参加カウントの更新
    console.log("参加カウント更新開始");
    for (const emp_no of presentAttendees) {
      const { data: currentCount, error: countError } = await supabase
        .from("EVENT_PARTICIPATION")
        .select("official_count, unofficial_count")
        .eq("emp_no", emp_no)
        .single();

      if (countError && countError.code !== "PGRST116") throw countError;

      const isOfficialEvent = event?.genre === "1";
      console.log(`イベント種別: ${isOfficialEvent ? "公式" : "有志"}`);

      if (currentCount) {
        // 既存レコードの更新
        const { error: updateCountError } = await supabase
          .from("EVENT_PARTICIPATION")
          .update({
            official_count: isOfficialEvent
              ? (currentCount.official_count || 0) + 1
              : currentCount.official_count,
            unofficial_count: !isOfficialEvent
              ? (currentCount.unofficial_count || 0) + 1
              : currentCount.unofficial_count,
            updated_at: getCurrentJSTISOString(), // 日付のみから時間も含む形式に変更
          })
          .eq("emp_no", emp_no);

        if (updateCountError) throw updateCountError;
        console.log(`社員番号 ${emp_no} の参加カウント更新完了`);
      } else {
        // 新規レコードの作成
        const { error: insertCountError } = await supabase
          .from("EVENT_PARTICIPATION")
          .insert({
            emp_no: emp_no,
            official_count: isOfficialEvent ? 1 : 0,
            unofficial_count: !isOfficialEvent ? 1 : 0,
            updated_at: getCurrentJSTISOString(), // 日付のみから時間も含む形式に変更
          });

        if (insertCountError) throw insertCountError;
        console.log(`社員番号 ${emp_no} の参加カウント新規作成完了`);
      }
    }
    console.log("参加カウント更新完了");

    // CIZポイントの更新
    console.log("CIZポイント更新開始");
    for (const emp_no of presentAttendees) {
      const { data: currentCiz, error: cizError } = await supabase
        .from("EMP_CIZ")
        .select("total_ciz")
        .eq("emp_no", emp_no)
        .single();

      if (cizError && cizError.code !== "PGRST116") throw cizError;
      console.log(`社員番号 ${emp_no} の現在のCIZ:`, currentCiz?.total_ciz);

      if (currentCiz) {
        // 既存レコードの更新
        const { error: updateCizError } = await supabase
          .from("EMP_CIZ")
          .update({
            total_ciz: (currentCiz.total_ciz || 0) + 1000,
            updated_at: getCurrentJSTISOString(),
            updated_by: currentUserEmpNo?.toString(),
          })
          .eq("emp_no", emp_no);

        if (updateCizError) throw updateCizError;
        console.log(`社員番号 ${emp_no} のCIZ更新完了`);
      } else {
        // 新規レコードの作成
        const { error: insertCizError } = await supabase
          .from("EMP_CIZ")
          .insert({
            emp_no: emp_no,
            total_ciz: 1000,
            updated_at: getCurrentJSTISOString(),
            updated_by: currentUserEmpNo?.toString(),
          });

        if (insertCizError) throw insertCizError;
        console.log(`社員番号 ${emp_no} のCIZ新規作成完了`);
      }

      // CIZポイント履歴の追加
      const { data: maxCizHistoryId, error: maxCizHistoryError } =
        await supabase
          .from("EMP_CIZ_HISTORY")
          .select("history_id")
          .order("history_id", { ascending: false })
          .limit(1)
          .single();

      if (maxCizHistoryError && maxCizHistoryError.code !== "PGRST116")
        throw maxCizHistoryError;
      const nextCizHistoryId = (maxCizHistoryId?.history_id || 0) + 1;

      const { error: cizHistoryError } = await supabase
        .from("EMP_CIZ_HISTORY")
        .insert({
          history_id: nextCizHistoryId,
          emp_no: emp_no,
          change_type: "add",
          ciz: 1000,
          event_id: Number(eventId),
          reason: `${event?.title} 出席ポイント`,
          created_at: getCurrentJSTISOString(), // timestamp without time zone型なので、時間も含めて保存
          created_by: currentUserEmpNo?.toString(),
        });

      if (cizHistoryError) throw cizHistoryError;
      console.log(`社員番号 ${emp_no} のCIZポイント履歴追加完了`);
    }
    console.log("CIZポイント更新完了");

    console.log("全ての処理が完了しました");

    return {
      success: true,
      message: isAdminConfirmation
        ? "本出席を確定しました"
        : skipLocationCheck
        ? "オンラインで出席を確定しました"
        : "出席を確定しました",
    };
  } catch (error) {
    console.error("出席確定処理エラー:", error);
    return {
      success: false,
      message: "出席確定処理に失敗しました",
    };
  }
};
