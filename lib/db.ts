import { db } from './firebase';
import { collection, doc, setDoc, getDocs, getDoc, query, orderBy, serverTimestamp, addDoc, updateDoc, Timestamp, deleteDoc, writeBatch } from 'firebase/firestore';

export interface Journal {
  id: string;
  title: string;
  createdAt: any;
  updatedAt: any;
  mood?: string;
  compiledJournal?: string;
  lastSummarizedMessageId?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: any;
}

export async function createJournal(userId: string, title: string): Promise<string> {
  const docRef = await addDoc(collection(db, 'users', userId, 'journals'), {
    title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getJournals(userId: string): Promise<Journal[]> {
  const q = query(
    collection(db, 'users', userId, 'journals'),
    orderBy('updatedAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Journal[];
}

export async function getJournal(userId: string, journalId: string): Promise<Journal | null> {
  const docRef = doc(db, 'users', userId, 'journals', journalId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Journal;
  }
  return null;
}

export async function deleteJournal(userId: string, journalId: string): Promise<void> {
  const docRef = doc(db, 'users', userId, 'journals', journalId);
  await deleteDoc(docRef);
}

export async function renameJournal(userId: string, journalId: string, newTitle: string): Promise<void> {
  const docRef = doc(db, 'users', userId, 'journals', journalId);
  await updateDoc(docRef, {
    title: newTitle,
    updatedAt: serverTimestamp(),
  });
}

export async function updateJournalMood(userId: string, journalId: string, mood: string): Promise<void> {
  const docRef = doc(db, 'users', userId, 'journals', journalId);
  await updateDoc(docRef, {
    mood,
    updatedAt: serverTimestamp(),
  });
}

export async function updateJournalSummary(userId: string, journalId: string, compiledJournal: string, lastSummarizedMessageId: string): Promise<void> {
  const docRef = doc(db, 'users', userId, 'journals', journalId);
  await updateDoc(docRef, {
    compiledJournal,
    lastSummarizedMessageId,
    updatedAt: serverTimestamp(),
  });
}

export async function addMessagesBatch(userId: string, journalId: string, messages: {role: 'user'|'model', text: string}[]): Promise<void> {
  const batch = writeBatch(db);
  const messagesRef = collection(db, 'users', userId, 'journals', journalId, 'messages');
  const journalRef = doc(db, 'users', userId, 'journals', journalId);
  
  const now = Date.now();
  messages.forEach((msg, index) => {
    const msgDocRef = doc(messagesRef);
    batch.set(msgDocRef, {
      role: msg.role,
      text: msg.text,
      createdAt: Timestamp.fromMillis(now + index),
    });
  });

  batch.update(journalRef, {
    updatedAt: serverTimestamp()
  });

  await batch.commit();
}

export async function addMessage(userId: string, journalId: string, role: 'user' | 'model', text: string): Promise<string> {
  const messagesRef = collection(db, 'users', userId, 'journals', journalId, 'messages');
  const docRef = await addDoc(messagesRef, {
    role,
    text,
    createdAt: serverTimestamp(),
  });
  
  const journalRef = doc(db, 'users', userId, 'journals', journalId);
  await updateDoc(journalRef, {
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function getMessages(userId: string, journalId: string): Promise<Message[]> {
  const q = query(
    collection(db, 'users', userId, 'journals', journalId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Message[];
}
