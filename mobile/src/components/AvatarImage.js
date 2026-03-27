import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://hawklets.com/api').replace(/\/api$/, '');

// Default mascot — shows only the head by zooming in (3× scale, top-aligned)
const MASCOT = require('../../assets/mascot.png');

/**
 * AvatarImage
 *
 * Props:
 *   avatarUrl  – path returned by the server, e.g. "/uploads/avatars/xxx.jpg"
 *               (null/undefined → show default mascot head)
 *   size       – diameter in pixels (default 80)
 *   style      – extra style applied to the outer container
 */
export default function AvatarImage({ avatarUrl, size = 80, style }) {
  const radius = size / 2;

  const containerStyle = [
    styles.circle,
    { width: size, height: size, borderRadius: radius },
    style,
  ];

  if (avatarUrl) {
    const fullUri = avatarUrl.startsWith('http') ? avatarUrl : `${API_BASE}${avatarUrl}`;
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: fullUri }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Mascot head crop: zoom 3× so only the top ~33% (the head) is visible
  const imgSize = size * 3;
  const offset = (imgSize - size) / 2; // horizontal centering

  return (
    <View style={containerStyle}>
      <Image
        source={MASCOT}
        style={{
          width: imgSize,
          height: imgSize,
          position: 'absolute',
          left: -offset,
          top: 0,
        }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    overflow: 'hidden',
    backgroundColor: '#E8F5E9',
  },
});
