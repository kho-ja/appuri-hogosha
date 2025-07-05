import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useFontSize } from '@/contexts/FontSizeContext';

const SLIDER_WIDTH = 268;

const SteppedSlider: React.FC<{
  multiplier: number;
  onValueChange: (value: number) => void;
}> = React.memo(({ multiplier, onValueChange }) => {
  const steps = React.useMemo(() => [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2], []);
  const stepWidth = SLIDER_WIDTH / (steps.length - 1);

  const getCurrentStepIndex = (value: number) => {
    return steps.findIndex(step => step === value);
  };

  const currentIndex = getCurrentStepIndex(multiplier);

  // Animated values for dragging
  const absolutePosition = useSharedValue(currentIndex * stepWidth);
  const isDragging = useSharedValue(false);

  // Function to change step
  const changeStep = (newIndex: number) => {
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < steps.length) {
      onValueChange(steps[newIndex]);
    }
  };

  // Pan gesture for drag with track boundary constraints
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      isDragging.value = true;
    })
    .onUpdate(event => {
      'worklet';
      const startPosition = currentIndex * stepWidth;
      const deltaX = event.translationX;

      // Constrain movement within track bounds
      const maxLeftOffset = -currentIndex * stepWidth;
      const maxRightOffset = (steps.length - 1 - currentIndex) * stepWidth;
      const clampedDeltaX = Math.max(
        maxLeftOffset,
        Math.min(maxRightOffset, deltaX)
      );

      // Set absolute position
      absolutePosition.value = startPosition + clampedDeltaX;
    })
    .onEnd(() => {
      'worklet';
      isDragging.value = false;

      // On release, find the nearest step and snap to it
      const nearestStepIndex = Math.round(absolutePosition.value / stepWidth);
      const clampedIndex = Math.max(
        0,
        Math.min(steps.length - 1, nearestStepIndex)
      );

      // Set position to the nearest step
      absolutePosition.value = clampedIndex * stepWidth;

      if (clampedIndex !== currentIndex) {
        runOnJS(changeStep)(clampedIndex);
      }
    });

  // Update position when currentIndex changes
  React.useEffect(() => {
    if (!isDragging.value) {
      absolutePosition.value = currentIndex * stepWidth;
    }
  }, [currentIndex, absolutePosition, isDragging, stepWidth]);

  // Animated style for thumb (without translateX)
  const animatedThumbStyle = useAnimatedStyle(() => {
    return {};
  });

  // Animated position for thumb container
  const animatedThumbContainerStyle = useAnimatedStyle(() => {
    return {
      left: absolutePosition.value + 16 - 20, // Center the expanded touch area
    };
  });

  // Animated style for blue track fill
  const animatedTrackFillStyle = useAnimatedStyle(() => {
    return {
      width: Math.max(0, absolutePosition.value),
    };
  });

  // Animated styles for each marker
  const animatedMarker0Style = useAnimatedStyle(() => {
    return {
      backgroundColor:
        0 * stepWidth <= absolutePosition.value ? '#007AFF' : '#E5E5EA',
    };
  });
  const animatedMarker1Style = useAnimatedStyle(() => {
    return {
      backgroundColor:
        1 * stepWidth <= absolutePosition.value ? '#007AFF' : '#E5E5EA',
    };
  });
  const animatedMarker2Style = useAnimatedStyle(() => {
    return {
      backgroundColor:
        2 * stepWidth <= absolutePosition.value ? '#007AFF' : '#E5E5EA',
    };
  });
  const animatedMarker3Style = useAnimatedStyle(() => {
    return {
      backgroundColor:
        3 * stepWidth <= absolutePosition.value ? '#007AFF' : '#E5E5EA',
    };
  });
  const animatedMarker4Style = useAnimatedStyle(() => {
    return {
      backgroundColor:
        4 * stepWidth <= absolutePosition.value ? '#007AFF' : '#E5E5EA',
    };
  });
  const animatedMarker5Style = useAnimatedStyle(() => {
    return {
      backgroundColor:
        5 * stepWidth <= absolutePosition.value ? '#007AFF' : '#E5E5EA',
    };
  });
  const animatedMarker6Style = useAnimatedStyle(() => {
    return {
      backgroundColor:
        6 * stepWidth <= absolutePosition.value ? '#007AFF' : '#E5E5EA',
    };
  });

  const markerStyles = [
    animatedMarker0Style,
    animatedMarker1Style,
    animatedMarker2Style,
    animatedMarker3Style,
    animatedMarker4Style,
    animatedMarker5Style,
    animatedMarker6Style,
  ];

  const handleTrackPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    // Find the nearest step
    const stepIndex = Math.round(locationX / stepWidth);
    const clampedIndex = Math.max(0, Math.min(steps.length - 1, stepIndex));
    onValueChange(steps[clampedIndex]);
  };

  const renderStepMarkers = () => {
    return steps.map((step, index) => (
      <TouchableOpacity
        key={index}
        style={[
          styles.stepMarkerContainer,
          {
            left: index * stepWidth - 10, // Expand touch area
          },
        ]}
        onPress={() => onValueChange(step)}
        activeOpacity={0.7}
      >
        <Animated.View style={[styles.stepMarker, markerStyles[index]]} />
      </TouchableOpacity>
    ));
  };

  return (
    <View style={styles.rootContainer}>
      <View style={styles.sliderContainer}>
        {/* Slider track - expand touch area */}
        <TouchableOpacity
          style={styles.trackContainer}
          onPress={handleTrackPress}
          activeOpacity={1}
        >
          <View style={styles.track}>
            <Animated.View style={[styles.trackFill, animatedTrackFillStyle]} />
          </View>
        </TouchableOpacity>

        {/* Step markers */}
        <View style={styles.stepMarkersContainer}>{renderStepMarkers()}</View>

        {/* Thumb with drag support */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[styles.thumbContainer, animatedThumbContainerStyle]}
          >
            <Animated.View style={[styles.thumbInner, animatedThumbStyle]} />
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
});

SteppedSlider.displayName = 'SteppedSlider';

export const FontSizeSlider: React.FC = () => {
  const { multiplier, setMultiplier } = useFontSize();

  return (
    <SteppedSlider multiplier={multiplier} onValueChange={setMultiplier} />
  );
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
    paddingHorizontal: 16,
  },
  trackContainer: {
    position: 'absolute',
    top: 10,
    left: 16,
    width: SLIDER_WIDTH,
    height: 24,
    justifyContent: 'center',
  },
  track: {
    width: SLIDER_WIDTH,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
  },
  trackFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  stepMarkersContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: SLIDER_WIDTH,
    height: 12,
    zIndex: 2,
  },
  stepMarkerContainer: {
    position: 'absolute',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    top: -4,
  },
  stepMarker: {
    width: 2,
    height: 10,
    borderRadius: 1,
  },
  thumbContainer: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  thumbInner: {
    width: 24,
    height: 24,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  thumb: {
    position: 'absolute',
    top: 10,
    width: 24,
    height: 24,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,

    paddingHorizontal: 10,
    paddingVertical: 10,
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
