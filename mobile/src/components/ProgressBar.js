import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Shadows } from '../theme/colors';

export default function ProgressBar({ progress }) {
  if (!progress) return null;

  const { label, value = 0 } = progress;
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.labelRow}>
            <ActivityIndicator size="small" color={Colors.primary} style={styles.spinner} />
            <Text style={styles.label} numberOfLines={1}>
              {label || 'Processing...'}
            </Text>
          </View>
          <Text style={styles.percentText}>{clampedValue}%</Text>
        </View>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${clampedValue}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 8,
  },
  spinner: {
    transform: [{ scale: 0.8 }],
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  track: {
    height: 6,
    backgroundColor: Colors.lilacSubtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
});
