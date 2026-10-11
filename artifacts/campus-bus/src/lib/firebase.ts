import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer, collection, getDocs, setDoc } from "firebase/firestore";

// Firebase Applet Configuration
const firebaseConfig = {
  projectId: "gen-lang-client-0401860034",
  appId: "1:896529553753:web:045ddd4cdfbde63eb2d448",
  apiKey: "AIzaSyA0mLy5E3tzy0rmT40hXu0PaL3W5WcRBNA",
  authDomain: "gen-lang-client-0401860034.firebaseapp.com",
  storageBucket: "gen-lang-client-0401860034.firebasestorage.app",
  messagingSenderId: "896529553753",
};

const DATABASE_ID = "ai-studio-campuscommutecon-1378b7b1-73b9-4556-9f54-c00081ec41db";

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestore = getFirestore(app, DATABASE_ID);

// Verify initial connection per skill mandate
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(firestore, "test", "connection"));
    console.log("[Firebase] Firestore connected successfully");
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("[Firebase] Client is offline or Firestore initializing:", error.message);
    } else {
      console.log("[Firebase] Connection check response received");
    }
    return false;
  }
}

// Background initial test connection call
testFirestoreConnection().catch(() => null);
