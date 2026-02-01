import Stripe from 'stripe';
import { getFirestore } from '../config/firestore.js';

// Inicializar Stripe com a chave secreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Mapeamento de produtos/preços do Stripe para planos do app
const STRIPE_PRODUCT_TO_PLAN = {
  // Adicione aqui os IDs dos produtos/preços do Stripe
  // Exemplo: 'price_1234567890': { planId: 'premium', billingCycle: 'monthly' }
  // Por enquanto, vamos mapear pelo metadata do checkout session
};

// @desc    Handle Stripe webhook events
// @route   POST /api/stripe/webhook
// @access  Public (verificado por assinatura Stripe)
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verificar assinatura do webhook
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // Em desenvolvimento, aceitar sem verificação (NÃO USAR EM PRODUÇÃO)
      console.warn('⚠️ STRIPE_WEBHOOK_SECRET não configurado - aceitando webhook sem verificação');
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('❌ Erro ao verificar webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`📩 Webhook recebido: ${event.type}`);

  const db = getFirestore();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(db, session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(db, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionCanceled(db, subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        await handleInvoicePaid(db, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(db, invoice);
        break;
      }

      default:
        console.log(`ℹ️ Evento não tratado: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
};

// Processar checkout concluído (Payment Link)
async function handleCheckoutCompleted(db, session) {
  console.log('✅ Checkout concluído:', session.id);

  const customerEmail = session.customer_email || session.customer_details?.email;
  
  if (!customerEmail) {
    console.error('❌ Email do cliente não encontrado no checkout');
    return;
  }

  // Buscar usuário pelo email
  const usersSnapshot = await db.collection('users')
    .where('email', '==', customerEmail.toLowerCase())
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.error(`❌ Usuário não encontrado: ${customerEmail}`);
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  const userId = userDoc.id;

  // Determinar o plano baseado no valor pago ou metadata
  let planId = 'premium';
  let billingCycle = 'monthly';
  
  const amountTotal = session.amount_total / 100; // Converter de centavos para reais
  
  // Mapear valores para planos
  if (amountTotal >= 599) {
    planId = 'elite';
    billingCycle = 'yearly';
  } else if (amountTotal >= 199) {
    planId = 'premium';
    billingCycle = 'yearly';
  } else if (amountTotal >= 59) {
    planId = 'elite';
    billingCycle = 'monthly';
  } else if (amountTotal >= 19) {
    planId = 'premium';
    billingCycle = 'monthly';
  }

  // Verificar metadata do checkout (se disponível)
  if (session.metadata?.planId) {
    planId = session.metadata.planId;
  }
  if (session.metadata?.billingCycle) {
    billingCycle = session.metadata.billingCycle;
  }

  // Calcular data de expiração
  const now = new Date();
  const durationDays = billingCycle === 'yearly' ? 365 : 30;
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Atualizar usuário com o novo plano
  await userDoc.ref.update({
    plan: planId,
    planExpiresAt: expiresAt,
    billingCycle,
    autoRenew: true,
    stripeCustomerId: session.customer,
    stripeSessionId: session.id,
    lastPaymentAt: now,
    updatedAt: now
  });

  // Criar registro de pagamento
  await db.collection('payments').add({
    userId,
    userEmail: customerEmail,
    planId,
    billingCycle,
    amount: amountTotal,
    currency: session.currency || 'brl',
    status: 'completed',
    stripeSessionId: session.id,
    stripeCustomerId: session.customer,
    stripePaymentIntentId: session.payment_intent,
    createdAt: now
  });

  console.log(`✅ Plano ${planId} (${billingCycle}) ativado para ${customerEmail}`);
}

// Processar atualização de subscription
async function handleSubscriptionUpdated(db, subscription) {
  console.log('🔄 Subscription atualizada:', subscription.id);

  const customerId = subscription.customer;
  
  // Buscar usuário pelo Stripe Customer ID
  const usersSnapshot = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.log(`ℹ️ Usuário não encontrado para customer: ${customerId}`);
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  
  const status = subscription.status;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

  if (status === 'active') {
    await userDoc.ref.update({
      planExpiresAt: currentPeriodEnd,
      autoRenew: !subscription.cancel_at_period_end,
      stripeSubscriptionId: subscription.id,
      updatedAt: new Date()
    });
    console.log(`✅ Subscription atualizada para usuário ${userDoc.id}`);
  }
}

// Processar cancelamento de subscription
async function handleSubscriptionCanceled(db, subscription) {
  console.log('❌ Subscription cancelada:', subscription.id);

  const customerId = subscription.customer;
  
  const usersSnapshot = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  
  // Manter acesso até o fim do período pago
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  const now = new Date();

  if (currentPeriodEnd > now) {
    // Ainda tem tempo de acesso
    await userDoc.ref.update({
      autoRenew: false,
      planExpiresAt: currentPeriodEnd,
      updatedAt: now
    });
  } else {
    // Período expirado, voltar para free
    await userDoc.ref.update({
      plan: 'free',
      planExpiresAt: null,
      autoRenew: false,
      updatedAt: now
    });
  }

  console.log(`✅ Subscription cancelada processada para usuário ${userDoc.id}`);
}

// Processar pagamento de invoice
async function handleInvoicePaid(db, invoice) {
  console.log('💰 Invoice paga:', invoice.id);

  const customerId = invoice.customer;
  
  const usersSnapshot = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  const now = new Date();

  // Renovar período de acesso
  const subscription = invoice.subscription;
  if (subscription) {
    // Buscar detalhes da subscription para obter período
    try {
      const sub = await stripe.subscriptions.retrieve(subscription);
      const currentPeriodEnd = new Date(sub.current_period_end * 1000);
      
      await userDoc.ref.update({
        planExpiresAt: currentPeriodEnd,
        lastPaymentAt: now,
        updatedAt: now
      });
    } catch (err) {
      console.error('Erro ao buscar subscription:', err);
    }
  }

  // Registrar pagamento
  await db.collection('payments').add({
    userId: userDoc.id,
    userEmail: invoice.customer_email,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency,
    status: 'completed',
    stripeInvoiceId: invoice.id,
    stripeCustomerId: customerId,
    createdAt: now
  });

  console.log(`✅ Pagamento registrado para usuário ${userDoc.id}`);
}

// Processar falha de pagamento
async function handlePaymentFailed(db, invoice) {
  console.log('⚠️ Pagamento falhou:', invoice.id);

  const customerId = invoice.customer;
  
  const usersSnapshot = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  const now = new Date();

  // Registrar falha de pagamento
  await db.collection('payment_failures').add({
    userId: userDoc.id,
    userEmail: invoice.customer_email,
    amount: invoice.amount_due / 100,
    currency: invoice.currency,
    stripeInvoiceId: invoice.id,
    stripeCustomerId: customerId,
    createdAt: now
  });

  // Não cancelar imediatamente - Stripe vai tentar novamente
  console.log(`⚠️ Falha de pagamento registrada para usuário ${userDoc.id}`);
}
