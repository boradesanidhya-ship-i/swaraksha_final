import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { FileSearch, AlertTriangle, CheckCircle2 } from 'lucide-react-native';

export default function MetadataPanel({ meta, title = 'File Metadata Forensics' }) {
  if (!meta || (!meta.flags?.length && meta.confidence === 'none')) {
    return null;
  }

  const isWarning = meta.confidence === 'high' || meta.confidence === 'medium';
  const confidenceLabel = (meta.confidence || 'NONE').toUpperCase();

  return (
    <View
      style={[
        styles.panel,
        isWarning ? styles.panelWarning : styles.panelClean,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <FileSearch size={16} color={isWarning ? Colors.warningText : Colors.successText} />
          <Text style={[styles.title, isWarning ? styles.titleWarning : styles.titleClean]}>
            {title}
          </Text>
        </View>
        <View
          style={[
            styles.confidenceBadge,
            isWarning ? styles.badgeWarning : styles.badgeClean,
          ]}
        >
          <Text
            style={[
              styles.confidenceText,
              isWarning ? styles.confidenceTextWarning : styles.confidenceTextClean,
            ]}
          >
            {confidenceLabel}
          </Text>
        </View>
      </View>

      {meta.flags && meta.flags.length > 0 ? (
        <View style={styles.flagsList}>
          {meta.flags.map((flag, idx) => (
            <View key={idx} style={styles.flagItem}>
              <AlertTriangle size={13} color={Colors.warningText} style={styles.flagIcon} />
              <Text style={styles.flagText}>{flag}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.cleanMessageRow}>
          <CheckCircle2 size={14} color={Colors.successText} />
          <Text style={styles.cleanMessageText}>No AI metadata markers detected in file.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
  },
  panelWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  panelClean: {
    backgroundColor: '#f0fdf4',
    borderColor: '#dcfce7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  titleWarning: {
    color: '#92400e',
  },
  titleClean: {
    color: '#166534',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
  },
  badgeClean: {
    backgroundColor: '#dcfce7',
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '800',
  },
  confidenceTextWarning: {
    color: '#b45309',
  },
  confidenceTextClean: {
    color: '#15803d',
  },
  flagsList: {
    marginTop: 4,
    gap: 6,
  },
  flagItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  flagIcon: {
    marginTop: 2,
  },
  flagText: {
    fontSize: 11,
    color: '#78350f',
    flex: 1,
    lineHeight: 16,
  },
  cleanMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cleanMessageText: {
    fontSize: 12,
    color: '#166534',
  },
});
