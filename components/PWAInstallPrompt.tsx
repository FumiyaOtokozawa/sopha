import { useState, useEffect } from 'react';
import CloseIcon from '@mui/icons-material/Close';

// iOS Safariのnavigator型を拡張
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // PWAがインストールされているかどうかを複数の方法で確認
    const isPWAInstalled = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (window.navigator as NavigatorWithStandalone).standalone === true;

    // PWAがインストールされていない場合は常にメッセージを表示
    if (!isPWAInstalled) {
      setShowPrompt(true);
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 bg-[#5b63d3] text-white p-2 z-50">
      <div className="container mx-auto relative">
        <button 
          onClick={() => setShowPrompt(false)}
          className="absolute right-0 top-1/2 -translate-y-1/2"
          aria-label="閉じる"
        >
          <CloseIcon fontSize="small" />
        </button>
        <p className="text-xs text-center pr-4">
          SOPHAをホーム画面に追加すると、より快適に利用できます<br/>
          ※ブラウザで利用するとレイアウトが崩れる可能性があります
        </p>
      </div>
    </div>
  );
};

export default PWAInstallPrompt; 