import admin from 'firebase-admin';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inicializar Firebase Admin
const serviceAccount = require('../src/config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateUserPlan(email, plan) {
  try {
    // Buscar usuário pelo email
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
    
    if (snapshot.empty) {
      console.log(`Usuário com email ${email} não encontrado`);
      return;
    }
    
    // Atualizar o plano do usuário
    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;
    
    // Calcular data de expiração (1 ano a partir de agora)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    
    await usersRef.doc(userId).update({
      plan: plan,
      planExpiresAt: expiresAt,
      updatedAt: new Date()
    });
    
    console.log(`✅ Plano do usuário ${email} atualizado para ${plan}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Expira em: ${expiresAt.toISOString()}`);
    
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
  } finally {
    process.exit(0);
  }
}

// Executar
const email = process.argv[2] || 'dovahpotato@gmail.com';
const plan = process.argv[3] || 'elite';

console.log(`Atualizando plano do usuário ${email} para ${plan}...`);
updateUserPlan(email, plan);
