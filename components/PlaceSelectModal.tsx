import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Tabs, Tab, Box } from '@mui/material';
import { supabase } from '../utils/supabaseClient';

interface Venue {
  venue_id: number;
  venue_nm: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  usage_count: number;
}

interface VenueUsage {
  venue_id: number;
  count: number;
}

interface PlaceSelectModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (venue: { id: number; name: string }) => void;
}

const PlaceSelectModal = ({ open, onClose, onSelect }: PlaceSelectModalProps) => {
  const [tabValue, setTabValue] = useState(0);
  const [savedVenues, setSavedVenues] = useState<Venue[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      fetchVenuesWithUsageCount();
    }
  }, [open]);

  const fetchVenuesWithUsageCount = async () => {
    // 使用回数の集計をSQLで実行
    const { data: usageData } = await supabase
      .rpc('count_venue_usage');  // カスタム関数を使用

    // 使用回数をMapに変換
    const usageCountMap = new Map<number, number>(
      usageData?.map((item: VenueUsage) => [item.venue_id, item.count]) || []
    );

    // 全ての会場を取得
    const { data: venueData, error: venueError } = await supabase
      .from('EVENT_VENUE')
      .select('*')
      .order('venue_nm');

    if (venueData) {
      // 会場データと使用回数を結合
      const venuesWithCount = venueData.map(venue => ({
        ...venue,
        usage_count: usageCountMap.get(venue.venue_id) || 0
      }))
      // 使用回数で降順ソート
      .sort((a, b) => b.usage_count - a.usage_count)
      // 上位10件を取得
      .slice(0, 10);

      setSavedVenues(venuesWithCount);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleVenueSelect = (venue: Venue) => {
    onSelect({
      id: venue.venue_id,
      name: venue.venue_nm
    });
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: '#2D2D33',
          color: '#FCFCFC'
        }
      }}
    >
      <DialogTitle>場所を選択</DialogTitle>
      <DialogContent>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{
            marginBottom: 2,
            '& .MuiTab-root': {
              color: '#FCFCFC',
            },
            '& .Mui-selected': {
              color: '#8E93DA',
            }
          }}
        >
          <Tab label="よく利用する場所" />
          <Tab label="地図から検索" />
        </Tabs>

        {tabValue === 0 && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="場所を検索..."
              className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC] mb-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="max-h-[400px] overflow-y-auto">
              {savedVenues.length > 0 ? (
                savedVenues
                  .filter(venue => 
                    venue.venue_nm.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    venue.address.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((venue) => (
                    <div
                      key={venue.venue_id}
                      className="p-3 bg-[#1D1D21] rounded mb-2 cursor-pointer hover:bg-[#3D3D43]"
                      onClick={() => handleVenueSelect(venue)}
                    >
                      <div className="font-bold">{venue.venue_nm || ''}</div>
                      <div className="text-sm text-gray-400">{venue.address || ''}</div>
                    </div>
                  ))
              ) : (
                <div className="p-4 text-center text-gray-400">
                  登録されている場所がありません
                </div>
              )}
            </div>
          </div>
        )}

        {tabValue === 1 && (
          <div className="h-[400px] bg-[#1D1D21] rounded">
            {/* ここに地図検索機能を実装予定 */}
            <div className="p-4 text-center">
              地図検索機能は準備中です
            </div>
          </div>
        )}
      </DialogContent>
      <DialogActions sx={{ padding: 2 }}>
        <Button 
          onClick={onClose}
          sx={{ 
            color: '#FCFCFC',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          キャンセル
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlaceSelectModal; 