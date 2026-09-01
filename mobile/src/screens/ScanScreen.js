import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows } from '../theme/colors';
import {
  Camera,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  X,
  Check,
  UserCheck,
  UserX,
  Sparkles,
} from 'lucide-react-native';
import BackButton from '../components/BackButton';
import MetadataPanel from '../components/MetadataPanel';

export default function ScanScreen({
  onGoHome,
  onScanImage,
  isScanning,
  scanResult,
  capturedImageUri,
  setCapturedImageUri,
}) {
  const [facing, setFacing] = useState('front');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: false,
        });
        if (photo?.uri) {
          setCapturedImageUri(photo.uri);
        }
      } catch (e) {
        console.error('Failed to take picture:', e);
      }
    }
  };

  const pickImageFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setCapturedImageUri(result.assets[0].uri);
    }
  };

  const handleRetake = () => {
    setCapturedImageUri(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BackButton onPress={onGoHome} />

      <View style={styles.headingSection}>
        <Text style={styles.kicker}>LIVE FACE SCAN</Text>
        <Text style={styles.title}>Look into the camera</Text>
        <Text style={styles.subtitle}>
          Center your face in the frame. We’ll capture one snapshot and verify identity matches & AI authenticity.
        </Text>
      </View>

      {/* Camera / Capture Panel */}
      <View style={styles.cameraCard}>
        {capturedImageUri ? (
          <View style={styles.previewWrapper}>
            <Image
              source={{ uri: capturedImageUri }}
              style={styles.capturedImage}
              resizeMode="cover"
            />
            <View style={styles.previewTag}>
              <Text style={styles.previewTagText}>Snapshot ready</Text>
            </View>
          </View>
        ) : !permission ? (
          <View style={styles.cameraPlaceholder}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.placeholderText}>Checking camera permissions...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.cameraPlaceholder}>
            <ShieldAlert size={36} color={Colors.warningText} />
            <Text style={styles.permTitle}>Camera access needed</Text>
            <Text style={styles.permSub}>
              We need camera permission to take a live photo for scanning.
            </Text>
            <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
              <Text style={styles.permButtonText}>Allow Camera Access</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={styles.cameraView}
              facing={facing}
              ref={cameraRef}
            />
            <TouchableOpacity
              style={styles.flipButton}
              onPress={toggleCameraFacing}
              activeOpacity={0.8}
            >
              <RotateCcw size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Camera Control Actions */}
        <View style={styles.cameraControls}>
          {capturedImageUri ? (
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={handleRetake}
                disabled={isScanning}
                activeOpacity={0.8}
              >
                <X size={16} color={Colors.textSecondary} />
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => onScanImage(capturedImageUri)}
                disabled={isScanning}
                activeOpacity={0.8}
              >
                {isScanning ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Shield size={16} color="#ffffff" />
                )}
                <Text style={styles.scanButtonText}>
                  {isScanning ? 'Checking...' : 'Check this face'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
              disabled={!permission?.granted}
              activeOpacity={0.85}
            >
              <View style={styles.captureInnerCircle}>
                <Camera size={24} color="#ffffff" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Gallery Fallback Option */}
      <TouchableOpacity
        style={styles.galleryButton}
        onPress={pickImageFromGallery}
        activeOpacity={0.7}
      >
        <UploadCloud size={16} color={Colors.primary} />
        <Text style={styles.galleryButtonText}>Prefer a file? Upload photo from gallery</Text>
      </TouchableOpacity>

      {/* Result Section */}
      {scanResult ? (
        <View style={styles.resultSection}>
          <Text style={styles.resultHeading}>Scan Findings</Text>
          <ScanResultCard result={scanResult} />
        </View>
      ) : (
        <View style={styles.placeholderResultCard}>
          <ShieldAlert size={28} color={Colors.lilac} />
          <Text style={styles.placeholderResultTitle}>Your result will appear here</Text>
          <Text style={styles.placeholderResultText}>
            We'll search for protected identities and run DeepFace & Vision Transformer authenticity models.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function ScanResultCard({ result }) {
  const isError = result.overall_action === 'ERROR';
  const isBlocked = result.overall_action === 'BLOCK';

  return (
    <View style={styles.resultCard}>
      {/* Verdict Banner */}
      <View
        style={[
          styles.verdictBanner,
          isError
            ? styles.verdictError
            : isBlocked
            ? styles.verdictBlocked
            : styles.verdictCleared,
        ]}
      >
        {isError ? (
          <ShieldAlert size={24} color={Colors.dangerText} />
        ) : isBlocked ? (
          <ShieldAlert size={24} color={Colors.dangerText} />
        ) : (
          <ShieldCheck size={24} color={Colors.successText} />
        )}
        <View style={styles.verdictTextContainer}>
          <Text
            style={[
              styles.verdictEyebrow,
              isBlocked ? styles.textBlocked : isError ? styles.textError : styles.textCleared,
            ]}
          >
            {isError ? 'CONNECTION PROBLEM' : isBlocked ? 'ACTION REQUIRED' : 'PROTECTION CHECK PASSED'}
          </Text>
          <Text
            style={[
              styles.verdictTitle,
              isBlocked ? styles.textBlocked : isError ? styles.textError : styles.textCleared,
            ]}
          >
            {isError
              ? 'Could not analyze'
              : isBlocked
              ? 'Potential manipulation found'
              : 'No threat detected'}
          </Text>
        </View>
      </View>

      <Text style={styles.resultSummary}>{result.summary}</Text>

      {/* Detected Faces Summary Row */}
      {!isError && (
        <View style={styles.statCountersRow}>
          <View style={styles.statChip}>
            <Text style={styles.statChipNumber}>{result.faces_detected || 0}</Text>
            <Text style={styles.statChipLabel}>Faces Detected</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statChipNumber}>
              {result.results?.filter((r) => r.person_id).length || 0}
            </Text>
            <Text style={styles.statChipLabel}>Protected Matches</Text>
          </View>
        </View>
      )}

      {/* Per Face Results */}
      {result.results?.map((face, index) => (
        <View
          key={index}
          style={[
            styles.faceItem,
            face.action === 'BLOCK' ? styles.faceItemBlocked : styles.faceItemAllowed,
          ]}
        >
          <View style={styles.faceIconBox}>
            {face.action === 'BLOCK' ? (
              <ShieldAlert size={16} color={Colors.dangerText} />
            ) : (
              <Check size={16} color={Colors.successText} />
            )}
          </View>
          <View style={styles.faceDetails}>
            <Text style={styles.faceName}>
              {face.name ? `${face.name} (${face.person_id})` : 'Unregistered Face'}
            </Text>
            <Text style={styles.faceReason}>{face.reason}</Text>
          </View>
        </View>
      ))}

      {/* Metadata Forensics Panel */}
      {result.metadata_forensics && (
        <MetadataPanel meta={result.metadata_forensics} title="Image Metadata Forensics" />
      )}

      {/* Auto Email Report Indicator */}
      <View style={styles.emailDispatchedRow}>
        <Mail size={14} color={Colors.primary} style={{ marginRight: 6 }} />
        <Text style={styles.emailDispatchedText}>
          Forensic report automatically archived & dispatched via email
        </Text>
      </View>
    </View>
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
  cameraCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 12,
    ...Shadows.md,
  },
  cameraWrapper: {
    height: 320,
    width: '100%',
    position: 'relative',
    backgroundColor: '#000000',
  },
  cameraView: {
    flex: 1,
  },
  flipButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewWrapper: {
    height: 320,
    width: '100%',
    position: 'relative',
  },
  capturedImage: {
    width: '100%',
    height: '100%',
  },
  previewTag: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  previewTagText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },
  cameraPlaceholder: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.surfaceSubtle,
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  permTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 10,
  },
  permSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  permButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  permButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  cameraControls: {
    padding: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  captureButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.lilacLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInnerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.lilacSubtle,
  },
  retakeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  scanButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  scanButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  galleryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  resultSection: {
    marginTop: 8,
  },
  resultHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  placeholderResultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  placeholderResultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 10,
    marginBottom: 4,
  },
  placeholderResultText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  verdictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
  },
  verdictCleared: {
    backgroundColor: Colors.successLight,
  },
  verdictBlocked: {
    backgroundColor: Colors.dangerLight,
  },
  verdictError: {
    backgroundColor: Colors.warningLight,
  },
  verdictTextContainer: {
    flex: 1,
  },
  verdictEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  verdictTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  textCleared: {
    color: Colors.successText,
  },
  textBlocked: {
    color: Colors.dangerText,
  },
  textError: {
    color: Colors.warningText,
  },
  resultSummary: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  statCountersRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statChip: {
    flex: 1,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statChipNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  statChipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  faceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    gap: 10,
  },
  faceItemAllowed: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.successBorder,
  },
  faceItemBlocked: {
    backgroundColor: Colors.dangerLight,
    borderColor: Colors.dangerBorder,
  },
  faceIconBox: {
    marginTop: 2,
  },
  faceDetails: {
    flex: 1,
  },
  faceName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  faceReason: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  emailDispatchedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emailDispatchedText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
});
