import { useEffect } from 'react';
import { useStore } from './lib/store';
import DeviceFrame from './components/DeviceFrame';
import Header from './components/Header';
import TabBar from './components/TabBar';
import LoginScreen from './features/auth/LoginScreen';
import HomeScreen from './features/home/HomeScreen';
import FoldersScreen from './features/folders/FoldersScreen';
import SettingsScreen from './features/settings/SettingsScreen';

export default function App() {
  const user = useStore(s => s.user);
  const screen = useStore(s => s.screen);
  const settings = useStore(s => s.settings);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.accent = settings.accent;
  }, [settings.theme, settings.accent]);

  if (!user) {
    return (
      <DeviceFrame loginMode>
        <LoginScreen />
      </DeviceFrame>
    );
  }

  return (
    <DeviceFrame>
      <Header />
      {screen === 'home' && <HomeScreen />}
      {screen === 'folders' && <FoldersScreen />}
      {screen === 'settings' && <SettingsScreen />}
      <TabBar />
    </DeviceFrame>
  );
}
