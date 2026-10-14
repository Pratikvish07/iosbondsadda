import { Alert, Platform } from 'react-native';

/**
 * Cross-platform dialogs. React Native's `Alert.alert` is a no-op on web, so any flow gated on its
 * buttons (sign out, confirm investment…) silently does nothing there. These helpers fall back to
 * the browser's native dialogs on web and return promises so callers can simply `await` them.
 */

const isWeb = Platform.OS === 'web';
const join = (title: string, message?: string) => (message ? `${title}\n\n${message}` : title);

export function confirm({
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  destructive = false,
}: {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}): Promise<boolean> {
  if (isWeb) return Promise.resolve(window.confirm(join(title, message)));

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      // Android: tapping outside the dialog dismisses it.
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function notify(title: string, message?: string): Promise<void> {
  if (isWeb) {
    window.alert(join(title, message));
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [{ text: 'OK', onPress: () => resolve() }], {
      cancelable: true,
      onDismiss: () => resolve(),
    });
  });
}
