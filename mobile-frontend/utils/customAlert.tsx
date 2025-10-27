import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  useColorScheme,
} from 'react-native';

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

let alertQueueRef: {
  show: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) => void;
} | null = null;

const { height: screenHeight } = Dimensions.get('window');

// Position alert higher to avoid bottom tabs (about 20% from top instead of centered)
const ALERT_TOP_OFFSET = screenHeight * 0.2;

class CustomAlert {
  static alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ): void {
    if (alertQueueRef) {
      alertQueueRef.show(title, message, buttons, options);
    }
  }
}

interface AlertProviderProps {
  children: React.ReactNode;
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [alertState, setAlertState] = React.useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const show = React.useCallback(
    (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      options?: AlertOptions
    ) => {
      const defaultButtons: AlertButton[] = [{ text: 'OK', style: 'default' }];
      setAlertState({
        visible: true,
        title,
        message,
        buttons: buttons || defaultButtons,
        options,
      });
    },
    []
  );

  const hide = React.useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
    if (alertState.options?.onDismiss) {
      alertState.options.onDismiss();
    }
  }, [alertState.options]);

  React.useEffect(() => {
    alertQueueRef = { show };
    return () => {
      alertQueueRef = null;
    };
  }, [show]);

  const handleButtonPress = (button: AlertButton) => {
    hide();
    if (button.onPress) {
      button.onPress();
    }
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'cancel':
        return styles.cancelButton;
      case 'destructive':
        return styles.destructiveButton;
      default:
        return styles.defaultButton;
    }
  };

  const getButtonTextStyle = (style?: string) => {
    switch (style) {
      case 'cancel':
        return [styles.cancelButtonText, isDark && styles.darkText];
      case 'destructive':
        return styles.destructiveButtonText;
      default:
        return [styles.defaultButtonText, isDark && styles.darkText];
    }
  };

  const alertContainerStyle = [
    styles.alertContainer,
    isDark && styles.darkAlertContainer,
  ];

  const titleStyle = [styles.title, isDark && styles.darkText];
  const messageStyle = [styles.message, isDark && styles.darkText];
  const buttonsContainerStyle = [
    styles.buttonsContainer,
    isDark && styles.darkBorder,
  ];
  const buttonStyle = (button: AlertButton, isLast: boolean) => [
    styles.button,
    getButtonStyle(button.style),
    !isLast && styles.buttonBorder,
    !isLast && isDark && styles.darkBorder,
    alertState.buttons.length === 1 && styles.singleButton,
  ];

  return (
    <>
      {children}
      <Modal
        transparent
        visible={alertState.visible}
        animationType='fade'
        onRequestClose={
          alertState.options?.cancelable !== false ? hide : undefined
        }
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={alertState.options?.cancelable !== false ? hide : undefined}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            <View style={alertContainerStyle}>
              <Text style={titleStyle}>{alertState.title}</Text>
              {alertState.message ? (
                <Text style={messageStyle}>{alertState.message}</Text>
              ) : null}
              <View style={buttonsContainerStyle}>
                {alertState.buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={buttonStyle(
                      button,
                      index === alertState.buttons.length - 1
                    )}
                    onPress={() => handleButtonPress(button)}
                  >
                    <Text style={getButtonTextStyle(button.style)}>
                      {button.text || 'OK'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: ALERT_TOP_OFFSET,
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: 'white',
    borderRadius: 14,
    minWidth: 270,
    maxWidth: 320,
    padding: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  darkAlertContainer: {
    backgroundColor: '#1c1c1e',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 19,
    marginHorizontal: 16,
    marginBottom: 2,
    color: '#000',
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 3,
    marginHorizontal: 16,
    marginBottom: 21,
    color: '#000',
  },
  darkText: {
    color: '#fff',
  },
  buttonsContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#dbdbdf',
    flexDirection: 'row',
  },
  darkBorder: {
    borderTopColor: '#38383a',
    borderRightColor: '#38383a',
  },
  button: {
    flex: 1,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#dbdbdf',
  },
  singleButton: {
    borderRightWidth: 0,
  },
  buttonText: {
    fontSize: 17,
  },
  defaultButton: {
    backgroundColor: 'transparent',
  },
  defaultButtonText: {
    color: '#007AFF',
    fontWeight: '400',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  destructiveButton: {
    backgroundColor: 'transparent',
  },
  destructiveButtonText: {
    color: '#FF3B30',
    fontWeight: '400',
  },
});

export default CustomAlert;
