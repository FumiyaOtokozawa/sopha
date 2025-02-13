import { useState, useEffect } from 'react';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import HomeIcon from '@mui/icons-material/Home';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import RedeemIcon from '@mui/icons-material/Redeem';
import { useRouter } from 'next/router';

export default function FooterMenu() {
  const router = useRouter();
  
  // 現在のパスに基づいて適切な値を設定
  const getActiveTab = (path: string) => {
    if (path.includes('/employeePages/empMainPage')) return 0;
    if (path.includes('/events/')) return 1;  // イベント関連の全てのパスに対応
    if (path.includes('/employeePages/empCizTransPage')) return 2;
    if (path.includes('/employeePages/empProfilePage')) return 3;
    return 0;
  };

  const [value, setValue] = useState(getActiveTab(router.pathname));

  // ルート変更時にvalueを更新
  useEffect(() => {
    setValue(getActiveTab(router.pathname));
  }, [router.pathname]);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    switch (newValue) {
      case 0:
        router.push('/employeePages/empMainPage');
        break;
      case 1:
        router.push('/events/eventListPage');
        break;
      case 2:
        router.push('/employeePages/empCizTransPage');
        break;
      case 3:
        router.push('/employeePages/empProfilePage');
        break;
    }
  };

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        bgcolor: '#2D2D2D',
        height: '64px', // 高さを固定
      }} 
      elevation={3}
    >
      <BottomNavigation
        showLabels
        value={value}
        onChange={handleChange}
        sx={{
          height: '100%',
          bgcolor: '#2D2D2D',
          '& .MuiBottomNavigationAction-root': {
            color: '#8E93DA',
            minWidth: '25%', // 4つのアイテムに調整
            padding: '8px 0',
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.625rem', // ラベルのフォントサイズを調整
              '&.Mui-selected': {
                fontSize: '0.75rem', // 選択時のフォントサイズ
                color: '#FCFCFC' // 選択時のラベル色を白に
              }
            },
            '& .MuiSvgIcon-root': {
              fontSize: '2rem', // アイコンサイズを2remに拡大（以前は1.5rem）
              '&.Mui-selected': {
                color: '#FCFCFC' // 選択時のアイコン色を白に
              }
            }
          },
          '& .Mui-selected': {
            '& .MuiSvgIcon-root': {
              color: '#FCFCFC' // 選択時のアイコン色を白に
            },
            '& .MuiBottomNavigationAction-label': {
              color: '#FCFCFC' // 選択時のラベル色を白に
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
          label="CIZ" 
          icon={<RedeemIcon />} 
        />
        <BottomNavigationAction 
          label="PROFILE" 
          icon={<PersonIcon />} 
        />
      </BottomNavigation>
    </Paper>
  );
} 