import React from 'react';
import { StyleSheet, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useFontSize } from '@/contexts/FontSizeContext';

export const FontSizeSlider: React.FC = () => {
  const { multiplier, setMultiplier } = useFontSize();

  return (
    <View style={styles.container}>
      <Slider
        style={styles.slider}
        minimumValue={0.5}
        maximumValue={2.0}
        step={0.1}
        value={multiplier}
        onValueChange={value => setMultiplier(value)}
        minimumTrackTintColor='#059669'
        maximumTrackTintColor='#d3d3d3'
        thumbTintColor='#059669'
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 200,
    marginVertical: 10,
  },
  slider: {
    height: 40,
  },
});
