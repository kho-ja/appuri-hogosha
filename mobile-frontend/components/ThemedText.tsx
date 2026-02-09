import { Text, type TextProps, StyleSheet } from 'react-native';
import { useFontSize } from '@/contexts/FontSizeContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { colors } from '@/constants/Colors';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | 'default'
    | 'title'
    | 'defaultSemiBold'
    | 'subtitle'
    | 'link'
    | 'smaller';
};

const baseFontSizes: Record<NonNullable<ThemedTextProps['type']>, number> = {
  default: 16,
  defaultSemiBold: 16,
  title: 32,
  subtitle: 20,
  link: 16,
  smaller: 15,
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const { multiplier } = useFontSize();
  const fontSize = (baseFontSizes[type] || 16) * multiplier;
  return (
    <Text
      style={[
        { color, fontSize },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'link' ? styles.smaller : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {},
  defaultSemiBold: {
    fontWeight: '600',
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    fontWeight: '400',
  },
  link: {
    lineHeight: 30,
    color: colors.success,
  },
  smaller: {},
});
