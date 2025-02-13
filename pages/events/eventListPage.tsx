import { useState, useEffect } from 'react';
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
import { Event } from '../../types/event';  // 追加

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

export default function EventListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [showAllEvents, setShowAllEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchEvents = async () => {
    // 現在の月の開始日と終了日を計算
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

    const { data: eventData, error: eventError } = await supabase
      .from('EVENT_LIST')
      .select('*')
      .eq('act_kbn', true)
      // 日付でフィルタリング
      .gte('start_date', startOfMonth.toISOString())
      .lte('start_date', endOfMonth.toISOString());

    if (eventError) {
      console.error('イベントの取得に失敗しました:', eventError);
      return;
    }

    // ユーザー情報を一括で取得
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
      start_date: event.start_date,
      end_date: event.end_date,
      start: new Date(event.start_date),
      end: new Date(event.end_date),
      place: event.place,
      owner: event.owner,
      ownerName: userMap.get(event.owner) || '未設定',
      genre: event.genre,
      description: event.description
    }));

    setEvents(formattedEvents);
  };

  // 月が変更されたときにイベントを再取得
  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
  };

  useEffect(() => {
    fetchEvents();
  }, [currentMonth]); // currentMonthが変更されたときにfetchEventsを実行

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

  // 繰り返しイベントをフィルタリングする関数
  const filterRepeatingEvents = (events: Event[]) => {
    // まず現在時刻以降のイベントのみをフィルタリング
    const futureEvents = events.filter(event => event.start > new Date());
    
    if (showAllEvents) return futureEvents;

    const eventGroups = futureEvents.reduce((groups, event) => {
      if (!groups[event.title]) {
        groups[event.title] = [];
      }
      groups[event.title].push(event);
      return groups;
    }, {} as { [key: string]: Event[] });

    return Object.values(eventGroups).map(group => {
      if (group.length === 1) return group[0];
      // 同名イベントの中で最も近い日付のものを返す
      return group.reduce((nearest, event) => {
        if (!nearest || event.start < nearest.start) return event;
        return nearest;
      });
    }).filter(Boolean) as Event[];
  };

  // イベントリストの表示コンポーネントを修正
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
            <div className="text-lg font-medium mb-2">{event.title}</div>
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
            height: 'calc(100vh - 300px)' // ヘッダー、ボタン、フッターの高さを考慮
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
                  event: React.memo(({ event }) => (
                    <div className="text-sm truncate">
                      {event.title}
                    </div>
                  ))
                }}
                eventPropGetter={React.useCallback(() => ({
                  className: 'calendar-event'
                }), [])}
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