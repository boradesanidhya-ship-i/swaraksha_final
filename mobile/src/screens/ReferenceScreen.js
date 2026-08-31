import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows } from '../theme/colors';
import {
  UploadCloud,
  ImagePlus,
  X,
  UserRound,
  Check,
  ShieldAlert,
  Info,
} from 'lucide-react-native';
import BackButton from '../components/BackButton';

export default function ReferenceScreen({
  referenceFiles,
  setReferenceFiles,
  personId,
  setPersonId,
  personName,
  setPersonName,
  onRegister,
  isRegistering,
  registerResult,
  onGoHome,
}) {
  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.85,
        selectionLimit: 20,
      });

      if (!result.canceled && result.assets) {
        setReferenceFiles((current) => [...current, ...result.assets]);
      }
    } catch (e) {
      console.error('Error picking images:', e);
    }
  };

  const removeImage = (indexToRemove) => {
    setReferenceFiles((current) => current.filter((_, idx) => idx !== indexToRemove));
  };

  const isValid = referenceFiles.length >= 5 && personId.trim() && personName.trim();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BackButton onPress={onGoHome} />

      <View style={styles.headingSection}>
        <Text style={styles.kicker}>CREATE A PROTECTED IDENTITY</Text>
        <Text style={styles.title}>Upload reference images</Text>
        <Text style={styles.subtitle}>
          Add 5 or more clear photos with different lighting and angles. More references make identity recognition significantly more reliable.
        </Text>
      </View>

      {/* Upload & Thumbnail Grid */}
      <View style={styles.uploadCard}>
        {referenceFiles.length > 0 ? (
          <View>
            <View style={styles.gridContainer}>
              {referenceFiles.map((file, idx) => (
                <View key={idx} style={styles.thumbWrapper}>
                  <Image source={{ uri: file.uri }} style={styles.thumbImage} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeImage(idx)}
                    activeOpacity={0.8}
                  >
                    <X size={12} color="#ffffff" />
                  </TouchableOpacity>
                  <View style={styles.thumbIndexBadge}>
                    <Text style={styles.thumbIndexText}>#{idx + 1}</Text>
                  </View>
                </View>
              ))}

              {/* Add More Button */}
              <TouchableOpacity
                style={styles.addMoreCard}
                onPress={pickImages}
                activeOpacity={0.8}
              >
                <ImagePlus size={22} color={Colors.primary} />
                <Text style={styles.addMoreText}>Add more</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.countBadgeRow}>
              <Text style={styles.countBadgeText}>
                {referenceFiles.length} photo{referenceFiles.length === 1 ? '' : 's'} selected{' '}
                {referenceFiles.length < 5
                  ? `(need ${5 - referenceFiles.length} more)`
                  : '✓ Ready for enrollment'}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.dropZone} onPress={pickImages} activeOpacity={0.8}>
            <View style={styles.dropIconBox}>
              <UploadCloud size={32} color={Colors.primary} />
            </View>
            <Text style={styles.dropTitle}>Choose 5 or more face images</Text>
            <Text style={styles.dropSub}>JPG or PNG · different angles & lighting</Text>
            <View style={styles.pickButton}>
              <Text style={styles.pickButtonText}>Browse Gallery</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Inputs Form */}
      <View style={styles.formCard}>
        <Text style={styles.formSectionTitle}>Identity Details</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Person ID (Unique Identifier)</Text>
          <TextInput
            style={styles.input}
            value={personId}
            onChangeText={setPersonId}
            placeholder="e.g. AARTI_001 or USR_104"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Text style={styles.helperText}>Used internally for FAISS indexing & storage.</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={personName}
            onChangeText={setPersonName}
            placeholder="e.g. Aarti Sharma"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Result Message if any */}
        {registerResult && (
          <View
            style={[
              styles.resultBanner,
              registerResult.type === 'success'
                ? styles.resultSuccess
                : styles.resultError,
            ]}
          >
            {registerResult.type === 'success' ? (
              <Check size={16} color={Colors.successText} />
            ) : (
              <ShieldAlert size={16} color={Colors.dangerText} />
            )}
            <Text
              style={[
                styles.resultText,
                registerResult.type === 'success'
                  ? styles.resultTextSuccess
                  : styles.resultTextError,
              ]}
            >
              {registerResult.text}
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, !isValid || isRegistering ? styles.submitDisabled : null]}
          onPress={onRegister}
          disabled={!isValid || isRegistering}
          activeOpacity={0.85}
        >
          {isRegistering ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <UserRound size={18} color="#ffffff" />
          )}
          <Text style={styles.submitButtonText}>
            {isRegistering
              ? 'Enrolling Identity...'
              : `Protect Identity (${referenceFiles.length} photo${referenceFiles.length === 1 ? '' : 's'})`}
          </Text>
        </TouchableOpacity>

        {referenceFiles.length < 5 && (
          <View style={styles.validationNotice}>
            <Info size={14} color={Colors.textMuted} />
            <Text style={styles.validationNoticeText}>
              Please select at least 5 images before submitting.
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
    marginBottom: 16,
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  thumbWrapper: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIndexBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  thumbIndexText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  addMoreCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.lilac,
    borderStyle: 'dashed',
    backgroundColor: Colors.lilacSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 4,
  },
  countBadgeRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 46,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.text,
  },
  helperText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.successBorder,
  },
  resultError: {
    backgroundColor: Colors.dangerLight,
    borderColor: Colors.dangerBorder,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  resultTextSuccess: {
    color: Colors.successText,
  },
  resultTextError: {
    color: Colors.dangerText,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  submitDisabled: {
    backgroundColor: '#c4b5db',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  validationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  validationNoticeText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
