import { SupabaseClient } from '@supabase/supabase-js';
import { isConfirmationAllowed } from '../pages/events/eventDetailPage';

interface Event {
  title: string;
  genre: string;
  start_date: string;
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export const handleAttendanceConfirmation = async (
  supabase: SupabaseClient,
  eventId: string | string[] | undefined,
  event: Event | null,
  currentUserEmpNo: number | null
): Promise<{ success: boolean; message?: string }> => {
  try {
    console.log('出席確定処理開始');

    // イベントの開始時刻をチェック
    if (!event?.start_date) {
      return {
        success: false,
        message: 'イベントの開始日時が設定されていません'
      };
    }

    console.log('イベント開始日時:', event.start_date);

    // 出席確定可能かチェック
    const validationResult = isConfirmationAllowed(event.start_date);
    if (!validationResult.isValid) {
      return {
        success: false,
        message: validationResult.message
      };
    }

    // 出席者（status=1）のみを取得
    const { data: attendees, error: attendeesError } = await supabase
      .from('EVENT_TEMP_ENTRY')
      .select('emp_no, status')
      .eq('event_id', eventId)
      .eq('status', '1');

    if (attendeesError) throw attendeesError;
    console.log('取得した参加者データ:', attendees);

    // 出席予定者がいない場合は警告を返す
    if (!attendees?.length) {
      return {
        success: false,
        message: '出席予定者がいません'
      };
    }

    // 出席者のみを抽出
    const presentAttendees = attendees?.map(a => a.emp_no) || [];
    console.log('出席者:', presentAttendees);

    // 1. EVENT_PAR_HISTORYの最新history_id取得
    const { data: maxHistoryId, error: maxHistoryError } = await supabase
      .from('EVENT_PAR_HISTORY')
      .select('history_id')
      .order('history_id', { ascending: false })
      .limit(1)
      .single();

    if (maxHistoryError && maxHistoryError.code !== 'PGRST116') throw maxHistoryError;
    const nextHistoryId = (maxHistoryId?.history_id || 0) + 1;
    console.log('次のhistory_id:', nextHistoryId);

    // 出席履歴の追加
    const { error: historyError } = await supabase
      .from('EVENT_PAR_HISTORY')
      .insert(
        presentAttendees.map((emp_no, index) => ({
          history_id: nextHistoryId + index,
          emp_no: emp_no,
          event_id: Number(eventId),
          participated_at: new Date().toISOString().split('T')[0]
        }))
      );

    if (historyError) throw historyError;
    console.log('出席履歴追加完了');

    // 2. EMP_CIZ_HISTORYの最新history_id取得
    const { data: maxCizHistoryId, error: maxCizHistoryError } = await supabase
      .from('EMP_CIZ_HISTORY')
      .select('history_id')
      .order('history_id', { ascending: false })
      .limit(1)
      .single();

    if (maxCizHistoryError && maxCizHistoryError.code !== 'PGRST116') throw maxCizHistoryError;
    const nextCizHistoryId = (maxCizHistoryId?.history_id || 0) + 1;
    console.log('次のCIZ履歴ID:', nextCizHistoryId);

    // CIZポイントの履歴追加
    const { error: cizHistoryError } = await supabase
      .from('EMP_CIZ_HISTORY')
      .insert(
        presentAttendees.map((emp_no, index) => ({
          history_id: nextCizHistoryId + index,
          emp_no: emp_no,
          change_type: 'add',
          ciz: 1000,
          event_id: Number(eventId),
          reason: `${event?.title} 出席ポイント`,
          created_at: new Date().toISOString(),
          created_by: currentUserEmpNo?.toString()
        }))
      );

    if (cizHistoryError) throw cizHistoryError;
    console.log('CIZポイント履歴追加完了');

    // 参加カウントの更新
    console.log('参加カウント更新開始');
    for (const emp_no of presentAttendees) {
      const { data: currentCount, error: countError } = await supabase
        .from('EVENT_PARTICIPATION')
        .select('official_count, unofficial_count')
        .eq('emp_no', emp_no)
        .single();

      if (countError && countError.code !== 'PGRST116') throw countError;

      const isOfficialEvent = event?.genre === '1';
      console.log(`イベント種別: ${isOfficialEvent ? '公式' : '非公式'}`);

      if (currentCount) {
        // 既存レコードの更新
        const { error: updateCountError } = await supabase
          .from('EVENT_PARTICIPATION')
          .update({
            official_count: isOfficialEvent 
              ? (currentCount.official_count || 0) + 1 
              : currentCount.official_count,
            unofficial_count: !isOfficialEvent 
              ? (currentCount.unofficial_count || 0) + 1 
              : currentCount.unofficial_count,
            updated_at: new Date().toISOString().split('T')[0]
          })
          .eq('emp_no', emp_no);

        if (updateCountError) throw updateCountError;
        console.log(`社員番号 ${emp_no} の参加カウント更新完了`);
      } else {
        // 新規レコードの作成
        const { error: insertCountError } = await supabase
          .from('EVENT_PARTICIPATION')
          .insert({
            emp_no: emp_no,
            official_count: isOfficialEvent ? 1 : 0,
            unofficial_count: !isOfficialEvent ? 1 : 0,
            updated_at: new Date().toISOString().split('T')[0]
          });

        if (insertCountError) throw insertCountError;
        console.log(`社員番号 ${emp_no} の参加カウント新規作成完了`);
      }
    }
    console.log('参加カウント更新完了');

    // CIZポイントの更新
    console.log('CIZポイント更新開始');
    for (const emp_no of presentAttendees) {
      const { data: currentCiz, error: cizError } = await supabase
        .from('EMP_CIZ')
        .select('total_ciz')
        .eq('emp_no', emp_no)
        .single();

      if (cizError && cizError.code !== 'PGRST116') throw cizError;
      console.log(`社員番号 ${emp_no} の現在のCIZ:`, currentCiz?.total_ciz);

      if (currentCiz) {
        // 既存レコードの更新
        const { error: updateCizError } = await supabase
          .from('EMP_CIZ')
          .update({
            total_ciz: (currentCiz.total_ciz || 0) + 1000,
            updated_at: new Date().toISOString(),
            updated_by: currentUserEmpNo?.toString()
          })
          .eq('emp_no', emp_no);

        if (updateCizError) throw updateCizError;
        console.log(`社員番号 ${emp_no} のCIZ更新完了`);
      } else {
        // 新規レコードの作成
        const { error: insertCizError } = await supabase
          .from('EMP_CIZ')
          .insert({
            emp_no: emp_no,
            total_ciz: 1000,
            updated_at: new Date().toISOString(),
            updated_by: currentUserEmpNo?.toString()
          });

        if (insertCizError) throw insertCizError;
        console.log(`社員番号 ${emp_no} のCIZ新規作成完了`);
      }
    }
    console.log('CIZポイント更新完了');

    // 出席者のステータスを11に更新
    if (presentAttendees.length > 0) {
      console.log('出席者のステータス更新開始');
      const { error: updatePresentError } = await supabase
        .from('EVENT_TEMP_ENTRY')
        .update({ status: '11', updated_at: new Date().toISOString() })
        .eq('event_id', eventId)
        .in('emp_no', presentAttendees);

      if (updatePresentError) throw updatePresentError;
      console.log('出席者のステータス更新完了');
    }

    console.log('全ての処理が完了しました');

    return { success: true, message: '出席を確定しました' };

  } catch (error) {
    console.error('出席確定処理エラー:', error);
    return {
      success: false,
      message: '出席確定処理に失敗しました'
    };
  }
}; 