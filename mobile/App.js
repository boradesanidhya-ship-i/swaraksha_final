import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from './src/theme/colors';
import {
  LayoutDashboard,
  Users,
  ScanFace,
  FileVideo,
  Sparkles,
} from 'lucide-react-native';

import Header from './src/components/Header';
import ProgressBar from './src/components/ProgressBar';
import ActivityTerminal from './src/components/ActivityTerminal';
import ServerModal from './src/components/ServerModal';

import StartScreen from './src/screens/StartScreen';
import ScanScreen from './src/screens/ScanScreen';
import ReferenceScreen from './src/screens/ReferenceScreen';
import DirectoryScreen from './src/screens/DirectoryScreen';
import VideoScreen from './src/screens/VideoScreen';

import {
  checkServerHealth,
  fetchPersons,
  removePerson,
  registerIdentity,
  scanFaceImage,
  scanVideoFile,
} from './src/api/client';
import { getServerUrl, getRecentAdds, saveRecentAdd } from './src/utils/storage';

export default function App() {
  // Navigation & Screen Mode
  const [mode, setMode] = useState('start'); // 'start' | 'scan' | 'reference' | 'directory' | 'video'

  // Server & Connection State
  const [backendOnline, setBackendOnline] = useState(false);
  const [serverUrl, setServerUrlState] = useState('');
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);

  // Global Process Tracking
  const [activityLog, setActivityLog] = useState(['Mobile app initialized.', 'Waiting for action.']);
  const [progress, setProgress] = useState(null);
  const [registrationNotice, setRegistrationNotice] = useState('');

  // Persons Directory State
  const [persons, setPersons] = useState([]);
  const [recentAdds, setRecentAdds] = useState({});

  // Face Scan State
  const [capturedImageUri, setCapturedImageUri] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // Reference Enrollment State
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [personId, setPersonId] = useState('');
  const [personName, setPersonName] = useState('');
  const [registerResult, setRegisterResult] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Video Lab State
  const [videoFiles, setVideoFiles] = useState([]);
  const [videoResults, setVideoResults] = useState([]);
  const [isVideoScanning, setIsVideoScanning] = useState(false);

  const log = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    setActivityLog((prev) => [...prev.slice(-8), `${timestamp}  ${msg}`]);
  };

  // Initial Data & Server Check
  const loadInitialData = async () => {
    const url = await getServerUrl();
    setServerUrlState(url);

    const adds = await getRecentAdds();
    setRecentAdds(adds);

    const health = await checkServerHealth(url);
    setBackendOnline(health.online);

    if (health.online) {
      log(`Connected to backend at ${url}`);
      try {
        const people = await fetchPersons();
        setPersons(people);
      } catch (e) {}
    } else {
      log(`Could not reach backend at ${url}. Tap settings to configure.`);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const refreshDirectory = async () => {
    try {
      const people = await fetchPersons();
      setPersons(people);
    } catch (err) {
      log(`Failed to refresh directory: ${err.message}`);
    }
  };

  // --- Scan Actions ---
  const handleScanImage = async (imageUri) => {
    if (!imageUri || isScanning) return;
    setIsScanning(true);
    setScanResult(null);
    setProgress({ label: 'Uploading photo to SWARAKSHA', value: 20 });
    log('Sending image to scan endpoint...');

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (!prev || prev.value >= 85) return prev;
        const nextVal = prev.value + 10;
        let label = 'Detecting faces & matching identities...';
        if (nextVal > 60) label = 'Running AI authenticity check...';
        return { label, value: nextVal };
      });
    }, 700);

    try {
      const result = await scanFaceImage(imageUri);
      clearInterval(timer);
      setProgress({ label: 'Scan completed', value: 100 });
      setScanResult(result);
      log(`Scan verdict: ${result.overall_action} (${result.faces_detected} face(s) analyzed)`);
    } catch (err) {
      clearInterval(timer);
      setScanResult({
        overall_action: 'ERROR',
        faces_detected: 0,
        results: [],
        summary:
          err.code === 'ERR_NETWORK' || !backendOnline
            ? 'Backend is unreachable. Please verify server IP in Settings.'
            : err.response?.data?.detail || err.message || 'Analysis failed.',
      });
      log(`Scan error: ${err.message}`);
    } finally {
      setIsScanning(false);
      setTimeout(() => setProgress(null), 800);
    }
  };

  const handleUploadImageDirect = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setCapturedImageUri(result.assets[0].uri);
        setMode('scan');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Registration Actions ---
  const handleRegister = async () => {
    if (referenceFiles.length < 5 || !personId.trim() || !personName.trim() || isRegistering) {
      return;
    }

    setIsRegistering(true);
    setRegisterResult(null);
    setProgress({ label: 'Uploading reference images', value: 20 });
    log(`Enrolling ${referenceFiles.length} photos for "${personName}"...`);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (!prev || prev.value >= 85) return prev;
        const nextVal = prev.value + 8;
        let label = 'Detecting faces in photos...';
        if (nextVal > 45) label = 'Generating ArcFace embeddings...';
        if (nextVal > 70) label = 'Indexing vectors in FAISS...';
        return { label, value: nextVal };
      });
    }, 800);

    try {
      const response = await registerIdentity(personId, personName, referenceFiles);
      clearInterval(timer);
      setProgress({ label: 'Identity protected!', value: 100 });

      setRegisterResult({ type: 'success', text: response.message });
      setRegistrationNotice(`${response.faces_registered} reference(s) enrolled for ${personName}.`);
      await saveRecentAdd(response.person_id, response.faces_registered);

      log(`Enrolled ${response.faces_registered} face embeddings successfully.`);
      await refreshDirectory();

      setReferenceFiles([]);
      setPersonId('');
      setPersonName('');

      setTimeout(() => {
        setProgress(null);
        setMode('directory');
      }, 1000);
    } catch (err) {
      clearInterval(timer);
      setRegisterResult({
        type: 'error',
        text:
          err.code === 'ERR_NETWORK' || !backendOnline
            ? 'Backend unreachable. Verify server IP in Settings.'
            : err.response?.data?.detail || err.message || 'Registration failed.',
      });
      log(`Registration failed: ${err.message}`);
    } finally {
      setIsRegistering(false);
      setTimeout(() => setProgress(null), 1000);
    }
  };

  // --- Directory Delete Action ---
  const handleDeletePerson = async (pid) => {
    try {
      const res = await removePerson(pid);
      log(`Deleted protected identity: ${pid}`);
      setPersons((prev) => prev.filter((p) => p.person_id !== pid));
    } catch (err) {
      log(`Delete failed: ${err.response?.data?.detail || err.message}`);
    }
  };

  // --- Video Lab Actions ---
  const handleScanVideo = async () => {
    if (!videoFiles.length || isVideoScanning) return;
    setIsVideoScanning(true);
    setVideoResults([]);
    setProgress({ label: 'Uploading video file', value: 15 });
    log(`Video pipeline started: ${videoFiles.length} file(s) in queue.`);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (!prev || prev.value >= 90) return prev;
        const nextVal = prev.value + 5;
        let label = 'Sampling video frames at 2.0s...';
        if (nextVal > 40) label = 'Layer 1: RetinaFace & FAISS matching...';
        if (nextVal > 70) label = 'Layer 2: Vision Transformer deepfake analysis...';
        return { label, value: nextVal };
      });
    }, 1200);

    try {
      for (const file of videoFiles) {
        const name = file.fileName || file.name || 'video.mp4';
        log(`Analyzing video: ${name}`);
        const response = await scanVideoFile(file.uri, name);
        setVideoResults((prev) => [...prev, { fileName: name, ...response }]);
        log(`Video scan complete: ${name} -> ${response.final_status}`);
      }
      clearInterval(timer);
      setProgress({ label: 'Video processing complete', value: 100 });
    } catch (err) {
      clearInterval(timer);
      setVideoResults((prev) => [
        ...prev,
        {
          fileName: 'Scan Error',
          final_status: 'ERROR',
          summary:
            err.code === 'ERR_NETWORK' || !backendOnline
              ? 'Backend unreachable. Verify server IP in Settings.'
              : err.response?.data?.detail || err.message || 'Video scan failed.',
        },
      ]);
      log(`Video error: ${err.message}`);
    } finally {
      setIsVideoScanning(false);
      setTimeout(() => setProgress(null), 900);
    }
  };

  // Nav items configuration
  const navTabs = [
    { id: 'start', label: 'Home', Icon: LayoutDashboard },
    { id: 'directory', label: 'Directory', Icon: Users },
    { id: 'scan', label: 'Scan Face', Icon: ScanFace },
    { id: 'video', label: 'Video Lab', Icon: FileVideo },
  ];

  const screenTitleMap = {
    start: null,
    scan: 'Face scan',
    reference: 'Add references',
    directory: 'Protected people',
    video: 'Video lab',
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <ExpoStatusBar style="dark" backgroundColor={Colors.surface} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header Bar */}
        <Header
          title={screenTitleMap[mode]}
          subtitle={mode !== 'start' ? `SWARAKSHA / ${screenTitleMap[mode]}` : null}
          backendOnline={backendOnline}
          serverUrl={serverUrl}
          onOpenSettings={() => setIsServerModalOpen(true)}
          onGoHome={() => setMode('start')}
        />

        {/* Active Screen Body */}
        <View style={styles.mainView}>
          {mode === 'start' && (
            <StartScreen
              backendOnline={backendOnline}
              notice={registrationNotice}
              onScan={() => setMode('scan')}
              onReference={() => {
                setRegisterResult(null);
                setRegistrationNotice('');
                setMode('reference');
              }}
              onUploadImage={handleUploadImageDirect}
              onDirectory={() => setMode('directory')}
              onVideo={() => setMode('video')}
              onOpenSettings={() => setIsServerModalOpen(true)}
            />
          )}

          {mode === 'scan' && (
            <ScanScreen
              onGoHome={() => setMode('start')}
              onScanImage={handleScanImage}
              isScanning={isScanning}
              scanResult={scanResult}
              capturedImageUri={capturedImageUri}
              setCapturedImageUri={setCapturedImageUri}
            />
          )}

          {mode === 'reference' && (
            <ReferenceScreen
              referenceFiles={referenceFiles}
              setReferenceFiles={setReferenceFiles}
              personId={personId}
              setPersonId={setPersonId}
              personName={personName}
              setPersonName={setPersonName}
              onRegister={handleRegister}
              isRegistering={isRegistering}
              registerResult={registerResult}
              onGoHome={() => setMode('start')}
            />
          )}

          {mode === 'directory' && (
            <DirectoryScreen
              persons={persons}
              recentAdds={recentAdds}
              onDeletePerson={handleDeletePerson}
              onRefresh={refreshDirectory}
              onAddReference={() => setMode('reference')}
              onGoHome={() => setMode('start')}
            />
          )}

          {mode === 'video' && (
            <VideoScreen
              videoFiles={videoFiles}
              setVideoFiles={setVideoFiles}
              videoResults={videoResults}
              onScanVideo={handleScanVideo}
              isVideoScanning={isVideoScanning}
              onGoHome={() => setMode('start')}
            />
          )}
        </View>

        {/* Floating Progress Bar */}
        {progress && <ProgressBar progress={progress} />}

        {/* Process Monitor Terminal */}
        <ActivityTerminal entries={activityLog} />

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          {navTabs.map(({ id, label, Icon }) => {
            const isActive = mode === id;
            return (
              <TouchableOpacity
                key={id}
                style={[styles.navTab, isActive && styles.navTabActive]}
                onPress={() => setMode(id)}
                activeOpacity={0.8}
              >
                <Icon size={20} color={isActive ? Colors.primary : Colors.textMuted} />
                <Text style={[styles.navTabLabel, isActive && styles.navTabLabelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Server IP Config Modal */}
        <ServerModal
          visible={isServerModalOpen}
          onClose={() => setIsServerModalOpen(false)}
          onServerSaved={(newUrl) => {
            setServerUrlState(newUrl);
            loadInitialData();
          }}
        />
      </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mainView: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: 'space-around',
  },
  navTab: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 2,
  },
  navTabActive: {
    backgroundColor: Colors.lilacSubtle,
  },
  navTabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  navTabLabelActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
});
