import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar as RNCalendar } from 'react-native-calendars';
import { colors } from '../lib/theme';

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const formatDisplay = (dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${MONTH_LABELS[m - 1].slice(0, 3)} ${d}, ${y}`;
};

const pad2 = (n) => String(n).padStart(2, '0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const clampToBounds = (dateStr, minDate, maxDate) => {
  if (minDate && dateStr < minDate) return minDate;
  if (maxDate && dateStr > maxDate) return maxDate;
  return dateStr;
};
const shiftYear = (dateStr, delta) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y + delta}-${pad2(m)}-${pad2(d)}`;
};

// Thin wrapper around react-native-calendars' <Calendar> (a battle-tested,
// pure-JS calendar with react-native-web support — this app runs on native
// and web, and the standard native-only date pickers don't work on web).
// Collapsed behind a field button matching the rest of this form's inputs;
// tapping expands the month grid inline below it, same interaction as
// edit-profile.jsx's PromptPicker.
export default function Calendar({ value, onChange, minDate, maxDate, placeholder = 'Select a date' }) {
  const [expanded, setExpanded] = useState(false);
  // react-native-calendars only exposes month-step arrows in its header —
  // stepping from today back to a birth year one month at a time is ~200+
  // taps, which reads as the picker being "stuck". Track the visible month
  // ourselves so we can add real year-jump buttons; `key` forces a remount
  // when we jump years since RNCalendar treats `current` as initial-only.
  const [viewDate, setViewDate] = useState(() => clampToBounds(value || maxDate || todayStr(), minDate, maxDate));

  const jumpYear = (delta) => setViewDate((v) => clampToBounds(shiftYear(v, delta), minDate, maxDate));

  return (
    <View>
      <TouchableOpacity
        style={s.field}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <Text style={value ? s.fieldValue : s.fieldPlaceholder}>
          {formatDisplay(value) ?? placeholder}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'calendar-outline'} size={18} color={colors.slate} />
      </TouchableOpacity>

      {expanded && (
        <View style={s.panel}>
          <View style={s.yearNav}>
            <TouchableOpacity onPress={() => jumpYear(-1)} style={s.yearBtn} activeOpacity={0.7}>
              <Ionicons name="play-back" size={13} color={colors.ink} />
              <Text style={s.yearBtnText}>Year</Text>
            </TouchableOpacity>
            <Text style={s.yearNavLabel}>{viewDate.slice(0, 4)}</Text>
            <TouchableOpacity onPress={() => jumpYear(1)} style={s.yearBtn} activeOpacity={0.7}>
              <Text style={s.yearBtnText}>Year</Text>
              <Ionicons name="play-forward" size={13} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <RNCalendar
            key={viewDate.slice(0, 7)}
            current={viewDate}
            minDate={minDate}
            maxDate={maxDate}
            onMonthChange={(m) => setViewDate(m.dateString)}
            onDayPress={(day) => {
              onChange(day.dateString);
              setExpanded(false);
            }}
            markedDates={value ? { [value]: { selected: true, selectedColor: colors.blue } } : {}}
            enableSwipeMonths
            theme={{
              backgroundColor: '#fff',
              calendarBackground: '#fff',
              textSectionTitleColor: colors.slate,
              selectedDayBackgroundColor: colors.blue,
              selectedDayTextColor: '#fff',
              todayTextColor: colors.blue,
              dayTextColor: colors.ink,
              textDisabledColor: colors.mist,
              arrowColor: colors.ink,
              monthTextColor: colors.ink,
              textDayFontFamily: 'HankenGrotesk_400Regular',
              textMonthFontFamily: 'HankenGrotesk_700Bold',
              textDayHeaderFontFamily: 'HankenGrotesk_600SemiBold',
              textDayFontSize: 13,
              textMonthFontSize: 14,
              textDayHeaderFontSize: 11,
            }}
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.inputBg, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  fieldValue: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink },
  fieldPlaceholder: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.placeholder },

  panel: {
    marginTop: 8, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EDEEF2',
  },

  yearNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.canvas,
    borderBottomWidth: 1, borderBottomColor: '#EDEEF2',
  },
  yearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  yearBtnText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11, color: colors.ink },
  yearNavLabel: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: colors.slate },
});
