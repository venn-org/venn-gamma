import { Platform } from 'react-native';

export const colors = {
  blue: '#335CFF',
  violet: '#8A5BFF',
  indigo: '#3A2FD6',
  ink: '#14161B',
  slate: '#5A6072',
  mist: '#E6E8EE',
  paper: '#FCFCFD',
  canvas: '#F2F3F7',
  inputBg: '#F2F3F7',
  placeholder: '#9AA0B2',
  error: '#E03E3E',
  red: '#FF4D6A',
  success: '#22C55E',
};

export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_600SemiBold',
  body: 'System',
  mono: Platform.select({ ios: 'SpaceMono_400Regular', android: 'SpaceMono_400Regular' }),
};

export const gradientBlue = ['#335CFF', '#8A5BFF'];
export const gradientDark = ['#0a081e', '#1a1040', '#2d1b69'];
