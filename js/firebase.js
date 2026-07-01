import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBccHrUpd46apovbDfrEiPUfDbUxt26klU",
  authDomain: "ctd-dashboard-5d8bb.firebaseapp.com",
  projectId: "ctd-dashboard-5d8bb",
  storageBucket: "ctd-dashboard-5d8bb.firebasestorage.app",
  messagingSenderId: "2042009377",
  appId: "1:2042009377:web:7ed9273e0abc378ed7d060"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PRODUCTS_COLLECTION = "products";

export {
  db,
  PRODUCTS_COLLECTION,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot
};