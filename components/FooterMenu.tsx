import { useState, useEffect } from 'react';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import HomeIcon from '@mui/icons-material/Home';
import EventIcon from '@mui/icons-material/Event';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import RedeemIcon from '@mui/icons-material/Redeem';
import { useRouter } from 'next/router';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

export default function FooterMenu() {
  const router = useRouter();
  const [openSnackbar, setOpenSnackbar] = useState(false);
  
  // 現在のパスに基づいて適切な値を設定
  const getActiveTab = (path: string) => {
    if (path.includes('/employeePages/empMainPage')) return 0;
    if (path.includes('/events/')) return 1;  // イベント関連の全てのパスに対応
    if (path.includes('/plans/')) return 2;
    if (path.includes('/employeePages/empCizTransPage')) return 3;
    return 0;
  };

  const [value, setValue] = useState(getActiveTab(router.pathname));

  // ルート変更時にvalueを更新
  useEffect(() => {
    setValue(getActiveTab(router.pathname));
  }, [router.pathname]);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    // CIZタブ（newValue === 3）の場合は、valueを更新せずメッセージのみ表示
    if (newValue === 3) {
      setOpenSnackbar(true);
      return;
    }

    setValue(newValue);
    switch (newValue) {
      case 0:
        router.push('/employeePages/empMainPage');
        break;
      case 1:
        router.push('/events/eventListPage');
        break;
      case 2:
        router.push('/plans/planMainPage');
        break;
    }
  };

  return (
    <>
      <Paper 
        sx={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0,
          bgcolor: '#2D2D2D',
          height: 'calc(64px + 20px)',
          zIndex: 1000,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }} 
        elevation={0}
      >
        <BottomNavigation
          showLabels
          value={value}
          onChange={handleChange}
          sx={{
            height: '64px', // ナビゲーション自体の高さは固定
            bgcolor: '#2D2D2D',
            '& .MuiBottomNavigationAction-root': {
              color: '#8E93DA',
              minWidth: '25%',
              padding: '8px 0',
              transition: 'none', // 遷移アニメーションを無効化
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.625rem',
                transition: 'none', // ラベルの遷移も無効化
                '&.Mui-selected': {
                  fontSize: '0.75rem',
                  color: '#FCFCFC'
                }
              },
              '& .MuiSvgIcon-root': {
                fontSize: '2rem',
                transition: 'none', // アイコンの遷移も無効化
                color: '#8E93DA', // 非選択時の色を明示的に設定
                '&.Mui-selected': {
                  color: '#FCFCFC'
                }
              }
            },
            '& .Mui-selected': {
              '& .MuiSvgIcon-root': {
                color: '#FCFCFC',
                transition: 'none' // 選択時の遷移も無効化
              },
              '& .MuiBottomNavigationAction-label': {
                color: '#FCFCFC',
                transition: 'none' // 選択時のラベル遷移も無効化
              }
            }
          }}
        >
          <BottomNavigationAction 
            label="HOME" 
            icon={<HomeIcon />} 
          />
          <BottomNavigationAction 
            label="EVENT" 
            icon={<EventIcon />} 
          />
          <BottomNavigationAction 
            label="PLAN" 
            icon={<CalendarMonthIcon />} 
          />
          <BottomNavigationAction 
            label="CIZ" 
            icon={<RedeemIcon />}
            sx={{
              opacity: 0.5,
            }}
          />
        </BottomNavigation>
      </Paper>
      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ 
          bottom: 'calc(64px + 20px) !important',
          width: '90%',
          maxWidth: '600px',
          margin: '0 auto'
        }}
      >
        <Alert 
          severity="info" 
          variant="filled"
          onClose={() => setOpenSnackbar(false)}
          sx={{
            width: '100%',
            '& .MuiAlert-message': {
              width: '100%',
              textAlign: 'center'
            }
          }}
        >
          <div style={{ fontSize: '0.8em' }}>
            ポイント譲渡機能は現在作成中です。<br />
            もうしばらくお待ちください。
          </div>
        </Alert>
      </Snackbar>
    </>
  );
} 