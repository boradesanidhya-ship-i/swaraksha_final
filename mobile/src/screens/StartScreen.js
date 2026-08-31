import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Colors, Shadows } from '../theme/colors';
import {
  Camera,
  ImagePlus,
  UploadCloud,
  FolderOpen,
  FileVideo,
  Check,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react-native';

export default function StartScreen({
  backendOnline,
  notice,
  onScan,
  onReference,
  onUploadImage,
  onDirectory,
  onVideo,
  onOpenSettings,
}) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Section */}
      <View style={styles.heroCard}>
        <View style={styles.heroIconWrapper}>
          <Image
            source={require('../../assets/icon2.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.kicker}>IDENTITY PROTECTION CONSOLE</Text>
        <Text style={styles.heroTitle}>Protect a face. Check a file.</Text>
        <Text style={styles.heroDescription}>
          Use your camera, trusted reference images, or video files to inspect identity matches and AI authenticity.
        </Text>

        {/* Backend Note */}
        <TouchableOpacity
          style={[
            styles.backendBadge,
            backendOnline ? styles.backendReady : styles.backendOffline,
          ]}
          onPress={onOpenSettings}
          activeOpacity={0.8}
        >
          {backendOnline ? (
            <ShieldCheck size={15} color={Colors.successText} />
          ) : (
            <ShieldAlert size={15} color={Colors.dangerText} />
          )}
          <Text
            style={[
              styles.backendText,
              backendOnline ? styles.backendTextReady : styles.backendTextOffline,
            ]}
          >
            {backendOnline ? 'Protection service ready (Connected)' : 'Backend offline · Tap to configure IP'}
          </Text>
        </TouchableOpacity>

        {notice ? (
          <View style={styles.noticeBanner}>
            <Check size={15} color={Colors.successText} />
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}
      </View>

      {/* Choice Grid */}
      <View style={styles.choiceSection}>
        <Text style={styles.sectionHeader}>Quick Actions</Text>

        {/* Primary Choice: Scan Face */}
        <TouchableOpacity
          style={[styles.choiceCard, styles.primaryChoiceCard]}
          onPress={onScan}
          activeOpacity={0.85}
        >
          <View style={[styles.choiceIconBox, styles.primaryIconBox]}>
            <Camera size={22} color="#ffffff" />
          </View>
          <View style={styles.choiceTextContainer}>
            <Text style={styles.primaryChoiceTitle}>Scan my face</Text>
            <Text style={styles.choiceSubtitle}>
              Use your camera to capture and inspect a live face photo.
            </Text>
          </View>
          <ChevronRight size={20} color={Colors.primary} />
        </TouchableOpacity>

        {/* Second Choice: Add Reference Images */}
        <TouchableOpacity
          style={styles.choiceCard}
          onPress={onReference}
          activeOpacity={0.85}
        >
          <View style={styles.choiceIconBox}>
            <ImagePlus size={22} color={Colors.primary} />
          </View>
          <View style={styles.choiceTextContainer}>
            <Text style={styles.choiceTitle}>Add reference images</Text>
            <Text style={styles.choiceSubtitle}>
              Register 5 or more trusted photos to create a protected identity.
            </Text>
          </View>
          <ChevronRight size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Upload Image alternative */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={onUploadImage}
          activeOpacity={0.7}
        >
          <UploadCloud size={18} color={Colors.primary} />
          <Text style={styles.actionRowText}>Or upload an image to scan</Text>
        </TouchableOpacity>

        {/* Secondary Utility Links */}
        <View style={styles.utilityGrid}>
          <TouchableOpacity
            style={styles.utilityCard}
            onPress={onDirectory}
            activeOpacity={0.8}
          >
            <FolderOpen size={20} color={Colors.primary} />
            <Text style={styles.utilityTitle}>Protected Directory</Text>
            <Text style={styles.utilitySub}>Manage registered people</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.utilityCard}
            onPress={onVideo}
            activeOpacity={0.8}
          >
            <FileVideo size={20} color={Colors.primary} />
            <Text style={styles.utilityTitle}>Video Lab</Text>
            <Text style={styles.utilitySub}>Scan video files</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 20,
    ...Shadows.sm,
  },
  heroIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.lilacSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroImage: {
    width: 48,
    height: 48,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Colors.lilac,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  backendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    width: '100%',
    justifyContent: 'center',
  },
  backendReady: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.successBorder,
  },
  backendOffline: {
    backgroundColor: Colors.dangerLight,
    borderColor: Colors.dangerBorder,
  },
  backendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  backendTextReady: {
    color: Colors.successText,
  },
  backendTextOffline: {
    color: Colors.dangerText,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    borderColor: Colors.successBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginTop: 10,
    width: '100%',
  },
  noticeText: {
    fontSize: 12,
    color: Colors.successText,
    fontWeight: '600',
    flex: 1,
  },
  choiceSection: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  primaryChoiceCard: {
    borderColor: Colors.lilac,
    backgroundColor: Colors.surfaceSubtle,
  },
  choiceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.lilacSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  primaryIconBox: {
    backgroundColor: Colors.primary,
  },
  choiceTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  primaryChoiceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 2,
  },
  choiceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  choiceSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
  },
  actionRowText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  utilityGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  utilityCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  utilityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 2,
  },
  utilitySub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
