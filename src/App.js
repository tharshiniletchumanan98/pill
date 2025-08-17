import React, { useState, useEffect } from 'react';
import { Power, Ruler, Clock, CheckCircle, XCircle, Save, RefreshCcw, PillBottle, LogIn, LogOut, Mail, Lock } from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

// IMPORTANT: Do NOT hardcode API keys in production applications.
// This is for demonstration purposes. In a real app, you would use a .env file.
// For this app to work outside of this environment, create a .env file with these values:

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const App = () => {
  // Authentication states
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // App states for Firebase
  const [deviceData, setDeviceData] = useState({
    distance: 0,
    pillTaken: "NO",
    pillTakenTime: "",
    timeAutomaticA: "0",
    timeAutomaticB: "0",
    timeAutomaticC: "0",
  });
  const [automaticTimes, setAutomaticTimes] = useState({
    timeAutomaticA: "",
    timeAutomaticB: "",
    timeAutomaticC: "",
  });
  const [status, setStatus] = useState('Disconnected');
  const [resetStatus, setResetStatus] = useState('idle');
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    let app;
    let database;
    let authService;

    try {
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApp();
      }
      
      database = getDatabase(app);
      authService = getAuth(app);
      setDb(database);
      setAuth(authService);
      setLoading(false);

      // Set up authentication state listener
      onAuthStateChanged(authService, (currentUser) => {
        setUser(currentUser);
        setIsAuthReady(true);
      });
      
    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      setFirebaseError(`Failed to initialize Firebase: ${e.message}`);
      setLoading(false);
    }

    // Set up a timer to update the current time every second
    const intervalId = setInterval(() => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    }, 1000);

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);

  }, []);

  // Effect to handle Firebase DB listener after authentication is ready
  useEffect(() => {
    if (db && isAuthReady) {
      if (user) {
        setupRealtimeDbListener(db);
      } else {
        // Clear data if user logs out
        setDeviceData({
          distance: 0, pillTaken: "NO", pillTakenTime: "",
          timeAutomaticA: "0", timeAutomaticB: "0", timeAutomaticC: "0",
        });
        setStatus('Disconnected');
      }
    }
  }, [db, isAuthReady, user]);

  const setupRealtimeDbListener = (database) => {
    const dataRef = ref(database, '/');
    onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setDeviceData({
          distance: data.distance ? parseFloat(data.distance).toFixed(2) : 0,
          pillTaken: data.pillTaken || 'NO',
          pillTakenTime: data.pillTakenTime || '',
          timeAutomaticA: data.timeAutomaticA || '0',
          timeAutomaticB: data.timeAutomaticB || '0',
          timeAutomaticC: data.timeAutomaticC || '0',
        });
        setStatus('Connected');
      } else {
        set(dataRef, {
          mode: 'automatic', distance: 0, pillTaken: "NO", pillTakenTime: "",
          reset: "NO", timeAutomaticA: "0", timeAutomaticB: "0", timeAutomaticC: "0",
          timeManualA: "0", timeManualB: "0", timeManualC: "0",
        });
        setStatus('Connected');
      }
    }, (error) => {
      console.error("Failed to fetch device state:", error);
      setStatus('Disconnected');
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!auth) return;
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setLoginError('Login failed. Please check your email and password.');
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      // Data will be cleared by the useEffect hook
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSaveAutomaticTimes = async () => {
    if (!db || !user) return;
    const dataRef = ref(db, '/');
    try {
      await update(dataRef, {
        timeAutomaticA: automaticTimes.timeAutomaticA,
        timeAutomaticB: automaticTimes.timeAutomaticB,
        timeAutomaticC: automaticTimes.timeAutomaticC,
      });
    } catch (e) {
      console.error("Error updating automatic times: ", e);
    }
  };

  const handleResetDevice = async () => {
    if (!db || !user) return;
    setResetStatus('loading');
    const resetRef = ref(db, 'reset');
    try {
      await set(resetRef, 'YES');
      setResetStatus('success');
      setTimeout(() => setResetStatus('idle'), 3000);
    } catch (e) {
      console.error("Error resetting device: ", e);
      setResetStatus('error');
      setTimeout(() => setResetStatus('idle'), 3000);
    }
  };

  const getStatusColor = (currentStatus) => {
    switch(currentStatus) {
      case 'Connected':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-red-100 text-red-700';
    }
  };
  
  const getPillTakenIcon = (status) => {
    return status === 'YES' ? <CheckCircle className="text-green-500" size={32} /> : <XCircle className="text-red-500" size={32} />;
  };

  if (loading || !isAuthReady) {
    return (
      <div className="bg-gray-100 min-h-screen p-4 sm:p-8 font-sans antialiased flex items-center justify-center">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    );
  }

  if (firebaseError) {
    return (
      <div className="bg-gray-100 min-h-screen p-4 sm:p-8 font-sans antialiased flex items-center justify-center">
        <div className="text-center p-6 bg-red-100 border border-red-400 text-red-700 rounded-lg max-w-md mx-auto">
          <p className="font-semibold mb-2">Error connecting to Firebase:</p>
          <p>{firebaseError}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-gray-100 min-h-screen p-4 sm:p-8 font-sans antialiased flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center justify-center">
            <LogIn className="mr-2 text-indigo-600" />
            Login to Dispenser
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main app content
  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-8 font-sans antialiased flex items-center justify-center">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden p-6 md:p-10">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-gray-200">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center mb-2 sm:mb-0">
            <PillBottle className="mr-3 text-indigo-600" size={32} />
            Automatic Pill Dispenser
          </h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center mt-4 sm:mt-0 space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Display the current time */}
            <div className="text-sm font-semibold text-gray-600">
              Current Time: {currentTime}
            </div>
            {/* Display the logged-in user's email */}
            <div className="text-sm font-semibold text-gray-600">
              Logged in as: {user.email}
            </div>
            <div className={`px-4 py-1 rounded-full text-sm font-semibold ${getStatusColor(status)}`}>
              Status: {status}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-1 rounded-full text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex items-center"
            >
              <LogOut size={16} className="mr-1" />
              Logout
            </button>
          </div>
        </div>

        {/* Device Data Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Panel: Automatic Time Inputs */}
          <div className="flex flex-col h-full bg-white rounded-2xl p-6 border-2 border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
              <Power className="mr-2 text-indigo-500" size={24} />
              Set Automatic Times
            </h2>
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-300 shadow-inner">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Update Automatic Times</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  {['A', 'B', 'C'].map((pill, index) => (
                    <div key={index} className="flex flex-col">
                      <label className="text-sm font-medium text-gray-600 mb-1">Pill {pill} Time</label>
                      <input
                        type="text"
                        value={automaticTimes[`timeAutomatic${pill}`]}
                        onChange={(e) => setAutomaticTimes({ ...automaticTimes, [`timeAutomatic${pill}`]: e.target.value })}
                        placeholder="e.g., 0913"
                        className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSaveAutomaticTimes}
                  className="w-full px-4 py-2 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center"
                >
                  <Save size={20} className="mr-2" />
                  Save Automatic Times
                </button>
              </div>
          </div>

          {/* Right Panel: Data Display */}
          <div className="flex flex-col h-full space-y-8">
            
            {/* Sensor Readings & Pill Status */}
            <div className="p-6 bg-white rounded-2xl border-2 border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
                <Ruler className="mr-2 text-indigo-500" size={24} />
                Sensor & Pill Status
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl shadow-inner">
                  <Ruler size={32} className="text-gray-500 mb-2" />
                  <span className="text-sm font-medium text-gray-600">Distance</span>
                  <span className="text-2xl font-bold text-gray-800">{deviceData.distance} cm</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl shadow-inner">
                  {getPillTakenIcon(deviceData.pillTaken)}
                  <span className="text-sm font-medium text-gray-600">Pill Taken</span>
                  <span className="text-2xl font-bold text-gray-800">{deviceData.pillTaken}</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl shadow-inner">
                  <Clock size={32} className="text-gray-500 mb-2" />
                  <span className="text-sm font-medium text-gray-600">Pill Taken Time</span>
                  <span className="text-sm font-bold text-gray-800 text-center">{deviceData.pillTakenTime}</span>
                </div>
              </div>
            </div>

            {/* Time Settings & Reset Button */}
            <div className="p-6 bg-white rounded-2xl border-2 border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
                <Clock className="mr-2 text-indigo-500" size={24} />
                Control Panel
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl shadow-inner">
                  <span className="text-lg font-semibold text-gray-700 mb-2">Current Automatic Times</span>
                  <ul className="list-none p-0 m-0 text-sm text-gray-600 space-y-1">
                    <li><span className="font-medium text-indigo-600">Pill A:</span> {deviceData.timeAutomaticA}</li>
                    <li><span className="font-medium text-indigo-600">Pill B:</span> {deviceData.timeAutomaticB}</li>
                    <li><span className="font-medium text-indigo-600">Pill C:</span> {deviceData.timeAutomaticC}</li>
                  </ul>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl shadow-inner">
                    <button
                      onClick={handleResetDevice}
                      disabled={resetStatus === 'loading'}
                      className={`w-full px-4 py-2 rounded-lg font-semibold text-white transition-colors duration-200 flex items-center justify-center
                        ${resetStatus === 'loading' ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                      {resetStatus === 'loading' ? (
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <RefreshCcw size={20} className="mr-2" />
                      )}
                      Reset Device
                    </button>
                    {resetStatus === 'success' && (
                        <p className="mt-2 text-sm text-green-600">Reset command sent!</p>
                    )}
                    {resetStatus === 'error' && (
                        <p className="mt-2 text-sm text-red-600">Failed to send reset command.</p>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
