import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../theme/colors';
import { Terminal, ChevronUp, ChevronDown } from 'lucide-react-native';

export default function ActivityTerminal({ entries = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={styles.terminalContainer}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <View style={styles.dotsRow}>
            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
            <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
            <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
          </View>
          <Text style={styles.headerTitle}>SWARAKSHA process monitor</Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.entriesCount}>{entries.length} log(s)</Text>
          {isExpanded ? (
            <ChevronDown size={16} color={Colors.terminalPrompt} />
          ) : (
            <ChevronUp size={16} color={Colors.terminalPrompt} />
          )}
        </View>
      </TouchableOpacity>

      {isExpanded ? (
        <ScrollView style={styles.bodyExpanded} nestedScrollEnabled>
          {entries.map((entry, idx) => (
            <Text key={idx} style={styles.logLine}>
              <Text style={styles.promptSymbol}>› </Text>
              {entry}
            </Text>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.bodyCollapsed}>
          <Text style={styles.logLineLatest} numberOfLines={1}>
            <Text style={styles.promptSymbol}>› </Text>
            {entries[entries.length - 1] || 'System ready.'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  terminalContainer: {
    backgroundColor: Colors.terminalBg,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2f2b3e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.terminalHeader,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e2dff0',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entriesCount: {
    fontSize: 10,
    color: '#8b84a6',
  },
  bodyExpanded: {
    maxHeight: 140,
    padding: 10,
  },
  bodyCollapsed: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  logLine: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.terminalText,
    marginBottom: 4,
    lineHeight: 16,
  },
  logLineLatest: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.terminalText,
  },
  promptSymbol: {
    color: Colors.terminalPrompt,
    fontWeight: '700',
  },
});
