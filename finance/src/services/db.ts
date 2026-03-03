import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { MonthlyConfig, UserSettings, Snapshot } from '../types';

// User Settings
export const getUserSettings = async (uid: string) => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as UserSettings) : null;
};

export const saveUserSettings = async (uid: string, settings: Partial<UserSettings>) => {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
};

// Monthly Config
export const getMonthlyConfig = async (uid: string) => {
    const docRef = doc(db, 'monthlyConfigs', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as MonthlyConfig) : null;
};

export const saveMonthlyConfig = async (uid: string, config: Partial<MonthlyConfig>) => {
    const docRef = doc(db, 'monthlyConfigs', uid);
    await setDoc(docRef, { ...config, uid, updatedAt: serverTimestamp() }, { merge: true });
};

// Snapshots
export const getSnapshots = async (uid: string) => {
    const q = query(collection(db, 'snapshots'), where('uid', '==', uid), orderBy('yearMonth', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Snapshot));
};

export const saveSnapshot = async (snapshot: Snapshot) => {
    const docId = `${snapshot.uid}_${snapshot.yearMonth.replace('-', '_')}`;
    const docRef = doc(db, 'snapshots', docId);
    await setDoc(docRef, { ...snapshot, updatedAt: serverTimestamp() }, { merge: true });
};

export const getLatestSnapshot = async (uid: string) => {
    const q = query(collection(db, 'snapshots'), where('uid', '==', uid), orderBy('yearMonth', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty ? null : (querySnapshot.docs[0].data() as Snapshot);
};
