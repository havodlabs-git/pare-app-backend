import admin from 'firebase-admin';

let db;

export const initializeFirestore = () => {
  try {
    // Initialize Firebase Admin SDK
    // In Cloud Run, Application Default Credentials are automatically available
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: process.env.GOOGLE_CLOUD_PROJECT || 'pare-app-483321'
      });
    }

    db = admin.firestore();
    
    // Configure Firestore settings
    db.settings({
      ignoreUndefinedProperties: true
    });

    console.log('✅ Firestore connected successfully');
    return db;
  } catch (error) {
    console.error('❌ Firestore connection error:', error.message);
    process.exit(1);
  }
};

export const getFirestore = () => {
  if (!db) {
    throw new Error('Firestore not initialized. Call initializeFirestore() first.');
  }
  return db;
};

export default { initializeFirestore, getFirestore };
