import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Activity, ArrowLeft, Camera, Check, FileVideo, FolderOpen, ImagePlus, LayoutDashboard, LoaderCircle, ScanFace, Shield, ShieldAlert, Sparkles, Trash2, UploadCloud, UserRound, Users, X } from 'lucide-react';
import './index.css';

const API_BASE = 'http://localhost:8000/api';
const API_ROOT = 'http://localhost:8000';

function App() {
  const [mode, setMode] = useState('start');
  const [backendOnline, setBackendOnline] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [stream, setStream] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [personId, setPersonId] = useState('');
  const [personName, setPersonName] = useState('');
  const [registerResult, setRegisterResult] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [progress, setProgress] = useState(null);
  const [persons, setPersons] = useState([]);
  const [recentAdds, setRecentAdds] = useState({});
  const [videoFiles, setVideoFiles] = useState([]);
  const [videoResults, setVideoResults] = useState([]);
  const [isVideoScanning, setIsVideoScanning] = useState(false);
  const [activityLog, setActivityLog] = useState(['Waiting for an action.']);
  const [registrationNotice, setRegistrationNotice] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    axios.get(API_ROOT).then(() => setBackendOnline(true)).catch(() => setBackendOnline(false));
    axios.get(`${API_BASE}/persons`).then((response) => setPersons(response.data)).catch(() => {});
  }, []);

  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);

  const startCamera = async () => {
    setMode('scan'); setCameraError(''); setScanResult(null); setCapturedFile(null);
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      setStream(nextStream);
      if (videoRef.current) videoRef.current.srcObject = nextStream;
    } catch (error) {
      setCameraError(error.name === 'NotAllowedError' ? 'Camera access was blocked. Allow camera access in your browser, then try again.' : 'We could not open your camera. You can still upload an image below.');
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  const stopCamera = () => { stream?.getTracks().forEach((track) => track.stop()); setStream(null); };
  const goHome = () => { stopCamera(); setMode('start'); setCapturedFile(null); setScanResult(null); setCameraError(''); };
  const log = (message) => setActivityLog((current) => [...current.slice(-5), `${new Date().toLocaleTimeString()}  ${message}`]);

  const deletePerson = async (personId) => {
    const person = persons.find((item) => item.person_id === personId);
    if (!person || !window.confirm(`Remove ${person.name} and all stored face references?`)) return;
    try { await axios.delete(`${API_BASE}/persons/${personId}`); setPersons((current) => current.filter((item) => item.person_id !== personId)); log(`Removed protected identity: ${person.name}.`); }
    catch (error) { log(`Delete failed: ${error.response?.data?.detail || error.message}`); }
  };

  const captureFace = () => {
    const video = videoRef.current; const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => setCapturedFile(new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' })), 'image/jpeg', .92);
  };

  const scanImage = async (event) => {
    event?.preventDefault(); if (!capturedFile || isScanning) return;
    setIsScanning(true); setScanResult(null); setProgress({ label: 'Uploading image', value: 20 }); log('Upload received.');
    const progressTimer = setInterval(() => setProgress((current) => current && current.value < 85 ? { label: current.value < 45 ? 'Detecting faces' : current.value < 70 ? 'Matching identities' : 'Checking authenticity', value: current.value + 5 } : current), 800);
    const formData = new FormData(); formData.append('file', capturedFile);
    try { log('Detecting faces and matching identities...'); const response = await axios.post(`${API_BASE}/scan`, formData); setScanResult(response.data); setProgress({ label: 'Scan complete', value: 100 }); log('Scan complete.'); }
    catch (error) { setScanResult({ overall_action: 'ERROR', faces_detected: 0, results: [], summary: error.code === 'ERR_NETWORK' ? 'Backend is not running. Start start_swaraksha.bat and try again.' : error.response?.data?.detail || 'The backend could not analyze this image.' }); }
    finally { clearInterval(progressTimer); setIsScanning(false); setTimeout(() => setProgress(null), 900); }
  };

  const uploadScan = (file) => { if (!file?.type.startsWith('image/')) return; stopCamera(); setCapturedFile(file); setCameraError(''); setMode('scan'); };

  const registerReference = async (event) => {
    event.preventDefault(); if (!referenceFiles.length || !personId || !personName || isRegistering) return;
    setIsRegistering(true); setRegisterResult(null); setProgress({ label: 'Preparing reference images', value: 15 }); log(`Received ${referenceFiles.length} reference images.`);
    const progressTimer = setInterval(() => setProgress((current) => current && current.value < 85 ? { label: current.value < 40 ? 'Detecting faces in references' : current.value < 70 ? 'Generating identity embeddings' : 'Saving protected profile', value: current.value + 5 } : current), 900);
    const formData = new FormData(); formData.append('person_id', personId); formData.append('name', personName); referenceFiles.forEach((file) => formData.append('files', file));
    try { log('Detecting faces and generating embeddings...'); const response = await axios.post(`${API_BASE}/register`, formData); setRegisterResult({ type: 'success', text: response.data.message }); setRecentAdds((current) => ({ ...current, [response.data.person_id]: response.data.faces_registered })); setRegistrationNotice(`${response.data.faces_registered} reference image${response.data.faces_registered === 1 ? '' : 's'} added to ${personName}.`); setProgress({ label: 'Identity protected', value: 100 }); log(`Saved ${response.data.faces_registered} new reference images.`); const people = await axios.get(`${API_BASE}/persons`); setPersons(people.data); setReferenceFiles([]); setPersonId(''); setPersonName(''); setTimeout(() => { setProgress(null); setMode('start'); }, 1000); }
    catch (error) { setRegisterResult({ type: 'error', text: error.code === 'ERR_NETWORK' ? 'Backend is not running. Start start_swaraksha.bat and try again.' : error.response?.data?.detail || 'The backend could not register this image.' }); }
    finally { clearInterval(progressTimer); setIsRegistering(false); }
  };

  const scanVideo = async (event) => {
    event.preventDefault(); if (!videoFiles.length || isVideoScanning) return;
    setIsVideoScanning(true); setVideoResults([]); setProgress({ label: 'Uploading videos', value: 15 }); log(`Video queue started: ${videoFiles.length} file(s).`);
    const progressTimer = setInterval(() => setProgress((current) => current && current.value < 90 ? { label: current.value < 40 ? 'Extracting video frames' : current.value < 70 ? 'Detecting faces in frames' : 'Checking identity and authenticity', value: current.value + 4 } : current), 1100);
    try { for (const file of videoFiles) { log(`Sampling frames: ${file.name}`); const formData = new FormData(); formData.append('file', file); const response = await axios.post(`${API_BASE}/scan-video`, formData); setVideoResults((current) => [...current, { fileName: file.name, ...response.data }]); } setProgress({ label: 'Video queue complete', value: 100 }); log('Video queue complete.'); }
    catch (error) { setVideoResults((current) => [...current, { fileName: 'Upload error', overall_action: 'ERROR', summary: error.response?.data?.detail || 'The backend could not analyze this video.' }]); }
    finally { clearInterval(progressTimer); setIsVideoScanning(false); setTimeout(() => setProgress(null), 900); }
  };

  const navItems = [['start', 'Home', LayoutDashboard], ['directory', 'Protected people', Users], ['scan', 'Face scan', ScanFace], ['video', 'Video lab', FileVideo]];
  return <div className="app-shell">
    <aside className="sidebar"><button className="brand" onClick={goHome}><img className="brand-image" src="/icon2.png" alt="SWARAKSHA" /><span><strong>SWARAKSHA</strong><small>identity protection</small></span></button><div className="sidebar-label">Workspace</div><nav>{navItems.map(([id, label, Icon]) => <button className={mode === id ? 'active' : ''} key={id} onClick={() => { if (id === 'scan') startCamera(); else { stopCamera(); setMode(id); } }}><Icon size={17} />{label}</button>)}</nav><div className="sidebar-status"><span className={backendOnline ? 'online' : ''} /><div><strong>{backendOnline ? 'Backend connected' : 'Backend offline'}</strong><small>localhost:8000</small></div></div><div className="sidebar-process"><Activity size={15} /><span>Process monitor</span><b>{isScanning || isRegistering || isVideoScanning ? 'Active' : 'Idle'}</b></div></aside>
    <div className="page-shell"><header className="app-header"><div><span className="eyebrow">SWARAKSHA / {navItems.find(([id]) => id === mode)?.[1]}</span><h1>{mode === 'start' ? 'Your protection desk' : navItems.find(([id]) => id === mode)?.[1]}</h1></div><div className="connection"><i className={backendOnline ? 'online' : ''} />{backendOnline ? 'System ready' : 'Backend offline'}</div></header>
    <main className="main-content">
      {mode === 'start' && <StartScreen backendOnline={backendOnline} notice={registrationNotice} onScan={startCamera} onReference={() => { setMode('reference'); setRegisterResult(null); setRegistrationNotice(''); }} onUpload={uploadScan} onDirectory={() => setMode('directory')} onVideo={() => setMode('video')} />}
      {mode === 'scan' && <ScanScreen {...{ stream, videoRef, canvasRef, cameraError, capturedFile, setCapturedFile, captureFace, scanImage, isScanning, scanResult, uploadScan, goHome, startCamera }} />}
      {mode === 'reference' && <ReferenceScreen {...{ referenceFiles, setReferenceFiles, personId, setPersonId, personName, setPersonName, registerReference, isRegistering, registerResult, goHome }} />}
      {mode === 'directory' && <DirectoryScreen persons={persons} recentAdds={recentAdds} onDelete={deletePerson} onReference={() => setMode('reference')} goHome={goHome} />}
      {mode === 'video' && <VideoScreen {...{ videoFiles, setVideoFiles, videoResults, scanVideo, isVideoScanning, goHome }} />}
    </main>
    {progress && <ProgressBar progress={progress} />}
    <ActivityTerminal entries={activityLog} />
    <footer><Sparkles size={14} /> Your images are processed by the local SWARAKSHA backend. <span>Nothing is uploaded until you choose an action.</span></footer></div>
  </div>;
}

function StartScreen({ backendOnline, notice, onScan, onReference, onUpload, onDirectory, onVideo }) { return <section className="start-screen"><div className="intro"><div className="hero-art"><img src="/icon2.png" alt="SWARAKSHA shield" /></div><span className="kicker">Identity protection console</span><h1>Protect a face. Check a file.</h1><p>Use a live camera, trusted reference images, or a video to inspect identity matches and authenticity.</p><div className={`backend-note ${backendOnline ? 'ready' : ''}`}><span className="status-dot" />{backendOnline ? 'Protection service ready' : 'Start the backend to enable protection'}</div>{notice && <div className="backend-note ready"><Check size={14} />{notice}</div>}</div><div className="choice-grid"><button className="choice-card primary-choice" onClick={onScan}><span className="choice-icon"><Camera size={23} /></span><span><strong>Scan my face</strong><small>Use your camera to capture a live face image.</small></span><b>→</b></button><button className="choice-card" onClick={onReference}><span className="choice-icon"><ImagePlus size={23} /></span><span><strong>Add reference images</strong><small>Register five or more trusted face images.</small></span><b>→</b></button><label className="upload-link"><UploadCloud size={16} /> Or upload an image to scan<input type="file" accept="image/*" onChange={(event) => onUpload(event.target.files[0])} /></label><button className="utility-link" onClick={onDirectory}><FolderOpen size={15} /> View protected directory</button><button className="utility-link" onClick={onVideo}><FileVideo size={15} /> Submit a video for checking</button></div></section> }

function ScanScreen({ stream, videoRef, canvasRef, cameraError, capturedFile, setCapturedFile, captureFace, scanImage, isScanning, scanResult, uploadScan, goHome, startCamera }) { const preview = capturedFile ? URL.createObjectURL(capturedFile) : null; return <section className="work-screen"><BackButton onClick={goHome} /><div className="work-heading"><span className="kicker">Live face scan</span><h2>Look into the camera</h2><p>Center your face in the frame. We’ll capture one image and check it with SWARAKSHA.</p></div><div className="scan-workspace"><div className="camera-panel">{capturedFile ? <img className="captured-preview" src={preview} alt="Captured face" /> : stream ? <video ref={videoRef} autoPlay playsInline muted /> : <div className="camera-empty"><Camera size={27} /><strong>Camera preview unavailable</strong><span>{cameraError || 'Preparing your camera...'}</span></div>}<div className="camera-actions">{capturedFile ? <><button className="button secondary" onClick={() => setCapturedFile(null)}><X size={16} /> Retake</button><button className="button primary" onClick={scanImage} disabled={isScanning}>{isScanning ? <LoaderCircle className="spin" size={16} /> : <Shield size={16} />}{isScanning ? 'Checking...' : 'Check this face'}</button></> : <button className="button primary" onClick={captureFace} disabled={!stream}><Camera size={17} /> Capture face</button>}</div></div><div className="result-card">{scanResult ? <Result result={scanResult} /> : <><div className="result-placeholder"><ShieldAlert size={25} /><strong>Your result will appear here</strong><p>We’ll look for a protected identity and signs of AI-generated manipulation.</p></div><label className="small-upload">Prefer a file? Upload an image<input type="file" accept="image/*" onChange={(event) => uploadScan(event.target.files[0])} /></label></>}</div></div>{cameraError && <div className="camera-error"><ShieldAlert size={16} />{cameraError}<button onClick={startCamera}>Try camera again</button></div>}<canvas ref={canvasRef} hidden /></section> }

function ReferenceScreen({ referenceFiles, setReferenceFiles, personId, setPersonId, personName, setPersonName, registerReference, isRegistering, registerResult, goHome }) { const addFiles = (files) => setReferenceFiles((current) => [...current, ...[...files].filter((file) => file.type.startsWith('image/'))]); return <section className="work-screen reference-screen"><BackButton onClick={goHome} /><div className="work-heading"><span className="kicker">Create a protected identity</span><h2>Upload reference images</h2><p>Add five or more clear photos from different angles. More references make matching more reliable.</p></div><form className="reference-form" onSubmit={registerReference}><div className={`reference-upload ${referenceFiles.length ? 'has-files' : ''}`}>{referenceFiles.length ? <><div className="reference-grid">{referenceFiles.map((file, index) => <div className="reference-thumb" key={`${file.name}-${index}`}><img src={URL.createObjectURL(file)} alt={`Reference ${index + 1}`} /><button type="button" onClick={() => setReferenceFiles(referenceFiles.filter((_, fileIndex) => fileIndex !== index))}><X size={13} /></button></div>)}<label className="add-more"><ImagePlus size={20} /><span>Add more</span><input type="file" accept="image/*" multiple onChange={(event) => addFiles(event.target.files)} /></label></div><small className="reference-count">{referenceFiles.length} image{referenceFiles.length === 1 ? '' : 's'} selected · add at least 5 for best results</small></> : <label><UploadCloud size={27} /><strong>Choose 5 or more face images</strong><span>JPG or PNG · use different angles and lighting</span><input type="file" accept="image/*" multiple onChange={(event) => addFiles(event.target.files)} /></label>}</div><div className="reference-fields"><label>Person ID<input value={personId} onChange={(event) => setPersonId(event.target.value)} placeholder="e.g. AARTI_001" /></label><label>Name<input value={personName} onChange={(event) => setPersonName(event.target.value)} placeholder="e.g. Aarti Sharma" /></label></div>{registerResult && <div className={`form-result ${registerResult.type}`}><Check size={16} />{registerResult.text}</div>}<button className="button primary submit-reference" disabled={referenceFiles.length < 5 || !personId || !personName || isRegistering}>{isRegistering ? <LoaderCircle className="spin" size={16} /> : <UserRound size={16} />}{isRegistering ? 'Adding identity...' : `Protect identity with ${referenceFiles.length} image${referenceFiles.length === 1 ? '' : 's'}`}</button></form></section> }

function ProgressBar({ progress }) { return <div className="progress-dock"><div className="progress-copy"><LoaderCircle className="spin" size={15} /><strong>{progress.label}</strong><span>{progress.value}%</span></div><div className="progress-track"><i style={{ width: `${progress.value}%` }} /></div></div> }
function ActivityTerminal({ entries }) { return <section className="activity-terminal"><div><span className="terminal-dot red" /><span className="terminal-dot yellow" /><span className="terminal-dot green" /><strong>SWARAKSHA process</strong></div>{entries.map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}</section> }
function DirectoryScreen({ persons, recentAdds, onDelete, onReference, goHome }) { return <section className="work-screen directory-screen"><BackButton onClick={goHome} /><div className="work-heading"><span className="kicker">Protected directory</span><h2>Registered identities</h2><p>Manage the people currently available to match during scans.</p></div><div className="directory-card">{persons.length ? persons.map((person) => <div className="directory-row" key={person.person_id}><span className="directory-avatar"><UserRound size={18} /></span><span><strong>{person.name}</strong><small>{person.person_id} · {recentAdds[person.person_id] || person.image_count || 0} added this enrollment · {person.image_count || 0} total stored</small></span><Check size={17} /><button className="delete-person" title={`Delete ${person.name}`} onClick={() => onDelete(person.person_id)}><Trash2 size={16} /></button></div>) : <div className="directory-empty"><Users size={27} /><strong>No identities registered yet</strong><p>Add reference images to create the first protected profile.</p><button className="button primary" onClick={onReference}><ImagePlus size={15} /> Add reference images</button></div>}</div></section> }
function VideoScreen({ videoFiles, setVideoFiles, videoResults, scanVideo, isVideoScanning, goHome }) { const addVideos = (files) => setVideoFiles((current) => [...current, ...[...files].filter((file) => file.type.startsWith('video/'))]); return <section className="work-screen video-screen"><BackButton onClick={goHome} /><div className="work-heading"><span className="kicker">Video protection scan</span><h2>Video lab</h2><p>Queue multiple videos and compare their sampled-frame results in one run.</p></div><div className="video-layout"><form className="reference-form" onSubmit={scanVideo}><label className="video-drop"><FileVideo size={30} /><strong>Choose one or more videos</strong><span>MP4, MOV, AVI · files are sampled automatically</span><input type="file" accept="video/*" multiple onChange={(event) => addVideos(event.target.files)} /></label>{videoFiles.length > 0 && <div className="video-queue">{videoFiles.map((file, index) => <div key={`${file.name}-${index}`}><FileVideo size={14} /><span>{file.name}</span><button type="button" onClick={() => setVideoFiles(videoFiles.filter((_, fileIndex) => fileIndex !== index))}><X size={14} /></button></div>)}</div>}<button className="button primary submit-reference" disabled={!videoFiles.length || isVideoScanning}>{isVideoScanning ? <LoaderCircle className="spin" size={16} /> : <Shield size={16} />}{isVideoScanning ? 'Checking queue...' : `Check ${videoFiles.length} video${videoFiles.length === 1 ? '' : 's'}`}</button></form><div className="video-results">{videoResults.length ? videoResults.map((result, index) => <article className="video-result-card" key={`${result.fileName}-${index}`}><div className="video-result-heading"><FileVideo size={16} /><strong>{result.fileName}</strong><span className={result.overall_action === 'BLOCK' ? 'bad-text' : 'good-text'}>{result.overall_action}</span></div><p>{result.summary}</p><small>{result.frames_sampled || 0} frames sampled · {result.frames_with_faces || 0} frames with faces · {result.blocked_frames || 0} blocked</small></article>) : <div className="directory-card directory-empty"><FileVideo size={27} /><strong>Results will appear here</strong><p>Each queued video gets its own summary after processing.</p></div>}</div></div></section> }

function BackButton({ onClick }) { return <button className="back-button" onClick={onClick}><ArrowLeft size={16} /> Back</button> }
function Result({ result }) { const error = result.overall_action === 'ERROR'; const blocked = result.overall_action === 'BLOCK'; return <div className="scan-result"><div className={`verdict ${error ? 'error' : blocked ? 'blocked' : 'cleared'}`}>{error ? <ShieldAlert size={21} /> : blocked ? <ShieldAlert size={21} /> : <Check size={21} />}<div><small>{error ? 'Connection problem' : blocked ? 'Action required' : 'Protection check complete'}</small><strong>{error ? 'Could not analyze' : blocked ? 'Potential manipulation found' : 'No threat detected'}</strong></div></div><p>{result.summary}</p>{!error && <div className="result-stats"><span><b>{result.faces_detected}</b> faces detected</span><span><b>{result.results?.filter((item) => item.name).length || 0}</b> identities matched</span></div>}{result.results?.map((item, index) => <div className="face-result" key={index}><span className={item.action === 'BLOCK' ? 'bad' : 'good'}>{item.action === 'BLOCK' ? <ShieldAlert size={14} /> : <Check size={14} />}</span><div><strong>{item.name || 'Unknown face'}</strong><small>{item.reason}</small></div></div>)}</div> }

export default App;
