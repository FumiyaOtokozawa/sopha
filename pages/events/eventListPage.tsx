import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, ToolbarProps, View } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { ja } from 'date-fns/locale';
import { supabase } from '../../utils/supabaseClient';
import Header from '../../components/Header';
import { format as formatDate } from 'date-fns';
import React from 'react';

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

// イベントの型定義を修正
interface Event {
  id: number;
  title: string;
  start: Date;
  end: Date;
  place?: string;
  owner?: string;
  ownerName?: string; // 主催者の名前を追加
}

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

  // イベントデータの取得を修正
  useEffect(() => {
    const fetchEvents = async () => {
      // まずイベントデータを取得
      const { data: eventData, error: eventError } = await supabase
        .from('EVENT_LIST')
        .select('*')
        .eq('act_kbn', true);

      if (eventError) {
        console.error('イベントの取得に失敗しました:', eventError);
        return;
      }

      // イベントデータを整形し、所有者情報を取得
      const formattedEvents = await Promise.all(eventData.map(async event => {
        let ownerName = '未設定';
        
        if (event.owner) {
          // 所有者情報を取得
          const { data: userData, error: userError } = await supabase
            .from('USER_INFO')
            .select('myoji, namae')
            .eq('emp_no', event.owner)
            .single();

          if (!userError && userData) {
            ownerName = `${userData.myoji} ${userData.namae}`;
          }
        }

        return {
          id: event.event_id,
          title: event.title,
          start: new Date(event.start_date),
          end: new Date(event.end_date),
          place: event.place,
          owner: event.owner,
          ownerName: ownerName
        };
      }));

      setEvents(formattedEvents);
    };

    fetchEvents();
  }, []);

  // イベントをクリックした時の処理を修正
  const handleEventClick = (event: Event) => {
    alert(`
      イベント ： ${event.title}
      場　所 ： ${event.place || '未定'}
      主催者 ： ${event.ownerName}
      開　始 ： ${event.start.toLocaleString()}
      終　了 ： ${event.end.toLocaleString()}
    `);
  };

  return (
    <div>
      <Header />
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">イベントカレンダー</h1>
        <div className="bg-[#2d2d33] rounded-lg p-2 flex gap-2 mb-4">
          <button
            className={`flex-1 py-2 rounded-md transition-colors ${
              true ? 'bg-[#5b63d3] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            カレンダー
          </button>
          <button
            className={`flex-1 py-2 rounded-md transition-colors ${
              false ? 'bg-[#5b63d3] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            予定リスト
          </button>
        </div>
        <div style={{ height: '700px' }}>
          <Calendar<Event>
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            culture='ja'
            onSelectEvent={handleEventClick}
            defaultView="month"
            views={['month']}
            components={{
              toolbar: CustomToolbar
            }}
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
        </div>
      </div>
    </div>
  );
} 