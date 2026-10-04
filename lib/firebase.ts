import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Verifique a configuração do Firebase.');
    }
  }
}

// Data models
export interface Tenant {
  id?: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  unitNumber: string;
  status: 'active' | 'inactive';
  emergencyContact: string;
  moveInDate: string;
  createdAt: string;
}

export interface Unit {
  id?: string;
  unitNumber: string;
  block: string;
  floor: string;
  type: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  rentPrice: number;
  currentTenantId?: string;
  currentTenantName?: string;
  features: string;
  createdAt: string;
}

export interface CleaningStaff {
  id?: string;
  name: string;
  phone: string;
  email: string;
  status: 'active' | 'vacation' | 'inactive';
  shiftPreference: string;
  notes: string;
  createdAt: string;
}

export interface CleaningSchedule {
  id?: string;
  staffId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  shift: 'morning' | 'afternoon' | 'night';
  departmentOrArea: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  notes: string;
  createdAt: string;
}

export interface MaintenanceReport {
  id?: string;
  tenantName: string;
  tenantContact: string;
  unitNumber: string;
  category: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  description: string;
  photoUrl?: string;
  status: 'open' | 'reviewing' | 'scheduled' | 'resolved';
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface Announcement {
  id?: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'urgent';
  category: string;
  sentAt: string;
  authorName: string;
}

export interface Payment {
  id?: string;
  tenantName: string;
  unitNumber: string;
  amount: number;
  referenceMonth: string;
  dueDate: string;
  paymentDate?: string;
  status: 'paid' | 'pending' | 'overdue';
  paymentMethod?: string;
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
}

