import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB5nlQXCicThyPBlhml8_0ozO5TYFkM9CE",
  authDomain: "smart-supply-chain-89519.firebaseapp.com",
  databaseURL: "https://smart-supply-chain-89519-default-rtdb.firebaseio.com",
  projectId: "smart-supply-chain-89519",
  storageBucket: "smart-supply-chain-89519.firebasestorage.app",
  messagingSenderId: "407837170523",
  appId: "1:407837170523:web:057dd643f7e7b8ce28587e",
  measurementId: "G-YMT4WT1C43"
};

import { getDatabase } from "firebase/database";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

export default app;
