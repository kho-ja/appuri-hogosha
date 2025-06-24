import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@rneui/themed';

const PopupMenu = ({
  options,
  selectedValue,
}: {
  options: { label: string; action: () => void }[];
  selectedValue: { label: string; action: () => void };
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [selectedOption, setSelectedOption] = useState(
    selectedValue || options[0]
  );
  const handleToggleMenu = () => setShowMenu(!showMenu);
  const handleMenuOption = (option: any) => {
    option.action();
    handleSelectOption(option);
  };
  const handleSelectOption = (option: any) => {
    setSelectedOption(option);
    setShowMenu(false);
  };
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';
  return (
    <ThemedView style={styles.container}>
      <Pressable onPress={handleToggleMenu} style={styles.selectPlaceholder}>
        <ThemedText>{selectedOption.label}</ThemedText>
        <TabBarIcon
          name={showMenu ? 'chevron-up' : 'chevron-down'}
          size={18}
          color='#c2c2c2'
        />
      </Pressable>

      {showMenu && (
        <ThemedView
          style={[
            styles.menu,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.mode === 'light' ? '#D1D5DB' : '#374151',
            },
          ]}
        >
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.option}
              onPress={() => handleMenuOption(option)}
            >
              <ThemedText
                style={[
                  styles.optionText,
                  { color: isDark ? 'white' : '#4A5568' },
                ]}
              >
                {option.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>
      )}
    </ThemedView>
  );
};
export default PopupMenu;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexDirection: 'row',
  },
  menu: {
    width: 'auto',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderRadius: 4,
    padding: 8,
    position: 'absolute',
    top: '100%',
    left: 82,
    marginLeft: -80,
    borderColor: '#D1D5DB',
    borderWidth: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  optionText: {
    color: '#4A5568',
  },
  selectPlaceholder: {
    padding: 8,
    borderRadius: 4,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
