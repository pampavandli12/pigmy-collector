import {
  buildCustomerPhotoKey,
  getCustomerPhoto,
  getCustomerPhotosBatch,
  type CustomerPhotoKey,
} from '@/services/customerPhoto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

export function useCustomerPhoto(key: CustomerPhotoKey | null) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!key || !key.bankCode || !Number.isFinite(key.accountNumber)) {
      setPhotoUri(null);
      return;
    }
    setLoading(true);
    try {
      const uri = await getCustomerPhoto(key);
      setPhotoUri(uri);
    } finally {
      setLoading(false);
    }
  }, [key?.bankCode, key?.accountNumber]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key?.bankCode, key?.accountNumber]);

  return { photoUri, loading, refresh: load };
}

const EMPTY_PHOTOS: Record<string, string> = {};

export function useCustomerPhotosBatch(keys: CustomerPhotoKey[]) {
  const [photosByKey, setPhotosByKey] = useState<Record<string, string>>(
    EMPTY_PHOTOS,
  );
  const keysSignature = keys
    .map((key) => buildCustomerPhotoKey(key))
    .sort()
    .join(',');

  const load = useCallback(async () => {
    if (keys.length === 0) {
      // Reuse the same stable reference so a focus/render pass with no
      // customers doesn't create a new object every time (which would be a
      // no-op visually but would still trigger a state update/re-render).
      setPhotosByKey(EMPTY_PHOTOS);
      return;
    }
    const result = await getCustomerPhotosBatch(keys);
    setPhotosByKey(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSignature]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return photosByKey;
}
