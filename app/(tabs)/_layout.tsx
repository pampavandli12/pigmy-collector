import { cleanupOutbox, processOutbox } from '@/store/syncEngine';
import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useState } from 'react';
import { InteractionManager, StyleSheet } from 'react-native';
import {
  BottomNavigation,
  BottomNavigationRoute,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Dashboard from './dashboard';
import Support from './support';
import Users from './users';

const routes: BottomNavigationRoute[] = [
  {
    key: 'dashboard',
    title: 'Home',
    focusedIcon: 'home',
    unfocusedIcon: 'home-outline',
  },
  {
    key: 'users',
    title: 'Users',
    focusedIcon: 'account-group',
    unfocusedIcon: 'account-group-outline',
  },
  {
    key: 'help',
    title: 'Settings',
    focusedIcon: 'cog',
    unfocusedIcon: 'cog-outline',
  },
];

const renderScene = BottomNavigation.SceneMap({
  dashboard: Dashboard,
  users: Users,
  help: Support,
});

const barStyle = {
  backgroundColor: '#fff',
  // Soft top elevation instead of a hard divider line — reads more like MD3.
  elevation: 8,
  shadowColor: '#1A2233',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
};

export default function TabsLayout() {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [preloadUsers, setPreloadUsers] = useState(false);

  // Tint the MD3 active-tab pill to match the app's chip palette
  // (light blue pill, deep blue icon/label) so the bar reads as one system.
  const navTheme = {
    ...theme,
    colors: {
      ...theme.colors,
      secondaryContainer: '#EAF2FC',
      onSecondaryContainer: '#2C5A8C',
    },
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        // Retry only existing queue
        void processOutbox().finally(cleanupOutbox);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setPreloadUsers(true);
    });
    return () => task.cancel();
  }, []);

  const getLazy = useCallback(
    ({ route }: { route: BottomNavigationRoute }) =>
      route.key === 'users' ? !preloadUsers : undefined,
    [preloadUsers],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
        getLazy={getLazy}
        barStyle={barStyle}
        theme={navTheme}
        activeColor='#2C5A8C'
        inactiveColor='#8A96A6'
        labeled={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
