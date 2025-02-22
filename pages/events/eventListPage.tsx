import { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, ToolbarProps } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { ja } from 'date-fns/locale';
import { supabase } from '../../utils/supabaseClient';
import Header from '../../components/Header';
import React from 'react';
import { useRouter } from 'next/router';
import { Box } from '@mui/material';
import FooterMenu from '../../components/FooterMenu';
import AddBoxIcon from '@mui/icons-material/AddBox';
import EventDetailModal from '../../components/EventDetailModal';

// カレンダーのローカライズ設定
const locales = {
  'ja': ja,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// 月の英語表記を定義
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// カスタムツールバーコンポーネントの型を修正
const CustomToolbar = ({ onNavigate, date }: ToolbarProps<Event>) => {
  const goToBack = () => {
    onNavigate('PREV');
  };

  const goToNext = () => {
    onNavigate('NEXT');
  };

  const goToCurrent = () => {
    onNavigate('TODAY');
  };

  const label = () => {
    return monthNames[date.getMonth()];
  };

  return (
    <div className="rbc-toolbar">
      <span className="rbc-btn-group">
        <button type="button" onClick={goToBack}>
          前月
        </button>
        <button type="button" onClick={goToCurrent}>
          今日
        </button>
        <button type="button" onClick={goToNext}>
          翌月
        </button>
      </span>
      <span className="rbc-toolbar-label">{label()}</span>
    </div>
  );
};

// カスタムイベントコンポーネントの型定義を追加
interface CustomEventProps {
  event: Event;
}

const CustomEvent = React.memo(function CustomEvent({ event }: CustomEventProps) {
  return (
    <div className="text-sm truncate">
      {event.abbreviation || event.title}
    </div>
  );
});

// Event型の更新
interface Event {
  event_id: number;
  title: string;
  abbreviation: string;
  start_date: string;
  end_date: string;
  start: Date;
  end: Date;
  place: string;
  owner: string;
  ownerName: string;
  genre: string;
  description?: string;
  repeat_id?: number | null;
}

export default function EventListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [showAllEvents, setShowAllEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const eventStyleGetter = React.useCallback((event: Event) => ({
    className: `calendar-event ${event.genre === '1' ? 'official-event' : 'normal-event'}`
  }), []);

  const fetchEvents = useCallback(async () => {
    // 表示月の月初めと1年後の月末を計算
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfNextYear = new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 0, 23, 59, 59);

    // Supabaseからイベントデータを取得
    const { data: eventData, error: eventError } = await supabase
      .from('EVENT_LIST')
      .select('*')
      .eq('act_kbn', true)
      .gte('start_date', startOfMonth.toISOString())
      .lte('start_date', endOfNextYear.toISOString());  // 1年後までの期間に変更

    if (eventError) {
      console.error('イベントの取得に失敗しました:', eventError);
      return;
    }

    // ユーザー情報の一括取得
    const uniqueOwners = [...new Set(eventData.map(event => event.owner))];
    const { data: userData } = await supabase
      .from('USER_INFO')
      .select('emp_no, myoji, namae')
      .in('emp_no', uniqueOwners);

    // ユーザー情報をマップ化
    const userMap = new Map(
      userData?.map(user => [user.emp_no, `${user.myoji} ${user.namae}`])
    );

    const formattedEvents = eventData.map(event => ({
      event_id: event.event_id,
      title: event.title,
      abbreviation: event.abbreviation,
      start_date: event.start_date,
      end_date: event.end_date,
      start: new Date(event.start_date),
      end: new Date(event.end_date),
      place: event.place,
      owner: event.owner,
      ownerName: userMap.get(event.owner) || '未設定',
      genre: event.genre,
      description: event.description,
      repeat_id: event.repeat_id
    }));

    setEvents(formattedEvents);
  }, [currentMonth]);

  useEffect(() => {
    fetchEvents();
  }, [currentMonth, fetchEvents]);

  // 月が変更されたときにイベントを再取得
  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
  };

  // イベントをクリックした時の処理を修正
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  // モーダルを閉じる処理
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  // イベント更新後の処理
  const handleEventUpdated = () => {
    fetchEvents(); // イベント一覧を再取得
  };

  // 繰り返しイベントをフィルタリングする関数を改善
  const filterRepeatingEvents = (events: Event[]) => {
    // 前日の23:59:59を計算
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59);
    
    // 前日23:59:59以降のイベントをフィルタリング
    const futureEvents = events.filter(event => event.start > yesterday);
    
    if (showAllEvents) return futureEvents;

    // repeat_idを使用してグループ化
    const eventGroups = futureEvents.reduce((groups, event) => {
      const groupKey = event.repeat_id ? `repeat_${event.repeat_id}` : `single_${event.event_id}`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(event);
      return groups;
    }, {} as { [key: string]: Event[] });

    return Object.values(eventGroups).map(group => {
      if (group.length === 1) return group[0];
      // 同じrepeat_idを持つイベントの中で最も近い日付のものを返す
      return group.reduce((nearest, event) => {
        if (!nearest || event.start < nearest.start) return event;
        return nearest;
      });
    });
  };

  // EventListコンポーネントの表示を改善
  const EventList = () => (
    <div className="bg-[#2d2d33] rounded-lg p-4">
      <div className="mb-4 flex justify-end">
        <button
          className={`px-4 py-1 rounded-md transition-colors text-sm flex items-center gap-2 ${
            !showAllEvents ? 'bg-[#5b63d3] text-white' : 'bg-[#37373F] text-gray-400 hover:text-white'
          }`}
          onClick={() => setShowAllEvents(!showAllEvents)}
        >
          <span>繰り返しイベントを非表示</span>
          <div className={`w-3.5 h-3.5 rounded-full ${!showAllEvents ? 'bg-white' : 'bg-gray-600'}`} />
        </button>
      </div>
      {filterRepeatingEvents(events.sort((a, b) => a.start.getTime() - b.start.getTime()))
        .map((event) => (
          <div
            key={event.event_id}
            className="mb-4 p-4 bg-[#37373F] rounded-lg cursor-pointer hover:bg-[#404049] transition-colors"
            onClick={() => handleEventClick(event)}
          >
            <div className="text-lg font-medium mb-2 flex items-center gap-2">
              {event.genre === '1' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#8E93DA]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {event.title}
              {event.repeat_id && (
                <span className="ml-2 text-sm text-gray-400">（繰り返し）</span>
              )}
            </div>
            <div className="text-sm text-gray-400">
              <div>場　所：{event.place || '未定'}</div>
              <div>主催者：{event.ownerName}</div>
              <div>日　時：
                {format(event.start, 'M月d日 HH:mm', { locale: ja })} - 
                {format(event.end, ' M月d日 HH:mm', { locale: ja })}
              </div>
            </div>
          </div>
        ))}
    </div>
  );

  return (
    <Box sx={{ pb: 7 }}>
      <div>
        <Header />
        <div className="p-4">
          <div className="mb-4">
            <button
              onClick={() => router.push('/events/eventAddPage')}
              className="w-full py-2 rounded bg-[#5b63d3] text-white font-bold hover:bg-opacity-80 flex items-center justify-center gap-2"
            >
              <AddBoxIcon />
              イベント追加
            </button>
          </div>

          <div className="bg-[#2d2d33] rounded-lg p-2 flex gap-2 mb-4">
            <button
              className={`flex-1 py-2 rounded-md transition-colors ${
                view === 'calendar' ? 'bg-[#5b63d3] text-white' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setView('calendar')}
            >
              カレンダー
            </button>
            <button
              className={`flex-1 py-2 rounded-md transition-colors ${
                view === 'list' ? 'bg-[#5b63d3] text-white' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setView('list')}
            >
              予定リスト
            </button>
          </div>
          <div style={{ 
            height: '67.5vh',  // 画面の高さの75%を使用
            overflow: 'auto',
            maxHeight: 'calc(100vh - 12rem)'  // 最大高さを設定（ヘッダー・フッター分を考慮）
          }}>
            {view === 'calendar' ? (
              <Calendar<Event>
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                culture='ja'
                onSelectEvent={handleEventClick}
                defaultView="month"
                views={['month']}
                onNavigate={handleMonthChange}
                components={{
                  toolbar: CustomToolbar,
                  event: CustomEvent  // メモ化したコンポーネントを使用
                }}
                eventPropGetter={eventStyleGetter}
                messages={{
                  date: '日付',
                  time: '時間',
                  event: 'イベント',
                  allDay: '終日',
                  week: '週',
                  day: '日',
                  month: '月',
                  previous: '前へ',
                  next: '次へ',
                  today: '今日',
                  showMore: total => `他 ${total} 件`
                }}
                className="custom-calendar"
              />
            ) : (
              <EventList />
            )}
          </div>
        </div>
      </div>
      <FooterMenu />
      
      <EventDetailModal
        event={selectedEvent}
        open={isModalOpen}
        onClose={handleCloseModal}
        onEventUpdated={handleEventUpdated}
      />
    </Box>
  );
} 