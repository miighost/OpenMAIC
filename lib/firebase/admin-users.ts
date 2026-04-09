import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { firebaseDb } from './client';

export type AppUserRole = 'owner' | 'admin' | 'member';
export type AppPlan = 'free' | 'pro' | 'enterprise';

export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  role: AppUserRole;
  plan: AppPlan;
  premium: boolean;
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const USERS_COLLECTION = 'users';

export async function getUserById(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(firebaseDb, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return snap.data() as AppUser;
}

export async function listUsers(): Promise<AppUser[]> {
  const q = query(collection(firebaseDb, USERS_COLLECTION), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as AppUser);
}

export async function ensureUserDocument(
  uid: string,
  email: string,
  displayName?: string | null,
): Promise<void> {
  const ref = doc(firebaseDb, USERS_COLLECTION, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    uid,
    email,
    displayName: displayName ?? '',
    role: 'member',
    plan: 'free',
    premium: false,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserAdminFields(
  uid: string,
  patch: Pick<AppUser, 'role' | 'plan' | 'premium' | 'isActive'>,
): Promise<void> {
  const ref = doc(firebaseDb, USERS_COLLECTION, uid);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

