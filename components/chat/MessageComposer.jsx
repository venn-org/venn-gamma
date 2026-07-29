import { memo, useCallback, useRef, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../../lib/ThemeContext';
import { LIMITS } from '../../config/flags';

// The receiver holds "Typing…" for a few seconds after each broadcast, so one
// ping every interval keeps it lit. Sending on every keystroke put a realtime
// message on the wire per character typed.
const TYPING_PING_INTERVAL_MS = 1500;

/**
 * The chat input bar, with the draft text as *local* state.
 *
 * This is the point: the draft used to live in ChatScreen alongside the
 * message list, so every keystroke re-rendered the entire FlatList and its
 * avatars. Keeping it here means typing re-renders one small component, and
 * the parent only hears about the text when a message is actually sent.
 */
function MessageComposer({ onSend, onTypingPing, bottomPad }) {
  const s = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const lastPingRef = useRef(0);

  const handleChange = useCallback(
    (next) => {
      setText(next);

      const now = Date.now();
      if (now - lastPingRef.current < TYPING_PING_INTERVAL_MS) return;
      lastPingRef.current = now;
      onTypingPing?.();
    },
    [onTypingPing],
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Cleared optimistically; onSend restores it if the send fails.
    setText('');
    onSend(trimmed, () => setText(trimmed));
  }, [text, onSend]);

  const canSend = text.trim().length > 0;

  return (
    <View style={[s.inputWrap, { paddingBottom: bottomPad }]}>
      <TextInput
        style={s.input}
        placeholder="Message..."
        placeholderTextColor={colors.placeholder}
        value={text}
        onChangeText={handleChange}
        maxLength={LIMITS.maxMessageLength}
        onSubmitEditing={handleSend}
        returnKeyType="send"
        accessibilityLabel="Message"
      />
      <TouchableOpacity
        style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
        onPress={handleSend}
        disabled={!canSend}
        activeOpacity={0.8}
        accessibilityLabel="Send message"
      >
        <Ionicons name="send" size={16} color="#fff" style={{ marginLeft: 2 }} />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      height: 44,
      backgroundColor: colors.canvas,
      borderRadius: 22,
      paddingHorizontal: 16,
      fontFamily: 'HankenGrotesk_400Regular',
      fontSize: 15,
      color: colors.ink,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.blue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { backgroundColor: colors.border },
  });

export default memo(MessageComposer);
