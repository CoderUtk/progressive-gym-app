import React from 'react';
import { Image } from 'react-native';

export default function AppLogo({ size = 26 }) {
  return (
    <Image
      source={require('../assets/icon.png')}
      style={{ width: size, height: size, borderRadius: size / 4, marginLeft: 12 }}
    />
  );
}
