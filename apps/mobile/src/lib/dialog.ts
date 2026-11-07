import { Alert, Platform } from 'react-native';

/** Alert.alert tidak berfungsi di web, jadi dibungkus agar perilaku sama di semua platform. */
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmAction(opts: { title: string; message?: string; confirmText?: string; destructive?: boolean }): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(opts.message ? `${opts.title}\n\n${opts.message}` : opts.title));
  }
  return new Promise((resolve) => {
    Alert.alert(
      opts.title,
      opts.message,
      [
        { text: 'Batal', style: 'cancel', onPress: () => resolve(false) },
        { text: opts.confirmText ?? 'Ya', style: opts.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
