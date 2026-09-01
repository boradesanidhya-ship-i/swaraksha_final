import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Colors, Shadows } from '../theme/colors';
import { Server, Wifi, Check, X, Globe, Laptop } from 'lucide-react-native';
import { checkServerHealth } from '../api/client';
import { getServerUrl, setServerUrl } from '../utils/storage';

export default function ServerModal({ visible, onClose, onServerSaved, currentUser, onLogout }) {
  const [urlInput, setUrlInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (visible) {
      getServerUrl().then((url) => {
        setUrlInput(url);
        setTestResult(null);
      });
    }
  }, [visible]);

  const handleTest = async () => {
    if (!urlInput.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    Keyboard.dismiss();

    const res = await checkServerHealth(urlInput.trim());
    setIsTesting(false);
    setTestResult(res);
  };

  const handleSave = async () => {
    if (!urlInput.trim()) return;
    const saved = await setServerUrl(urlInput.trim());
    onServerSaved?.(saved);
    onClose();
  };

  const quickPresets = [
    { label: 'Laptop Wi-Fi', url: 'http://10.208.73.233:8000' },
    { label: 'Android Emulator', url: 'http://10.0.2.2:8000' },
    { label: 'Localhost', url: 'http://localhost:8000' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.titleRow}>
                <Laptop size={20} color={Colors.primary} />
                <Text style={styles.modalTitle}>Backend Server Setup</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.instruction}>
              Enter your laptop or cloud server address. For physical phones, use your computer's local Wi-Fi IP (e.g. http://192.168.1.50:8000).
            </Text>

            <View style={styles.inputContainer}>
              <Server size={16} color={Colors.lilac} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={urlInput}
                onChangeText={(text) => {
                  setUrlInput(text);
                  setTestResult(null);
                }}
                placeholder="http://192.168.x.x:8000"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            {/* Quick Presets */}
            <View style={styles.presetsRow}>
              {quickPresets.map((preset, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.presetChip}
                  onPress={() => {
                    setUrlInput(preset.url);
                    setTestResult(null);
                  }}
                >
                  <Text style={styles.presetText}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Test Connection Status Banner */}
            {testResult && (
              <View
                style={[
                  styles.resultBanner,
                  testResult.online ? styles.resultOnline : styles.resultOffline,
                ]}
              >
                {testResult.online ? (
                  <Check size={16} color={Colors.successText} />
                ) : (
                  <X size={16} color={Colors.dangerText} />
                )}
                <View style={styles.resultTextCol}>
                  <Text
                    style={[
                      styles.resultStatusText,
                      testResult.online ? styles.resultTextOnline : styles.resultTextOffline,
                    ]}
                  >
                    {testResult.online
                      ? `Connected: ${testResult.data?.registered_persons ?? 0} registered identities`
                      : 'Connection Failed: Could not reach backend server.'}
                  </Text>
                </View>
              </View>
            )}

            {/* Active User Session & Sign Out */}
            {currentUser && onLogout && (
              <View style={styles.sessionCard}>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionLabel}>Logged In User</Text>
                  <Text style={styles.sessionEmail} numberOfLines={1}>
                    {currentUser.email}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.sessionLogoutBtn}
                  onPress={() => {
                    onClose();
                    onLogout();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sessionLogoutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={styles.testButton}
                onPress={handleTest}
                disabled={isTesting || !urlInput.trim()}
                activeOpacity={0.8}
              >
                {isTesting ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Wifi size={16} color={Colors.primary} />
                )}
                <Text style={styles.testButtonText}>
                  {isTesting ? 'Pinging...' : 'Test Connection'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Check size={16} color="#ffffff" />
                <Text style={styles.saveButtonText}>Save & Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 20, 32, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  instruction: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 46,
    fontSize: 14,
    color: Colors.text,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  presetChip: {
    backgroundColor: Colors.lilacSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  presetText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
  },
  resultOnline: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.successBorder,
  },
  resultOffline: {
    backgroundColor: Colors.dangerLight,
    borderColor: Colors.dangerBorder,
  },
  resultTextCol: {
    flex: 1,
  },
  resultStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultTextOnline: {
    color: Colors.successText,
  },
  resultTextOffline: {
    color: Colors.dangerText,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  sessionInfo: {
    flex: 1,
    marginRight: 8,
  },
  sessionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#991B1B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionEmail: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  sessionLogoutBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sessionLogoutText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.lilacSubtle,
    borderWidth: 1,
    borderColor: Colors.lilacLight,
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
