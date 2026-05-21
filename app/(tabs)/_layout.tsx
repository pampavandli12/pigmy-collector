import { processOutbox } from '@/store/syncEngine';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { BottomNavigation } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Dashboard from './dashboard';
import Support from './support';
import Users from './users';

export default function TabsLayout() {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
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
  ]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        console.log('Internet restored');

        // Retry only existing queue
        processOutbox();
      }
    });

    return unsubscribe;
  }, []);

  const renderScene = BottomNavigation.SceneMap({
    dashboard: Dashboard,
    users: Users,
    help: Support,
  });

  return (
    <SafeAreaView style={styles.container}>
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
        barStyle={{
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        }}
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
