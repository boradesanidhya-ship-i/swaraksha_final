import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Shadows } from '../theme/colors';
import { FileVideo, ShieldAlert, ShieldCheck, AlertCircle } from 'lucide-react-native';
import TimelineTrack from './TimelineTrack';
import MetadataPanel from './MetadataPanel';

export default function VideoResultCard({ result }) {
  // Unwrap if wrapped in { file, data, error }
  const data = result?.data || result;
  const fileName = result?.file?.name || result?.file?.fileName || result?.fileName || data?.fileName || 'Video Analysis';
  const hasError = !!result?.error || data?.final_status === 'ERROR' || !data?.video;

  if (hasError) {
    return (
      <View style={[styles.card, styles.cardError]}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <FileVideo size={18} color={Colors.dangerText} />
            <Text style={styles.fileName}>{fileName}</Text>
          </View>
          <View style={[styles.badge, styles.badgeDanger]}>
            <Text style={styles.badgeTextDanger}>ERROR</Text>
          </View>
        </View>
        <Text style={styles.errorSummary}>
          {result?.error || data?.summary || 'The backend could not process this video.'}
        </Text>
      </View>
    );
  }

  const { video, identity, ai_analysis, final_status, frames, summary, metadata_forensics } = data;
  const isDanger = final_status === 'POTENTIAL_AI_MANIPULATION';
  const isReview = final_status === 'REVIEW_REQUIRED';
  const personNames = identity?.person_ids?.length ? identity.person_ids.join(', ') : 'None';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <FileVideo size={18} color={Colors.primary} />
          <Text style={styles.fileName} numberOfLines={1}>
            {fileName}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            isDanger
              ? styles.badgeDanger
              : isReview
              ? styles.badgeWarning
              : styles.badgeSuccess,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              isDanger
                ? styles.badgeTextDanger
                : isReview
                ? styles.badgeTextWarning
                : styles.badgeTextSuccess,
            ]}
          >
            {(final_status || 'ANALYSIS COMPLETE').replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      <Text style={styles.summaryText}>{summary}</Text>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Protected Identity:</Text>
          <Text style={styles.statValue}>{personNames}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Identity Match Ratio:</Text>
          <Text style={styles.statValue}>
            {identity?.protected_identity_detected
              ? `${Math.round((identity.identity_frame_ratio || 0) * 100)}% of frames`
              : 'No match'}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Identity Frames:</Text>
          <Text style={styles.statValue}>
            {identity?.frames_with_identity || 0} / {video?.sampled_frames || 0}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>AI Suspicious Frames:</Text>
          <Text
            style={[
              styles.statValue,
              ai_analysis?.frames_flagged > 0 ? styles.valAlert : null,
            ]}
          >
            {ai_analysis?.frames_flagged || 0} / {ai_analysis?.frames_analyzed || 0}
          </Text>
        </View>
      </View>

      {/* Visual Timeline Track */}
      {frames && frames.length > 0 && (
        <TimelineTrack frames={frames} duration={video?.duration || 0} />
      )}

      {/* Metadata Forensics Section */}
      {metadata_forensics && (
        <MetadataPanel meta={metadata_forensics} title="Video Metadata Forensics" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  cardError: {
    backgroundColor: Colors.dangerLight,
    borderColor: Colors.dangerBorder,
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
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeSuccess: {
    backgroundColor: Colors.successLight,
  },
  badgeWarning: {
    backgroundColor: Colors.warningLight,
  },
  badgeDanger: {
    backgroundColor: Colors.dangerLight,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeTextSuccess: {
    color: Colors.successText,
  },
  badgeTextWarning: {
    color: Colors.warningText,
  },
  badgeTextDanger: {
    color: Colors.dangerText,
  },
  summaryText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  errorSummary: {
    fontSize: 12,
    color: Colors.dangerText,
    lineHeight: 16,
  },
  statsGrid: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  statValue: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
  },
  valAlert: {
    color: Colors.dangerText,
  },
});
