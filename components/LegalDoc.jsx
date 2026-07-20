import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';
import { EFFECTIVE } from '../lib/legal';

// Renders a structured legal/policy doc (see lib/legal.js block types).
export default function LegalDoc({ doc }) {
  return (
    <View>
      <Text style={s.docTitle}>{doc.title}</Text>
      {doc.subtitle ? <Text style={s.docSubtitle}>{doc.subtitle}</Text> : null}
      <Text style={s.effective}>{EFFECTIVE}</Text>

      {doc.blocks.map((b, i) => {
        if (b.type === 'h') return <Text key={i} style={s.h}>{b.text}</Text>;
        if (b.type === 'sub') return <Text key={i} style={s.sub}>{b.text}</Text>;
        if (b.type === 'p') return <Text key={i} style={s.p}>{b.text}</Text>;
        if (b.type === 'ul') {
          return (
            <View key={i} style={s.ul}>
              {b.items.map((item, j) => (
                <View key={j} style={s.li}>
                  <Text style={s.bullet}>•</Text>
                  <Text style={s.liText}>{item}</Text>
                </View>
              ))}
            </View>
          );
        }
        return null;
      })}
    </View>
  );
}

const s = StyleSheet.create({
  docTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.ink, letterSpacing: -0.4, marginBottom: 4 },
  docSubtitle: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.slate, marginBottom: 8 },
  effective: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: '#9AA0B2', marginBottom: 20 },
  h: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16, color: colors.ink, marginTop: 20, marginBottom: 8 },
  sub: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: colors.ink, marginTop: 10, marginBottom: 4 },
  p: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#3A3F4C', lineHeight: 22, marginBottom: 8 },
  ul: { marginBottom: 8, marginTop: 2 },
  li: { flexDirection: 'row', marginBottom: 6, paddingRight: 4 },
  bullet: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.violet, marginRight: 8, lineHeight: 22 },
  liText: { flex: 1, fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#3A3F4C', lineHeight: 22 },
});
