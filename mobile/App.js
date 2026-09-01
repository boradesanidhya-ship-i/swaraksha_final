import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
  FileText,
  Sparkles,
} from 'lucide-react-native';

import Header from './src/components/Header';
import ProgressBar from './src/components/ProgressBar';
import ActivityTerminal from './src/components/ActivityTerminal';
import ServerModal from './src/components/ServerModal';

import AuthScreen from './src/screens/AuthScreen';
import StartScreen from './src/screens/StartScreen';
import ScanScreen from './src/screens/ScanScreen';
import ReferenceScreen from './src/screens/ReferenceScreen';
import DirectoryScreen from './src/screens/DirectoryScreen';
import VideoScreen from './src/screens/VideoScreen';
import ReportsScreen from './src/screens/ReportsScreen';

import {
  checkServerHealth,
  fetchPersons,
  removePerson,
  registerIdentity,
  scanFaceImage,
  scanVideoFile,
} from './src/api/client';
import {
  getServerUrl,
  getRecentAdds,
  saveRecentAdd,
  getAuthToken,
  getUserProfile,
  clearAuth,
} from './src/utils/storage';

export default function App() {
  // Navigation & Screen Mode
  const [mode, setMode] = useState('start'); // 'start' | 'scan' | 'reference' | 'directory' | 'video' | 'reports'

  // User Auth State
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthTokenState] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

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

    const token = await getAuthToken();
    const user = await getUserProfile();
    setAuthTokenState(token);
    setCurrentUser(user);
    setAuthLoading(false);

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
      log(`Could not reach backend at ${url}`);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of SWARAKSHA?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await clearAuth();
            setCurrentUser(null);
            setAuthTokenState(null);
            setMode('start');
            log('User logged out.');
          },
        },
      ]
    );
  };

  const handleAuthSuccess = (user, token) => {
    setCurrentUser(user);
    setAuthTokenState(token);
    log(`Authenticated as ${user.email}`);
    loadInitialData();
  };

  // --- Directory Actions ---
  const refreshDirectory = async () => {
    try {
      const list = await fetchPersons();
      setPersons(list);
    } catch (err) {
      log(`Failed to refresh directory: ${err.message}`);
    }
  };

  const handleDeletePerson = async (pId) => {
    try {
      await removePerson(pId);
      log(`Deleted protected identity: ${pId}`);
      await refreshDirectory();
    } catch (err) {
      log(`Failed to delete ${pId}: ${err.message}`);
    }
  };

  // --- Scan Face Actions ---
  const handleScanImage = async (imageUri) => {
    if (!imageUri || isScanning) return;

    setIsScanning(true);
    setScanResult(null);
    setProgress({ label: 'Analyzing frame with Vision Transformer', value: 30 });
    log('Initiating dual-layer scan...');

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (!prev || prev.value >= 90) return prev;
        const nextVal = prev.value + 15;
        let label = 'Matching facial embeddings in FAISS...';
        if (nextVal > 60) label = 'Performing EXIF/C2PA metadata forensics...';
        return { label, value: nextVal };
      });
    }, 400);

    try {
      const result = await scanFaceImage(imageUri);
      clearInterval(timer);
      setProgress({ label: 'Forensic scan complete', value: 100 });

      setScanResult(result);
      log(`Scan result: ${result.overall_action} (${result.faces_detected} face(s) detected)`);
      if (currentUser?.email) {
        log(`Forensic report auto-dispatched to ${currentUser.email}`);
      }
    } catch (err) {
      clearInterval(timer);
      setScanResult({
        faces_detected: 0,
        results: [],
        overall_action: 'ALLOW',
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
      setTimeout(() => setProgress(null), 1200);
    }
  };

  // --- Video Lab Actions ---
  const handleScanVideo = async () => {
    if (videoFiles.length === 0 || isVideoScanning) return;

    setIsVideoScanning(true);
    setVideoResults([]);
    setProgress({ label: 'Preparing video upload stream', value: 15 });
    log(`Analyzing ${videoFiles.length} video(s)...`);

    const results = [];
    for (let i = 0; i < videoFiles.length; i++) {
      const vf = videoFiles[i];
      setProgress({
        label: `Sampling frames for video ${i + 1}/${videoFiles.length}`,
        value: 20 + Math.round((i / videoFiles.length) * 60),
      });

      try {
        const res = await scanVideoFile(vf.uri, vf.name);
        results.push({
          file: vf,
          fileName: vf.name || vf.fileName || 'Video Analysis',
          data: res,
          ...res,
        });
        log(`Video [${vf.name}]: ${res.final_status} (${res.video?.sampled_frames || 0} frames)`);
        if (currentUser?.email) {
          log(`Video analysis report dispatched to ${currentUser.email}`);
        }
      } catch (err) {
        log(`Video [${vf.name}] error: ${err.message}`);
        results.push({
          file: vf,
          fileName: vf.name || vf.fileName || 'Video Error',
          final_status: 'ERROR',
          error: err.response?.data?.detail || err.message || 'Scan failed',
        });
      }
    }

    setVideoResults(results);
    setProgress({ label: 'Video Lab analysis complete', value: 100 });
    setIsVideoScanning(false);
    setTimeout(() => setProgress(null), 1000);
  };

  const navTabs = [
    { id: 'start', label: 'Home', Icon: LayoutDashboard },
    { id: 'scan', label: 'Face Scan', Icon: ScanFace },
    { id: 'reference', label: 'Enroll', Icon: Sparkles },
    { id: 'directory', label: 'Directory', Icon: Users },
    { id: 'video', label: 'Video Lab', Icon: FileVideo },
    { id: 'reports', label: 'Reports', Icon: FileText },
  ];

  const screenTitleMap = {
    start: 'SWARAKSHA Cyber Protection',
    scan: 'Scan Face & Identity',
    reference: 'Add Reference Images',
    directory: 'Protected Identities',
    video: 'Video Forensics Lab',
    reports: 'Forensic Scan Reports',
  };

  // Render AuthScreen if unauthenticated
  if (!authLoading && (!currentUser || !authToken)) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <ExpoStatusBar style="dark" backgroundColor={Colors.surface} />
          <AuthScreen
            onAuthSuccess={handleAuthSuccess}
            onOpenSettings={() => setIsServerModalOpen(true)}
            backendOnline={backendOnline}
            serverUrl={serverUrl}
          />
          <ServerModal
            visible={isServerModalOpen}
            onClose={() => setIsServerModalOpen(false)}
            onServerSaved={(newUrl) => {
              setServerUrlState(newUrl);
              loadInitialData();
            }}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

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
            currentUser={currentUser}
            onLogout={handleLogout}
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

            {mode === 'reports' && (
              <ReportsScreen
                userEmail={currentUser?.email}
                onLogout={handleLogout}
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
                  <Icon size={19} color={isActive ? Colors.primary : Colors.textMuted} />
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
            currentUser={currentUser}
            onLogout={handleLogout}
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
    paddingHorizontal: 4,
    justifyContent: 'space-around',
  },
  navTab: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 2,
  },
  navTabActive: {
    backgroundColor: Colors.lilacSubtle,
  },
  navTabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  navTabLabelActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
});
