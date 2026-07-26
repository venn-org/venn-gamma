import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Renders one of the icon names from OPTION_ICONS (lib/enums). Names are
 * Ionicons by default; an `mci:` prefix selects MaterialCommunityIcons, which
 * covers the few glyphs Ionicons lacks (cigarette, drumstick, sprout).
 */
export default function OptionIcon({ name, size = 14, color }) {
  if (!name) return null;
  if (name.startsWith('mci:')) {
    return <MaterialCommunityIcons name={name.slice(4)} size={size} color={color} />;
  }
  return <Ionicons name={name} size={size} color={color} />;
}
