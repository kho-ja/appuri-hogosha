import { ICountry } from 'react-native-international-phone-number';

export function normalizePhone(ctry: ICountry | null, raw: string) {
  const national = raw.replace(/\s+/g, '');
  const trimmedNational = national.startsWith('0')
    ? national.slice(1)
    : national;
  const cc = (ctry?.callingCode || '').replace(/^\+/, '');
  return cc + trimmedNational;
}
