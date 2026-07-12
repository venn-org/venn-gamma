import { Platform, Alert as NativeAlert } from 'react-native';

export const Alert = Platform.OS === 'web'
  ? {
      alert: (title, message, buttons) => {
        // Simple web fallback for Alert
        if (buttons && buttons.length > 0) {
          const defaultBtn = buttons.find(b => b.style !== 'cancel') || buttons[0];
          const cancelBtn = buttons.find(b => b.style === 'cancel');
          if (cancelBtn) {
            const result = window.confirm(`${title}\n\n${message}`);
            if (result && defaultBtn.onPress) defaultBtn.onPress();
            else if (!result && cancelBtn.onPress) cancelBtn.onPress();
          } else {
            window.alert(`${title}\n\n${message}`);
            if (defaultBtn.onPress) defaultBtn.onPress();
          }
        } else {
          window.alert(`${title}\n\n${message}`);
        }
      }
    }
  : NativeAlert;
