import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Slider } from '@rneui/themed';
import { useFontSize } from '@/contexts/FontSizeContext';

const steps = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2] as const;
const ROOT_WIDTH = 300;
const H_PADDING = 16;
const TRACK_WIDTH = ROOT_WIDTH - H_PADDING * 2; // 268 like before

export const FontSizeSlider: React.FC<{
  onPreviewChange?: (value: number) => void;
}> = ({ onPreviewChange }) => {
  const { multiplier, setMultiplier } = useFontSize();

  const currentIndex = React.useMemo(() => {
    const idx = steps.findIndex(s => s === multiplier);
    if (idx >= 0) return idx;
    // fallback to nearest
    let nearest = 0;
    let minDiff = Infinity;
    steps.forEach((s, i) => {
      const d = Math.abs(s - multiplier);
      if (d < minDiff) {
        minDiff = d;
        nearest = i;
      }
    });
    return nearest;
  }, [multiplier]);

  const handlePreview = React.useCallback(
    (val: number) => {
      const idx = Math.round(val);
      const clampedIdx = Math.max(0, Math.min(steps.length - 1, idx));
      onPreviewChange?.(steps[clampedIdx]);
    },
    [onPreviewChange]
  );

  const handleCommit = React.useCallback(
    (val: number) => {
      const idx = Math.round(val);
      const clampedIdx = Math.max(0, Math.min(steps.length - 1, idx));
      setMultiplier(steps[clampedIdx]);
    },
    [setMultiplier]
  );

  return (
    <View style={styles.rootContainer}>
      {/* Step markers overlay */}
      <View style={styles.stepMarkersContainer} pointerEvents='none'>
        {steps.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.stepMarker,
              // center the 2px marker on the exact step position
              { left: (TRACK_WIDTH / (steps.length - 1)) * idx - 1 },
              idx <= currentIndex
                ? styles.stepMarkerActive
                : styles.stepMarkerInactive,
            ]}
          />
        ))}
      </View>

      <View style={styles.sliderContainer}>
        <Slider
          value={currentIndex}
          minimumValue={0}
          maximumValue={steps.length - 1}
          step={1}
          allowTouchTrack
          onValueChange={handlePreview}
          onSlidingComplete={handleCommit}
          trackStyle={styles.track}
          thumbStyle={styles.thumbInner}
          minimumTrackTintColor={'#007AFF'}
          maximumTrackTintColor={'#E5E5EA'}
          thumbTintColor={'#007AFF'}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    width: ROOT_WIDTH,
    height: 44,
    alignSelf: 'center',
    position: 'relative',
  },
  sliderContainer: {
    width: ROOT_WIDTH,
    height: 44,
    paddingHorizontal: H_PADDING,
  },
  track: {
    height: 4,
    borderRadius: 2,
  },
  thumbInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  stepMarkersContainer: {
    position: 'absolute',
    top: 16, // vertically centers markers around the track
    left: H_PADDING,
    width: TRACK_WIDTH,
    height: 12,
    zIndex: 1,
    flexDirection: 'row',
  },
  stepMarker: {
    position: 'absolute',
    width: 2,
    height: 10,
    borderRadius: 1,
  },
  stepMarkerActive: {
    backgroundColor: '#007AFF',
  },
  stepMarkerInactive: {
    backgroundColor: '#E5E5EA',
  },
});

const sampleTextStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginTop: 20,
  },
  text: {
    textAlign: 'center',
    color: '#000',
    flexShrink: 1,
  },
});

export const SampleText: React.FC<{
  text: string;
  overrideMultiplier?: number;
}> = ({ text, overrideMultiplier }) => {
  const { multiplier } = useFontSize();
  const effectiveMultiplier = overrideMultiplier ?? multiplier;
  const fontSize = 16 * effectiveMultiplier;

  return (
    <View style={sampleTextStyles.container}>
      <Text
        style={[
          sampleTextStyles.text,
          {
            fontSize,
            lineHeight: fontSize * 1.2,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
};
