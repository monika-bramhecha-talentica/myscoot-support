import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD0LR2cS3ee562tPtC006KHYrev3BLV5EM",
  authDomain: "myscoot-application.firebaseapp.com",
  projectId: "myscoot-application",
  storageBucket: "myscoot-application.firebasestorage.app",
  messagingSenderId: "497438232417",
  appId: "1:497438232417:web:ae92e76d27481d22043f20",
  measurementId: "G-8TQ4XL6VLF"
};

// Initialize Firebase - prevent duplicate app error
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;
