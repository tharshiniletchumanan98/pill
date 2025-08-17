// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Power, Thermometer, Droplets, Sun, Gauge, Pill } from 'lucide-react';

// Import Firebase functions for Realtime Database
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';

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

const appId = "pill-2bd05";

const App = () => {
  const [mode, setMode] = useState('manual');
  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    luminosity: 0,
    pillCounts: { A: 0, B: 0, C: 0 },
  });
  const [status, setStatus] = useState('Disconnected');
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState(null);
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
      
      // Setup listener for the public data path
      setupRealtimeDbListener(database);

    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      setFirebaseError(`Failed to initialize Firebase: ${e.message}`);
      setLoading(false);
    }

    // Cleanup function for the listener (optional but good practice)
    return () => {
      // You can detach the listener here if needed
    };
  }, []);

  const setupRealtimeDbListener = (database) => {
    if (!database) return;
    // Data path is now public, without a user ID
    const dataPath = `artifacts/${appId}/public/device_state`;
    const dataRef = ref(database, dataPath);

    onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMode(data.mode || 'manual');
        setSensorData({
          temperature: data.temperature || 0,
          humidity: data.humidity || 0,
          luminosity: data.luminosity || 0,
          pillCounts: data.pillCounts || { A: 0, B: 0, C: 0 },
        });
        setStatus('Connected');
      } else {
        // If no data exists, initialize the path with default values
        set(dataRef, {
          mode: 'manual',
          temperature: 0,
          humidity: 0,
          luminosity: 0,
          pillCounts: { A: 0, B: 0, C: 0 },
        });
        setStatus('Connected');
      }
    }, (error) => {
      console.error("Failed to fetch device state:", error);
      setStatus('Disconnected');
    });
  };

  const handleModeChange = async (newMode) => {
    if (!db) return;
    setMode(newMode);
    // Data path is now public
    const dataPath = `artifacts/${appId}/public/device_state`;
    const dataRef = ref(db, dataPath);
    try {
      await set(dataRef, { ...sensorData, mode: newMode });
    } catch (e) {
      console.error("Error updating mode: ", e);
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
            <Gauge className="mr-3 text-indigo-600" size={32} />
            ESP32 Device Monitor
          </h1>
          <div className={`mt-4 sm:mt-0 px-4 py-1 rounded-full text-sm font-semibold ${getStatusColor(status)}`}>
            Status: {status}
          </div>
        </div>

        {/* Device Mode Control and Sensor Readings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Panel: Mode Control */}
          <div className="flex flex-col h-full bg-white rounded-2xl p-6 border-2 border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
              <Power className="mr-2 text-indigo-500" size={24} />
              Device Mode
            </h2>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl shadow-inner border border-gray-300">
              <span className="text-lg font-medium text-gray-700">Current Mode: {mode === 'automatic' ? 'Automatic' : 'Manual'}</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleModeChange('manual')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200
                    ${mode === 'manual' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}
                >
                  Manual
                </button>
                <button
                  onClick={() => handleModeChange('automatic')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200
                    ${mode === 'automatic' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}
                >
                  Automatic
                </button>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              In Manual mode, you control dispensing. In Automatic mode, the ESP32 follows a pre-set schedule.
            </p>
          </div>

          {/* Right Panel: Sensor Data and Pill Counts */}
          <div className="flex flex-col h-full space-y-8">
            
            {/* Sensor Readings */}
            <div className="p-6 bg-white rounded-2xl border-2 border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
                <Gauge className="mr-2 text-indigo-500" size={24} />
                Sensor Readings
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl shadow-inner">
                  <Thermometer size={32} className="text-red-500 mb-2" />
                  <span className="text-sm font-medium text-gray-600">Temperature</span>
                  <span className="text-2xl font-bold text-gray-800">{sensorData.temperature}°C</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl shadow-inner">
                  <Droplets size={32} className="text-blue-500 mb-2" />
                  <span className="text-sm font-medium text-gray-600">Humidity</span>
                  <span className="text-2xl font-bold text-gray-800">{sensorData.humidity}%</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl shadow-inner">
                  <Sun size={32} className="text-yellow-500 mb-2" />
                  <span className="text-sm font-medium text-gray-600">Luminosity</span>
                  <span className="text-2xl font-bold text-gray-800">{sensorData.luminosity} Lux</span>
                </div>
              </div>
            </div>

            {/* Pill Counts */}
            <div className="p-6 bg-white rounded-2xl border-2 border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
                <Pill className="mr-2 text-indigo-500" size={24} />
                Pill Counts
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {['A', 'B', 'C'].map(compartment => (
                  <div key={compartment} className="flex flex-col items-center p-4 bg-gray-50 rounded-xl shadow-inner">
                    <span className="text-sm font-medium text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full mb-2">{`Comp. ${compartment}`}</span>
                    <span className="text-3xl font-bold text-gray-800">{sensorData.pillCounts[compartment] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
