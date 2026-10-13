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

jest.mock('expo-crypto', () => {
  const { createHash, randomBytes, randomUUID } = require('crypto');
  return {
    randomUUID,
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: jest.fn(async (_algorithm: string, value: string) =>
      createHash('sha256').update(value).digest('hex'),
    ),
    getRandomBytesAsync: jest.fn(async (size: number) => randomBytes(size)),
  };
});

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
    // Real useFocusEffect runs its callback as an effect (after commit), not
    // during render — mirror that here so render-phase state updates in the
    // callback don't trip React's "too many re-renders" render-loop guard.
    useFocusEffect: (callback: () => void) => {
      useEffect(() => {
        callback();
      }, [callback]);
    },
    useLocalSearchParams: () => ({
      id: '1',
      name: 'Customer',
      agentCode: '2',
      bankCode: 'B',
      balance: '100',
      account: '3',
      mobilenumber: '9876543210',
      vpncode: '123456',
    }),
    Stack: Object.assign(({ children }: { children: React.ReactNode }) => children, {
      Screen: () => null,
      Protected: ({ children }: { children: React.ReactNode }) => children,
    }),
  };
});

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => ({
    execAsync: jest.fn(async () => undefined),
    runAsync: jest.fn(async () => ({ changes: 0, lastInsertRowId: 0 })),
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async () => null),
    closeAsync: jest.fn(async () => undefined),
  })),
}));

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async () => ({
    uri: 'mock://compressed.jpg',
    width: 1,
    height: 1,
    base64: 'AAAA',
  })),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(),
    shareSingle: jest.fn(),
    isPackageInstalled: jest.fn(),
  },
  Social: {
    Whatsapp: 'whatsapp',
    Whatsappbusiness: 'whatsappbusiness',
  },
}));
