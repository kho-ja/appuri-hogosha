import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Slider from '@react-native-community/slider';
import { useFontSize } from '@/contexts/FontSizeContext';
import { useTheme } from '@rneui/themed';

const FONT_SIZES = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2];

export const FontSizeSlider: React.FC<{
  onPreviewChange?: (value: number) => void;
}> = ({ onPreviewChange }) => {
  const { multiplier, setMultiplier } = useFontSize();

  // Find current step index
  const currentStep = FONT_SIZES.findIndex(size => size === multiplier) || 0;

  const handleChange = (value: number) => {
    const step = Math.round(value);
    const fontSize = FONT_SIZES[step];
    onPreviewChange?.(fontSize);
  };

  const handleComplete = (value: number) => {
    const step = Math.round(value);
    const fontSize = FONT_SIZES[step];
    setMultiplier(fontSize);
  };

  // Адаптивный цвет ползунка: синий на обеих темах
  const thumbColor = '#007AFF';

  return (
    <View style={styles.container}>
      <View style={styles.sliderRow}>
        <Text style={styles.smallLabel}>A</Text>

        <View style={styles.sliderWrapper}>
          <Slider
            style={styles.slider}
            value={currentStep}
            minimumValue={0}
            maximumValue={FONT_SIZES.length - 1}
            step={1}
            onValueChange={handleChange}
            onSlidingComplete={handleComplete}
            minimumTrackTintColor='#007AFF'
            maximumTrackTintColor='#D0D0D0'
            thumbTintColor={thumbColor}
          />
        </View>

        <Text style={styles.largeLabel}>A</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 300,
    alignSelf: 'center',
    paddingVertical: 15,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  smallLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginRight: 12,
  },
  largeLabel: {
    fontSize: 24,
    color: '#8E8E93',
    fontWeight: '600',
    marginLeft: 12,
  },
  sliderWrapper: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

const sampleTextStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 20,
  },
  text: {
    textAlign: 'center',
    flexShrink: 1,
  },
});

export const SampleText: React.FC<{
  text: string;
  overrideMultiplier?: number;
}> = ({ text, overrideMultiplier }) => {
  const { multiplier } = useFontSize();
  const { theme } = useTheme();
  const effectiveMultiplier = overrideMultiplier ?? multiplier;
  const fontSize = 16 * effectiveMultiplier;

  // Определяем темный режим и применяем соответствующие цвета
  const isDark = theme.mode === 'dark';
  const bgColor = isDark ? '#2C2C2E' : '#F2F2F7';
  const textColor = isDark ? '#FFFFFF' : '#000000';

  return (
    <View style={[sampleTextStyles.container, { backgroundColor: bgColor }]}>
      <Text
        style={[
          sampleTextStyles.text,
          {
            fontSize,
            lineHeight: fontSize * 1.2,
            color: textColor,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
};
