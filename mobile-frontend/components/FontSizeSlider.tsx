import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Slider from '@react-native-community/slider';
import { useFontSize } from '@/contexts/FontSizeContext';

const StaticSlider: React.FC<{
  multiplier: number;
  onValueChange: (value: number) => void;
}> = React.memo(({ multiplier, onValueChange }) => {
  const steps = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2];
  const stepWidth = 100 / (steps.length - 1);

  const renderStepMarkers = () => {
    return steps.map((step, index) => (
      <View
        key={index}
        style={[
          styles.stepMarker,
          {
            left: `${index * stepWidth}%`,
            backgroundColor: multiplier >= step ? '#007AFF' : '#E5E5EA',
          },
        ]}
      />
    ));
  };

  return (
    <View style={styles.rootContainer}>
      <View style={styles.sliderContainer}>
        <View style={styles.stepMarkersContainer}>{renderStepMarkers()}</View>
        <Slider
          style={styles.slider}
          minimumValue={1.0}
          maximumValue={2.2}
          step={0.2}
          value={multiplier}
          onValueChange={onValueChange}
          minimumTrackTintColor='#007AFF'
          maximumTrackTintColor='#E5E5EA'
          thumbTintColor='#007AFF'
        />
      </View>
    </View>
  );
});

StaticSlider.displayName = 'StaticSlider';

export const FontSizeSlider: React.FC = () => {
  const { multiplier, setMultiplier } = useFontSize();

  return <StaticSlider multiplier={multiplier} onValueChange={setMultiplier} />;
};

const styles = StyleSheet.create({
  rootContainer: {
    width: 300,
    height: 44,
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  sliderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 44,
    width: 300,
    justifyContent: 'center',
  },
  slider: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 44,
    width: 300,
    zIndex: 3,
  },
  stepMarkersContainer: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    height: 9,
    zIndex: 2,
  },
  stepMarker: {
    position: 'absolute',
    width: 3,
    height: 12,
    borderRadius: 1,
    marginLeft: -1.5,
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

export const SampleText: React.FC<{ text: string }> = ({ text }) => {
  const { multiplier } = useFontSize();
  const fontSize = 16 * multiplier;

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
