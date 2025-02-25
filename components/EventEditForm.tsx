import { useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { Event } from '../types/event';
import PlaceSelectModal from './PlaceSelectModal';

interface EventEditFormProps {
  event: Event;
  onSave: () => Promise<void>;
  onCancel: () => void;
  editedEvent: Event;
  setEditedEvent: (event: Event) => void;
}

export default function EventEditForm({
  event,
  onSave,
  onCancel,
  editedEvent,
  setEditedEvent,
}: EventEditFormProps) {
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);

  const handlePlaceSelect = (venue: { id: number; name: string }) => {
    setEditedEvent({
      ...editedEvent,
      venue_id: venue.id,
      venue_nm: venue.name
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium mb-1 text-[#FCFCFC]">
          タイトル<span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={editedEvent?.title}
          onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
          className="w-full bg-[#1D1D21] rounded p-1.5 text-[#FCFCFC] h-9"
          required
        />
      </div>

      <div className="flex gap-4">
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1 text-[#FCFCFC]">
              開始日時<span className="text-red-500">*</span>
            </label>
            <DateTimePicker
              value={new Date(editedEvent?.start_date || '')}
              onChange={(date) => setEditedEvent({ ...editedEvent, start_date: date?.toISOString() || '' })}
              sx={{
                width: '100%',
                '& .MuiInputBase-root': {
                  backgroundColor: '#1D1D21',
                  color: '#FCFCFC',
                  height: '36px',
                }
              }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1 text-[#FCFCFC]">
              終了日時<span className="text-red-500">*</span>
            </label>
            <DateTimePicker
              value={new Date(editedEvent?.end_date || '')}
              onChange={(date) => setEditedEvent({ ...editedEvent, end_date: date?.toISOString() || '' })}
              sx={{
                width: '100%',
                '& .MuiInputBase-root': {
                  backgroundColor: '#1D1D21',
                  color: '#FCFCFC',
                  height: '36px',
                }
              }}
            />
          </div>
        </LocalizationProvider>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 text-[#FCFCFC]">
          場所<span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={editedEvent?.venue_nm}
          onClick={() => setIsPlaceModalOpen(true)}
          readOnly
          className="w-full bg-[#1D1D21] rounded p-1.5 text-[#FCFCFC] h-9 cursor-pointer"
          required
        />
      </div>

      <PlaceSelectModal
        open={isPlaceModalOpen}
        onClose={() => setIsPlaceModalOpen(false)}
        onSelect={handlePlaceSelect}
      />

      <div>
        <label className="block text-xs font-medium mb-1 text-[#FCFCFC]">
          説明
        </label>
        <textarea
          value={editedEvent?.description}
          onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
          className="w-full bg-[#1D1D21] rounded p-2 h-32 text-[#FCFCFC]"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 text-[#FCFCFC]">
          開催形式<span className="text-red-500">*</span>
        </label>
        <select
          value={editedEvent?.format}
          onChange={(e) => setEditedEvent({ 
            ...editedEvent, 
            format: e.target.value as 'offline' | 'online' | 'hybrid'
          })}
          className="w-full bg-[#1D1D21] rounded p-1.5 text-[#FCFCFC] h-9"
          required
        >
          <option value="offline">オフライン</option>
          <option value="online">オンライン</option>
          <option value="hybrid">ハイブリッド</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 text-[#FCFCFC]">
          URL
          {editedEvent?.format === 'online' && <span className="text-red-500">*</span>}
        </label>
        <input
          type="url"
          value={editedEvent?.url}
          onChange={(e) => setEditedEvent({ ...editedEvent, url: e.target.value })}
          className="w-full bg-[#1D1D21] rounded p-1.5 text-[#FCFCFC] h-9"
          required={editedEvent?.format === 'online'}
          placeholder="https://..."
        />
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded bg-[#4A4B50] text-[#FCFCFC] hover:bg-opacity-80"
        >
          キャンセル
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 rounded bg-[#8E93DA] text-black font-bold hover:bg-opacity-80"
        >
          保存
        </button>
      </div>
    </div>
  );
} 