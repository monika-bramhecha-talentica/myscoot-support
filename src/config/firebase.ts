import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// const firebaseConfig = {
//   apiKey: "AIzaSyDxxx", // Replace with your Firebase config
//   authDomain: "your-project.firebaseapp.com",
//   projectId: "your-project-id",
//   storageBucket: "your-project.appspot.com",
//   messagingSenderId: "123456789",
//   appId: "1:123456789:web:abcdef"
// };

const firebaseConfig = {
  apiKey: "AIzaSyD0LR2cS3ee562tPtC006KHYrev3BLV5EM",
  authDomain: "myscoot-application.firebaseapp.com",
  projectId: "myscoot-application",
  storageBucket: "myscoot-application.firebasestorage.app",
  messagingSenderId: "497438232417",
  appId: "1:497438232417:web:ae92e76d27481d22043f20",
  measurementId: "G-8TQ4XL6VLF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;
