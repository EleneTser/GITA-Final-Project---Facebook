import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBp6MYYrluCJf3DUCLclEm1XFslwfmoZak",
  authDomain: "facebookclone-ffdee.firebaseapp.com",
  projectId: "facebookclone-ffdee",
  storageBucket: "facebookclone-ffdee.firebasestorage.app",
  messagingSenderId: "249524775581",
  appId: "1:249524775581:web:6ab27836eb9b99ef2b8274",
  measurementId: "G-YY03RGTC2V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
