import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAAl85IvWatbWiLl7MkCNydknJsttGGktk",
  authDomain: "fire-apsk.firebaseapp.com",
  databaseURL: "https://fire-apsk-default-rtdb.firebaseio.com",
  projectId: "fire-apsk",
  storageBucket: "fire-apsk.firebasestorage.app",
  messagingSenderId: "694099610438",
  appId: "1:694099610438:web:92d00fce314b8b0e49b347",
  measurementId: "G-27X628E1ZL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// The exact data structure your dashboard is expecting
const dummyEmergencyData = {
    temperature: 148.5,
    smoke: 94,
    isAlarm: true,
    fireType: "Electrical (Class E)",
    alarmLevel: "LEVEL 4 | ZONE 4B: SERVER ROOM",
    locationDetails: "Level 4, North Wing,\nServer Room (Room 412)",
    systemStatus: "ALARM ACTIVE",
    suppressionStatus: "ACTIVATED (INERGEN)",
    sprinklerStatus: "DEPLOYED (ZONE 4B)",
    evacuationStatus: "EVACUATION INITIATED",
    alertStatus: "FDNY NOTIFIED",
    mapX: "70%",
    mapY: "55%"
};

// Inject the data into the Realtime Database
const injectData = async () => {
    try {
        const sensorRef = ref(db, 'sensors/zone_4b');
        await set(sensorRef, dummyEmergencyData);
        console.log("🔥 Dummy data successfully injected into Realtime Database!");
    } catch (error) {
        console.error("❌ Error writing to database: ", error);
    }
};

// Run the function
injectData();