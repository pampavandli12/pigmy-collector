import type React from 'react';

jest.mock('react-native-mmkv', () => {
  const values = new Map<string, string>();
  return {
    createMMKV: () => ({
      getString: jest.fn((key: string) => values.get(key)),
      set: jest.fn((key: string, value: string) => values.set(key, value)),
      delete: jest.fn((key: string) => values.delete(key)),
      clearAll: jest.fn(() => values.clear()),
    }),
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({
    id: '1',
    name: 'Customer',
    agentCode: '2',
    bankCode: 'B',
    balance: '100',
    account: '3',
    mobilenumber: '9876543210',
  }),
  Stack: Object.assign(({ children }: { children: React.ReactNode }) => children, {
    Screen: () => null,
    Protected: ({ children }: { children: React.ReactNode }) => children,
  }),
}));
