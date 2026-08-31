import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Clock, ShieldAlert, ShieldCheck, UserX } from 'lucide-react-native';

export default function TimelineTrack({ frames = [] }) {
  const [selectedFrame, setSelectedFrame] = useState(null);

  if (!frames || frames.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Clock size={14} color={Colors.textSecondary} />
          <Text style={styles.title}>Frame Timeline ({frames.length} sampled)</Text>
        </View>
        <Text style={styles.legendHelp}>Tap dot for details</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.trackContent}
      >
        {frames.map((frame, index) => {
          let dotStyle = styles.dotNone;
          let isDanger = false;
          let isSafe = false;

          if (frame.protected_identity_detected) {
            if (frame.ai_analysis?.result === 'AI_GENERATED') {
              dotStyle = styles.dotDanger;
              isDanger = true;
            } else {
              dotStyle = styles.dotSafe;
              isSafe = true;
            }
          }

          const isSelected = selectedFrame?.frame_number === frame.frame_number;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dotTouchable,
                isSelected && styles.dotSelectedWrap,
              ]}
              onPress={() => setSelectedFrame(frame)}
              activeOpacity={0.7}
            >
              <View style={[styles.dot, dotStyle, isSelected && styles.dotActive]} />
              <Text style={styles.timeLabel}>{frame.timestamp}s</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Selected Frame Detail Popup / Banner */}
      {selectedFrame && (
        <View
          style={[
            styles.detailCard,
            selectedFrame.ai_analysis?.result === 'AI_GENERATED'
              ? styles.detailDanger
              : selectedFrame.protected_identity_detected
              ? styles.detailSafe
              : styles.detailNeutral,
          ]}
        >
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>
              Frame #{selectedFrame.frame_number} ({selectedFrame.timestamp}s)
            </Text>
            <TouchableOpacity onPress={() => setSelectedFrame(null)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.detailBody}>
            {selectedFrame.protected_identity_detected ? (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Protected Person:</Text>
                  <Text style={styles.detailVal}>
                    {selectedFrame.identity_matches.map((m) => m.person_id).join(', ') || 'Matched'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Face Authenticity:</Text>
                  <Text
                    style={[
                      styles.detailVal,
                      selectedFrame.ai_analysis?.result === 'AI_GENERATED'
                        ? styles.valDanger
                        : styles.valSafe,
                    ]}
                  >
                    {selectedFrame.ai_analysis?.result === 'AI_GENERATED'
                      ? `🚨 AI Manipulated (${Math.round((selectedFrame.ai_analysis?.score || 0) * 100)}% conf)`
                      : `✅ Authentic / Real (${Math.round((1 - (selectedFrame.ai_analysis?.score || 0)) * 100)}% conf)`}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.detailRow}>
                <UserX size={14} color={Colors.textMuted} />
                <Text style={styles.detailMuted}>
                  No protected identity found in this sampled frame.
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.miniDot, styles.dotSafe]} />
          <Text style={styles.legendText}>Authentic</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.miniDot, styles.dotDanger]} />
          <Text style={styles.legendText}>Manipulated</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.miniDot, styles.dotNone]} />
          <Text style={styles.legendText}>No Identity</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  legendHelp: {
    fontSize: 10,
    color: Colors.lilac,
  },
  trackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  dotTouchable: {
    alignItems: 'center',
    padding: 4,
  },
  dotSelectedWrap: {
    backgroundColor: Colors.lilacLight,
    borderRadius: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginBottom: 4,
  },
  dotActive: {
    transform: [{ scale: 1.25 }],
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  dotSafe: {
    backgroundColor: '#10b981',
  },
  dotDanger: {
    backgroundColor: '#ef4444',
  },
  dotNone: {
    backgroundColor: '#cbd5e1',
  },
  timeLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  detailCard: {
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
  },
  detailSafe: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.successBorder,
  },
  detailDanger: {
    backgroundColor: Colors.dangerLight,
    borderColor: Colors.dangerBorder,
  },
  detailNeutral: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  closeText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  detailBody: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailKey: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  detailVal: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
  },
  valSafe: {
    color: Colors.successText,
  },
  valDanger: {
    color: Colors.dangerText,
  },
  detailMuted: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
});
