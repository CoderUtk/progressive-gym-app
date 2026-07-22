import 'react-native-get-random-values';
import React from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { Feather } from '@expo/vector-icons';
import AppRoot from './components/AppRoot';
import { colors } from './utils/theme';

export default function App() {
  // Preload the Feather glyph font. Bundled fonts load automatically on
  // native RN; on web Expo doesn't auto-inject @font-face so icons render
  // as empty boxes until the font is explicitly registered. Rendering
  // nothing until it's ready avoids a flash of missing glyphs.
  const [fontsLoaded] = useFonts(Feather.font);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }
  return <AppRoot />;
}
