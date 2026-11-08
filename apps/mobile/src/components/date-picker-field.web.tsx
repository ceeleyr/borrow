import { createElement } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';
import { Text, View } from 'react-native';
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

export function DatePickerField({ label, value, onChange, includeTime = false, minimumDate, testID }: DatePickerFieldProps) {
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>{label}</Text>
      {createElement('input', {
        type: 'date',
        value: value.slice(0, 10),
        min: minimumDate?.slice(0, 10),
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
          if (!event.currentTarget.value) return;
          const date = event.currentTarget.value;
          onChange(includeTime ? toDateTimeString(date) : date);
        },
        'aria-label': label,
        'data-testid': testID,
        style: inputStyle,
        title: formatDate(value),
      })}
    </View>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  boxSizing: 'border-box',
  backgroundColor: '#fff',
  border: '1px solid #d1d5db',
  borderRadius: radius.md,
  padding: `${space.sm}px ${space.md}px`,
  fontSize: 15,
  color: colors.text,
};
