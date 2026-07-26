import { Platform, Alert as NativeAlert } from 'react-native';

/**
 * Cross-platform Alert.
 *
 * react-native-web has no working Alert implementation — calling it is a
 * no-op, which silently kills any confirmation dialog on the web build (a
 * "Delete account" button that does nothing when clicked, etc). Screens should
 * import Alert from here rather than from 'react-native'.
 *
 * The web branch maps RN's button array onto the browser primitives:
 *   - a cancel button present -> window.confirm, OK runs the non-cancel button
 *   - otherwise               -> window.alert, then the button's onPress
 */
const webAlert = (title, message, buttons) => {
  // filter(Boolean) so a message-less alert doesn't render "title\n\nundefined".
  const body = [title, message].filter(Boolean).join('\n\n');

  if (!buttons || buttons.length === 0) {
    window.alert(body);
    return;
  }

  // The action button is the first non-cancel one; RN convention puts cancel
  // first, so this can't just be buttons[0].
  const actionBtn = buttons.find((b) => b.style !== 'cancel') ?? buttons[0];
  const cancelBtn = buttons.find((b) => b.style === 'cancel');

  if (cancelBtn) {
    if (window.confirm(body)) actionBtn?.onPress?.();
    else cancelBtn.onPress?.();
    return;
  }

  window.alert(body);
  actionBtn?.onPress?.();
};

export const Alert = Platform.OS === 'web' ? { alert: webAlert } : NativeAlert;
