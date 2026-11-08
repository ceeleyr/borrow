import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Button } from './ui';
import { colors, radius, space } from '@/constants/theme';
import { formatDate, toDateTimeString } from '@/lib/dates';

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  includeTime?: boolean;
  minimumDate?: string;
  testID?: string;
};

function toLocalDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function DatePickerField({ label, value, onChange, includeTime = false, minimumDate, testID }: DatePickerFieldProps) {
  const [iosPickerVisible, setIosPickerVisible] = useState(false);
  const pickerMinimumDate = minimumDate ? toLocalDate(minimumDate) : undefined;

  function emitDate(date: Date) {
    onChange(includeTime ? toDateTimeString(date) : toDateTimeString(date).slice(0, 10));
  }

  function openPicker() {
    const pickerValue = toLocalDate(value);
    if (process.env.EXPO_OS === 'ios') {
      setIosPickerVisible(true);
      return;
    }

    DateTimePickerAndroid.open({
      value: pickerValue,
      mode: 'date',
      minimumDate: pickerMinimumDate,
      onChange: (event, selectedDate) => {
        if (event.type === 'set' && selectedDate) emitDate(selectedDate);
      },
    });
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={openPicker}
        style={styles.input}
        testID={testID}>
        <Text style={styles.value}>{formatDate(value)}</Text>
        <Text style={styles.icon}>▦</Text>
      </Pressable>
      {process.env.EXPO_OS === 'ios' ? (
        <Modal transparent animationType="slide" visible={iosPickerVisible} onRequestClose={() => setIosPickerVisible(false)}>
          <View style={styles.backdrop}>
            <View style={styles.modal}>
              <DateTimePicker
                value={toLocalDate(value)}
                mode="date"
                display="spinner"
                minimumDate={pickerMinimumDate}
                onValueChange={(_event, date) => emitDate(date)}
              />
              <Button title="Pilih tanggal" onPress={() => setIosPickerVisible(false)} />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: space.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 11,
  },
  value: { fontSize: 15, color: colors.text },
  icon: { fontSize: 18, color: colors.muted },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0006' },
  modal: { backgroundColor: '#fff', padding: space.lg, paddingBottom: space.xl, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
});
