import { cleanupOutbox, processOutbox } from '@/store/syncEngine';
import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useState } from 'react';
import { InteractionManager, StyleSheet } from 'react-native';
import {
  BottomNavigation,
  BottomNavigationRoute,
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
    title: 'Support',
    focusedIcon: 'help-circle',
    unfocusedIcon: 'help-circle-outline',
  },
];

const renderScene = BottomNavigation.SceneMap({
  dashboard: Dashboard,
  users: Users,
  help: Support,
});

const barStyle = {
  backgroundColor: '#fff',
  borderTopWidth: 1,
  borderTopColor: '#e0e0e0',
};

export default function TabsLayout() {
  const [index, setIndex] = useState(0);
  const [preloadUsers, setPreloadUsers] = useState(false);

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
        activeColor='#4A90E2'
        inactiveColor='#999'
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
