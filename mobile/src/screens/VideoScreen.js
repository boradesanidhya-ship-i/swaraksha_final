import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows } from '../theme/colors';
import {
  FileVideo,
  Shield,
  UploadCloud,
  X,
  Plus,
} from 'lucide-react-native';
import BackButton from '../components/BackButton';
import VideoResultCard from '../components/VideoResultCard';

export default function VideoScreen({
  videoFiles = [],
  setVideoFiles,
  videoResults = [],
  onScanVideo,
  isVideoScanning,
  onGoHome,
}) {
  const pickVideos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled && result.assets) {
        setVideoFiles((current) => [...current, ...result.assets]);
      }
    } catch (e) {
      console.error('Error picking videos:', e);
    }
  };

  const removeVideo = (indexToRemove) => {
    setVideoFiles((current) => current.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BackButton onPress={onGoHome} />

      <View style={styles.headingSection}>
        <Text style={styles.kicker}>VIDEO PROTECTION SCAN</Text>
        <Text style={styles.title}>Video Lab</Text>
        <Text style={styles.subtitle}>
          Queue one or more videos. Frames are dynamically sampled at 2.0s intervals to detect protected faces and inspect AI synthesis.
        </Text>
      </View>

      {/* Upload Drop Zone */}
      <View style={styles.uploadCard}>
        {videoFiles.length > 0 ? (
          <View>
            <View style={styles.queueHeader}>
              <Text style={styles.queueTitle}>Queued Videos ({videoFiles.length})</Text>
              <TouchableOpacity
                style={styles.addMoreBtn}
                onPress={pickVideos}
                disabled={isVideoScanning}
              >
                <Plus size={14} color={Colors.primary} />
                <Text style={styles.addMoreBtnText}>Add video</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.queueList}>
              {videoFiles.map((file, idx) => {
                const name = file.fileName || file.name || `Video_${idx + 1}.mp4`;
                const duration = file.duration ? `${Math.round(file.duration)}s` : '';

                return (
                  <View key={idx} style={styles.queueItem}>
                    <FileVideo size={18} color={Colors.primary} style={styles.queueIcon} />
                    <View style={styles.queueDetails}>
                      <Text style={styles.queueFileName} numberOfLines={1}>
                        {name}
                      </Text>
                      {duration ? (
                        <Text style={styles.queueMeta}>{duration}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={styles.removeQueueBtn}
                      onPress={() => removeVideo(idx)}
                      disabled={isVideoScanning}
                    >
                      <X size={14} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isVideoScanning ? styles.submitDisabled : null]}
              onPress={onScanVideo}
              disabled={isVideoScanning}
              activeOpacity={0.85}
            >
              {isVideoScanning ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Shield size={18} color="#ffffff" />
              )}
              <Text style={styles.submitButtonText}>
                {isVideoScanning
                  ? 'Processing Video Pipeline...'
                  : `Check ${videoFiles.length} Video${videoFiles.length === 1 ? '' : 's'}`}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.dropZone} onPress={pickVideos} activeOpacity={0.8}>
            <View style={styles.dropIconBox}>
              <FileVideo size={32} color={Colors.primary} />
            </View>
            <Text style={styles.dropTitle}>Select one or more videos</Text>
            <Text style={styles.dropSub}>MP4, MOV, AVI · files are sampled automatically</Text>
            <View style={styles.pickButton}>
              <Text style={styles.pickButtonText}>Browse Video Files</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Video Results Section */}
      <View style={styles.resultsSection}>
        <Text style={styles.resultsHeader}>Analysis Reports</Text>

        {videoResults.length > 0 ? (
          videoResults.map((result, idx) => (
            <VideoResultCard key={idx} result={result} />
          ))
        ) : (
          <View style={styles.emptyResults}>
            <FileVideo size={28} color={Colors.lilac} />
            <Text style={styles.emptyResultsTitle}>Results will appear here</Text>
            <Text style={styles.emptyResultsSub}>
              Each submitted video produces a detailed timeline report, identity match statistics, and deepfake verification.
            </Text>
          </View>
        )}
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
    paddingBottom: 50,
  },
  headingSection: {
    marginBottom: 16,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Colors.lilac,
    marginBottom: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  uploadCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 20,
    ...Shadows.sm,
  },
  dropZone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.lilac,
    borderStyle: 'dashed',
    backgroundColor: Colors.surfaceSubtle,
  },
  dropIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.lilacSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  dropTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  dropSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  pickButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pickButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  queueTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.lilacSubtle,
  },
  addMoreBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  queueList: {
    gap: 8,
    marginBottom: 14,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  queueIcon: {
    marginRight: 10,
  },
  queueDetails: {
    flex: 1,
  },
  queueFileName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  queueMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  removeQueueBtn: {
    padding: 6,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  submitDisabled: {
    backgroundColor: '#c4b5db',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  resultsSection: {
    marginTop: 4,
  },
  resultsHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  emptyResults: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  emptyResultsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 10,
    marginBottom: 4,
  },
  emptyResultsSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
