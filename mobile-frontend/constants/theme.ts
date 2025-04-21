// constants/theme.ts
import { createTheme } from '@rneui/themed';
import { Colors } from '@/constants/Colors';

export const theme = createTheme({
  lightColors: {
    ...Colors.light,
    primary: Colors.light.tint, // '#005678'
  },
  darkColors: {
    ...Colors.dark,
    primary: Colors.dark.tint, // '#fff'
  },
});
