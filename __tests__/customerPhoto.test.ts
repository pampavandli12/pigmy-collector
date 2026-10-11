const fakeManipulator = {
  manipulateAsync: jest.fn(async () => ({
    uri: 'mock://resized.jpg',
    width: 1,
    height: 1,
    base64: 'ZmFrZQ==',
  })),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
};

function mockDb(overrides: {
  execAsync?: jest.Mock;
  runAsync?: jest.Mock;
  getFirstAsync?: jest.Mock;
  getAllAsync?: jest.Mock;
}) {
  jest.doMock('expo-sqlite', () => ({
    openDatabaseAsync: jest.fn(async () => ({
      execAsync: overrides.execAsync ?? jest.fn(async () => undefined),
      runAsync: overrides.runAsync ?? jest.fn(async () => ({ changes: 1 })),
      getFirstAsync: overrides.getFirstAsync ?? jest.fn(async () => null),
      getAllAsync: overrides.getAllAsync ?? jest.fn(async () => []),
    })),
  }));
}

beforeEach(() => {
  jest.resetModules();
  fakeManipulator.manipulateAsync.mockClear();
});

test('save then get round-trips the compressed photo as a data URI', async () => {
  const rows = new Map<string, Record<string, unknown>>();
  mockDb({
    runAsync: jest.fn(async (_sql: string, params: unknown[]) => {
      const [bankCode, accountNumber, photoBase64, mimeType] = params;
      rows.set(`${bankCode}:${accountNumber}`, {
        bank_code: bankCode,
        account_number: accountNumber,
        photo_base64: photoBase64,
        mime_type: mimeType,
      });
      return { changes: 1 };
    }),
    getFirstAsync: jest.fn(async (_sql: string, params: unknown[]) => {
      const [bankCode, accountNumber] = params;
      return rows.get(`${bankCode}:${accountNumber}`) ?? null;
    }),
  });

  const { saveCustomerPhoto, getCustomerPhoto } = require('../services/customerPhoto');

  const saved = await saveCustomerPhoto(
    { bankCode: 'BANK', accountNumber: 101 },
    'file:///photo.jpg',
    fakeManipulator,
  );
  expect(saved).toBe('data:image/jpeg;base64,ZmFrZQ==');
  expect(fakeManipulator.manipulateAsync).toHaveBeenCalledWith(
    'file:///photo.jpg',
    [{ resize: { width: 800 } }],
    expect.objectContaining({ compress: 0.5, format: 'jpeg', base64: true }),
  );

  const fetched = await getCustomerPhoto({ bankCode: 'BANK', accountNumber: 101 });
  expect(fetched).toBe('data:image/jpeg;base64,ZmFrZQ==');
});

test('a DB open failure degrades every call to a safe default, never throws', async () => {
  jest.doMock('expo-sqlite', () => ({
    openDatabaseAsync: jest.fn(async () => {
      throw new Error('native module unavailable');
    }),
  }));

  const {
    saveCustomerPhoto,
    getCustomerPhoto,
    getCustomerPhotosBatch,
  } = require('../services/customerPhoto');

  await expect(
    saveCustomerPhoto({ bankCode: 'B', accountNumber: 1 }, 'file:///x.jpg', fakeManipulator),
  ).resolves.toBeNull();
  await expect(
    getCustomerPhoto({ bankCode: 'B', accountNumber: 1 }),
  ).resolves.toBeNull();
  await expect(
    getCustomerPhotosBatch([{ bankCode: 'B', accountNumber: 1 }]),
  ).resolves.toEqual({});
});

test('a query failure after a successful open also degrades gracefully', async () => {
  mockDb({
    runAsync: jest.fn(async () => {
      throw new Error('write failed');
    }),
    getFirstAsync: jest.fn(async () => {
      throw new Error('read failed');
    }),
  });

  const { saveCustomerPhoto, getCustomerPhoto } = require('../services/customerPhoto');

  await expect(
    saveCustomerPhoto({ bankCode: 'B', accountNumber: 1 }, 'file:///x.jpg', fakeManipulator),
  ).resolves.toBeNull();
  await expect(
    getCustomerPhoto({ bankCode: 'B', accountNumber: 1 }),
  ).resolves.toBeNull();
});

test('a corrupt stored value is treated as no photo rather than a broken URI', async () => {
  mockDb({
    getFirstAsync: jest.fn(async () => ({
      bank_code: 'B',
      account_number: 1,
      photo_base64: 'not valid base64 !!',
      mime_type: 'image/jpeg',
    })),
  });

  const { getCustomerPhoto } = require('../services/customerPhoto');

  await expect(
    getCustomerPhoto({ bankCode: 'B', accountNumber: 1 }),
  ).resolves.toBeNull();
});

test('a compression failure returns null without throwing or writing a row', async () => {
  const runAsync = jest.fn(async () => ({ changes: 1 }));
  mockDb({ runAsync });

  const { saveCustomerPhoto } = require('../services/customerPhoto');
  const throwingManipulator = {
    manipulateAsync: jest.fn(async () => {
      throw new Error('bad image data');
    }),
    SaveFormat: { JPEG: 'jpeg' },
  };

  await expect(
    saveCustomerPhoto({ bankCode: 'B', accountNumber: 1 }, 'file:///x.jpg', throwingManipulator),
  ).resolves.toBeNull();
  expect(runAsync).not.toHaveBeenCalled();
});

test('batch lookup intersects bank-scoped rows against the requested account numbers', async () => {
  const allRows = [
    { bank_code: 'B', account_number: 1, photo_base64: 'YQ==', mime_type: 'image/jpeg' },
    { bank_code: 'B', account_number: 2, photo_base64: 'Yg==', mime_type: 'image/jpeg' },
    { bank_code: 'B', account_number: 3, photo_base64: 'Yw==', mime_type: 'image/jpeg' },
  ];
  mockDb({ getAllAsync: jest.fn(async () => allRows) });

  const {
    getCustomerPhotosBatch,
    buildCustomerPhotoKey,
  } = require('../services/customerPhoto');

  const result = await getCustomerPhotosBatch([
    { bankCode: 'B', accountNumber: 1 },
    { bankCode: 'B', accountNumber: 3 },
  ]);

  expect(Object.keys(result).sort()).toEqual(
    [
      buildCustomerPhotoKey({ bankCode: 'B', accountNumber: 1 }),
      buildCustomerPhotoKey({ bankCode: 'B', accountNumber: 3 }),
    ].sort(),
  );
  expect(result[buildCustomerPhotoKey({ bankCode: 'B', accountNumber: 2 })]).toBeUndefined();
});
