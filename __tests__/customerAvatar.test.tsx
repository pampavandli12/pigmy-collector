jest.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({
    beginTrustedHandoff: jest.fn(),
    endTrustedHandoff: jest.fn(),
  }),
}));

import { act, fireEvent, render } from '@testing-library/react-native';
import { Image } from 'expo-image';
import { PaperProvider } from 'react-native-paper';
import { CustomerAvatar } from '../components/CustomerAvatar';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
);

// Every render kicks off CustomerAvatar's internal (self-fetch) photo lookup
// even when it ends up unused (e.g. controlled mode), so let that settle
// before asserting — otherwise React warns about an update outside act().
async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

test('renders the first-letter initial when no photo is resolvable', async () => {
  const screen = render(<CustomerAvatar name='Customer One' />, { wrapper });
  await flush();
  expect(screen.getByText('C')).toBeTruthy();
});

test('renders the supplied photo in controlled mode', async () => {
  const screen = render(
    <CustomerAvatar name='Customer One' photoUri='data:image/jpeg;base64,AAAA' />,
    { wrapper },
  );
  await flush();
  const image = screen.UNSAFE_getByType(Image);
  expect(image.props.source).toEqual({ uri: 'data:image/jpeg;base64,AAAA' });
  expect(screen.queryByText('C')).toBeNull();
});

test('labelMode="initials" matches the existing two-letter fallback behavior', async () => {
  const screen = render(
    <CustomerAvatar name='Sriram S' labelMode='initials' />,
    { wrapper },
  );
  await flush();
  expect(screen.getByText('SS')).toBeTruthy();
});

test('falls back to initials when the image fails to decode', async () => {
  const screen = render(
    <CustomerAvatar name='Customer One' photoUri='data:image/jpeg;base64,AAAA' />,
    { wrapper },
  );
  await flush();
  const image = screen.UNSAFE_getByType(Image);
  await act(async () => {
    fireEvent(image, 'error');
  });
  expect(screen.getByText('C')).toBeTruthy();
});

test('shows the camera badge only when editable and a photo key is resolvable', async () => {
  const notEditable = render(
    <CustomerAvatar name='Customer One' bankCode='BANK' accountNumber={1} />,
    { wrapper },
  );
  await flush();
  expect(notEditable.queryByLabelText('Add customer photo')).toBeNull();

  const editableWithoutKey = render(
    <CustomerAvatar name='Customer One' editable />,
    { wrapper },
  );
  await flush();
  expect(editableWithoutKey.queryByLabelText('Add customer photo')).toBeNull();

  const editableWithKey = render(
    <CustomerAvatar name='Customer One' bankCode='BANK' accountNumber={1} editable />,
    { wrapper },
  );
  await flush();
  expect(editableWithKey.getByLabelText('Add customer photo')).toBeTruthy();
});
