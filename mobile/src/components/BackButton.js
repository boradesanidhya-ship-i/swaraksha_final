import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '../theme/colors';

export default function BackButton({ onPress, label = 'Back' }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.7}>
      <ArrowLeft size={16} color={Colors.primary} />
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: Colors.lilacSubtle,
    marginBottom: 12,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});
