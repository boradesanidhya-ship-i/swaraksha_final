import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Shadows } from '../theme/colors';
import { FileVideo, ShieldAlert, ShieldCheck, AlertCircle } from 'lucide-react-native';
import TimelineTrack from './TimelineTrack';
import MetadataPanel from './MetadataPanel';

export default function VideoResultCard({ result }) {
  if (result.final_status === 'ERROR' || !result.video) {
    return (
      <View style={[styles.card, styles.cardError]}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <FileVideo size={18} color={Colors.dangerText} />
            <Text style={styles.fileName}>{result.fileName || 'Video Error'}</Text>
          </View>
          <View style={[styles.badge, styles.badgeDanger]}>
            <Text style={styles.badgeTextDanger}>ERROR</Text>
          </View>
        </View>
        <Text style={styles.errorSummary}>
          {result.summary || 'The backend could not process this video.'}
        </Text>
      </View>
    );
  }

  const { video, identity, ai_analysis, final_status, frames, summary, metadata_forensics } = result;
  const isDanger = final_status === 'POTENTIAL_AI_MANIPULATION';
  const isReview = final_status === 'REVIEW_REQUIRED';
  const personNames = identity?.person_ids?.length ? identity.person_ids.join(', ') : 'None';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <FileVideo size={18} color={Colors.primary} />
          <Text style={styles.fileName} numberOfLines={1}>
            {result.fileName}
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
            {final_status.replace(/_/g, ' ')}
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
            {identity.protected_identity_detected
              ? `${Math.round((identity.identity_frame_ratio || 0) * 100)}% of frames`
              : 'No match'}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Identity Frames:</Text>
          <Text style={styles.statValue}>
            {identity.frames_with_identity || 0} / {video.sampled_frames || 0}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>AI Suspicious Frames:</Text>
          <Text
            style={[
              styles.statValue,
              ai_analysis.frames_flagged > 0 ? styles.valAlert : null,
            ]}
          >
            {ai_analysis.frames_flagged || 0} / {ai_analysis.frames_analyzed || 0}
          </Text>
        </View>
      </View>

      {/* Overall Status Banner */}
      <View
        style={[
          styles.overallBanner,
          isDanger ? styles.bannerDanger : styles.bannerSafe,
        ]}
      >
        <View style={styles.bannerRow}>
          {isDanger ? (
            <ShieldAlert size={18} color={Colors.dangerText} />
          ) : (
            <ShieldCheck size={18} color={Colors.successText} />
          )}
          <Text
            style={[
              styles.bannerTitle,
              isDanger ? styles.textDanger : styles.textSafe,
            ]}
          >
            {isDanger ? 'POTENTIAL AI MANIPULATION' : 'NO THREAT DETECTED'}
          </Text>
        </View>
        <Text style={styles.bannerSub}>Status: {final_status.replace(/_/g, ' ')}</Text>
      </View>

      {/* Frame Timeline Track */}
      {frames && <TimelineTrack frames={frames} />}

      {/* Video Metadata Forensics */}
      {metadata_forensics && (
        <MetadataPanel meta={metadata_forensics} title="Video Container Forensics" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
    marginBottom: 10,
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
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeDanger: {
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
  },
  badgeSuccess: {
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  badgeWarning: {
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeTextDanger: {
    color: Colors.dangerText,
  },
  badgeTextSuccess: {
    color: Colors.successText,
  },
  badgeTextWarning: {
    color: Colors.warningText,
  },
  summaryText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  errorSummary: {
    fontSize: 13,
    color: Colors.dangerText,
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
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  valAlert: {
    color: Colors.dangerText,
  },
  overallBanner: {
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
  },
  bannerDanger: {
    backgroundColor: Colors.dangerLight,
    borderLeftColor: Colors.danger,
  },
  bannerSafe: {
    backgroundColor: Colors.lilacSubtle,
    borderLeftColor: Colors.primary,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textDanger: {
    color: Colors.dangerText,
  },
  textSafe: {
    color: Colors.primaryDark,
  },
  bannerSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
