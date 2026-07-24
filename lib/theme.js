import { Platform } from 'react-native';

// Brand hues are theme-independent — they read on both backgrounds.
const brand = {
  blue: '#335CFF',
  violet: '#8A5BFF',
  indigo: '#3A2FD6',
  error: '#E03E3E',
  red: '#FF4D6A',
  success: '#22C55E',
};

export const lightColors = {
  ...brand,
  ink: '#14161B',
  slate: '#5A6072',
  mist: '#E6E8EE',
  paper: '#FCFCFD',
  canvas: '#F2F3F7',
  card: '#fff',
  border: '#EDEEF2',
  inputBg: '#F2F3F7',
  placeholder: '#9AA0B2',

  // Pale accent washes behind icons/pills. In dark these become translucent
  // versions of the same hue instead of near-white blocks.
  tintBlue: '#EEF1FF',
  tintViolet: '#F3EEFF',
  tintGreen: '#EEFCF3',
  tintRed: '#FFF0F3',
  tintAmber: '#FDF5F0',
  tintNeutral: '#F2F3F7',
  divider: '#F0F0F4',
  avatarFallback: '#E2E8F0',
  unread: '#F8F9FF',
  track: '#EEF0FF',

  // Chrome. Top and bottom bars sit on opposite ends of the value range so
  // they frame the content instead of blending into it.
  header: '#335CFF',
  headerText: '#fff',
  tabBar: '#fff',
  tabBarBorder: '#E6E8EE',
  tabBarActive: '#335CFF',
  tabBarInactive: '#9AA0B2',
};

export const darkColors = {
  ...brand,
  // Lifted off pure black so elevated surfaces have somewhere to go.
  ink: '#F2F3F7',
  slate: '#A2A8BA',
  mist: '#2A2E3A',
  paper: '#0E1015',
  canvas: '#14161B',
  card: '#1C1F27',
  border: '#2A2E3A',
  inputBg: '#242833',
  placeholder: '#6B7285',

  // Same roles as light, but as low-alpha washes of the hue so they read as
  // tinted surfaces rather than white blocks on a dark page.
  tintBlue: 'rgba(51,92,255,0.18)',
  tintViolet: 'rgba(138,91,255,0.18)',
  tintGreen: 'rgba(34,197,94,0.16)',
  tintRed: 'rgba(255,77,106,0.16)',
  tintAmber: 'rgba(255,139,62,0.16)',
  tintNeutral: '#242833',
  divider: '#2A2E3A',
  avatarFallback: '#2E3340',
  unread: 'rgba(51,92,255,0.12)',
  track: '#2A2E3A',

  // Deeper blue so white header text keeps its contrast against a dark page.
  header: '#1E3ACC',
  headerText: '#fff',
  tabBar: '#1C1F27',
  tabBarBorder: '#2A2E3A',
  tabBarActive: '#7C97FF',
  tabBarInactive: '#6B7285',
};

// Default export kept as the light palette so screens that haven't been
// converted to useTheme() (auth, onboarding) keep rendering unchanged.
export const colors = lightColors;

export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_600SemiBold',
  body: 'System',
  mono: Platform.select({ ios: 'SpaceMono_400Regular', android: 'SpaceMono_400Regular' }),
};

export const gradientBlue = ['#335CFF', '#8A5BFF'];
export const gradientDark = ['#0a081e', '#1a1040', '#2d1b69'];
