import 'react-native-get-random-values';
import React from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { Feather } from '@expo/vector-icons';
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import AppRoot from './components/AppRoot';
import { colors } from './utils/theme';

export default function App() {
  // Preload Feather glyphs + the Barlow superfamily. Barlow Condensed carries
  // the athletic, numbers-first display voice; Barlow (regular width) is the
  // body face — same designer, built to pair. On web Expo doesn't auto-inject
  // @font-face, so registering here is what makes them render at all; on native
  // it just avoids a flash of the fallback system font.
  const [fontsLoaded] = useFonts({
    ...Feather.font,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }
  return <AppRoot />;
}
