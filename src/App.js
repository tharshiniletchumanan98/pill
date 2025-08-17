// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Power, Ruler, Clock, CheckCircle, XCircle, Save, RefreshCcw, PillBottle } from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update } from 'firebase/database';

// Manually defining Firebase configuration to avoid compilation errors
const firebaseConfig = {
  apiKey: "AIzaSyBuETMWjce-ECQYuclvOnkOzp4FIOEQUTI",
  authDomain: "pill-2bd05.firebaseapp.com",
  databaseURL: "https://pill-2bd05-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pill-2bd05",
  storageBucket: "pill-2bd05.appspot.com",
  messagingSenderId: "541233157497",
  appId: "1:541233157497:web:ab123cd456ef7890ghij"
};

const App = () => {
  // State for displaying device data from Firebase
  const [deviceData, setDeviceData] = useState({
    distance: 0,
    pillTaken: "NO",
    pillTakenTime: "",
    timeAutomaticA: "0",
    timeAutomaticB: "0",
    timeAutomaticC: "0",
  });
  // State for the user's input in the automatic times fields
  const [automaticTimes, setAutomaticTimes] = useState({
    timeAutomaticA: "",
    timeAutomaticB: "",
    timeAutomaticC: "",
  });
  // State for the connection status
  const [status, setStatus] = useState('Disconnected');
  // State for the device reset button status
  const [resetStatus, setResetStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  // State for initial loading
  const [loading, setLoading] = useState(true);
  // State for Firebase errors
  const [firebaseError, setFirebaseError] = useState(null);
  // State for the Firebase database instance
  const [db, setDb] = useState(null);

  useEffect(() => {
    let app;
    let database;

    try {
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApp();
      }

      database = getDatabase(app);
      setDb(database);
      setLoading(false);
      
      // Setup listener for the root-level path
      setupRealtimeDbListener(database);

    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      setFirebaseError(`Failed to initialize Firebase: ${e.message}`);
      setLoading(false);
    }

    return () => {
      // Cleanup function to detach the listener
    };
  }, []);

  const setupRealtimeDbListener = (database) => {
    if (!database) return;
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
        // Initialize the database with default values if it's empty
        set(dataRef, {
          mode: 'automatic',
          distance: 0,
          pillTaken: "NO",
          pillTakenTime: "",
          reset: "NO", // Initialize the new reset path
          timeAutomaticA: "0",
          timeAutomaticB: "0",
          timeAutomaticC: "0",
          timeManualA: "0",
          timeManualB: "0",
          timeManualC: "0",
        });
        setStatus('Connected');
      }
    }, (error) => {
      console.error("Failed to fetch device state:", error);
      setStatus('Disconnected');
    });
  };

  const handleSaveAutomaticTimes = async () => {
    if (!db) return;
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
    if (!db) return;
    setResetStatus('loading');
    const resetRef = ref(db, 'reset');
    try {
      // As requested, this now sets the 'reset' value to "YES"
      await set(resetRef, 'YES');
      setResetStatus('success');
      setTimeout(() => setResetStatus('idle'), 3000); // Reset status after 3 seconds
    } catch (e) {
      console.error("Error resetting device: ", e);
      setResetStatus('error');
      setTimeout(() => setResetStatus('idle'), 3000); // Reset status after 3 seconds
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

  if (loading) {
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

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-8 font-sans antialiased flex items-center justify-center">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden p-6 md:p-10">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <PillBottle className="mr-3 text-indigo-600" size={32} />
            Automatic Pill Dispenser Monitor
          </h1>
          <div className={`mt-4 sm:mt-0 px-4 py-1 rounded-full text-sm font-semibold ${getStatusColor(status)}`}>
            Status: {status}
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
