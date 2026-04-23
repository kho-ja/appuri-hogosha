import { createTheme } from '@rneui/themed';
import { Colors } from '@/constants/Colors';

export const theme = createTheme({
  lightColors: {
    ...Colors.light,
    primary: Colors.light.tint,
  },
  darkColors: {
    ...Colors.dark,
    primary: Colors.dark.tint,
  },
});
