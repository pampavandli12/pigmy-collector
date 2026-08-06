jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));
jest.mock('../store/syncEngine', () => ({
  processOutbox: jest.fn(),
  cleanupOutbox: jest.fn(),
}));
jest.mock('../app/(tabs)/dashboard', () => () => null);
jest.mock('../app/(tabs)/users', () => () => null);
jest.mock('../app/(tabs)/support', () => () => null);
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View } = require('react-native');
  const BottomNavigation = (props: Record<string, unknown>) => {
    (globalThis as any).__bottomNavigationProps = props;
    return React.createElement(View);
  };
  BottomNavigation.SceneMap = () => () => null;
  return { BottomNavigation };
});

import { act, render } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import TabsLayout from '../app/(tabs)/_layout';

test('preloads Users after initial interactions while keeping other tabs lazy', () => {
  let runAfterInteractions: (() => void) | undefined;
  const cancel = jest.fn();
  jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation(
    (callback) => {
      runAfterInteractions = callback as () => void;
      return { cancel, then: jest.fn(), done: jest.fn() } as never;
    },
  );

  const screen = render(<TabsLayout />);
  const getLazy = (globalThis as any).__bottomNavigationProps.getLazy;
  expect(getLazy({ route: { key: 'users' } })).toBe(true);
  expect(getLazy({ route: { key: 'help' } })).toBeUndefined();

  act(() => runAfterInteractions?.());
  const updatedGetLazy = (globalThis as any).__bottomNavigationProps.getLazy;
  expect(updatedGetLazy({ route: { key: 'users' } })).toBe(false);

  screen.unmount();
  expect(cancel).toHaveBeenCalled();
});
