import { Dialog } from '@mui/material';

interface CizTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (points: number) => void;
  selectedUser: {
    emp_no: number;
    myoji: string;
    namae: string;
  } | null;
  error?: string;
}

const CizTransferModal = ({ isOpen, onClose, onSubmit, selectedUser, error }: CizTransferModalProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const points = parseInt((form.elements.namedItem('points') as HTMLInputElement).value);
    if (points > 0) {
      onSubmit(points);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          margin: '16px',
          width: 'calc(100% - 32px)',
          maxWidth: '400px'
        }
      }}
    >
      <div className="bg-[#2D2D33] p-4 sm:p-6">
        <h2 className="text-xl font-bold mb-4 text-[#FCFCFC]">ポイント譲渡</h2>
        <p className="text-[#FCFCFC] mb-4">
          {selectedUser ? `${selectedUser.myoji} ${selectedUser.namae}` : ''} さんへ
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          <div>
            <input
              type="number"
              name="points"
              min="1"
              required
              placeholder="譲渡するポイント"
              className="w-full bg-[#1D1D21] text-[#FCFCFC] rounded p-2"
            />
          </div>
          <div className="flex justify-end gap-2 sm:gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 rounded bg-[#4A4B50] text-[#FCFCFC] hover:bg-opacity-80"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-3 sm:px-4 py-2 rounded bg-[#8E93DA] text-black font-bold hover:bg-opacity-80"
            >
              譲渡
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

export default CizTransferModal; 