import { getFirestore } from '../config/firestore.js';

// Plan definitions
const PLANS = {
  free: {
    id: 'free',
    name: 'Gratuito',
    description: 'Perfeito para começar sua jornada',
    priceMonthly: 0,
    priceYearly: 0,
    trialDays: 7,
    features: [
      '1 módulo ativo',
      'Contador de dias básico',
      '5 achievements',
      'Estatísticas básicas',
      'Acesso ao fórum'
    ],
    limitations: [
      'Módulos ilimitados',
      'Análise avançada',
      'Exportar relatórios',
      'Suporte prioritário'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Para quem quer resultados sérios',
    priceMonthly: 1990, // R$ 19,90 em centavos
    priceYearly: 19900, // R$ 199,00 em centavos (~17% desconto)
    trialDays: 0,
    features: [
      'Até 3 módulos ativos',
      'Contador avançado',
      '20+ achievements exclusivos',
      'Estatísticas avançadas',
      'Gráficos detalhados',
      'Metas personalizadas',
      'Notificações motivacionais',
      'Exportar relatórios PDF',
      'Suporte prioritário'
    ],
    limitations: []
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    description: 'Transformação completa',
    priceMonthly: 3990, // R$ 39,90 em centavos
    priceYearly: 39900, // R$ 399,00 em centavos (~17% desconto)
    trialDays: 0,
    features: [
      'Módulos ilimitados',
      'Todos os recursos Premium',
      '50+ achievements exclusivos',
      'IA de análise comportamental',
      'Coaching semanal por e-mail',
      'Relatórios personalizados',
      'Badge exclusivo Elite',
      'Acesso a grupo VIP',
      'Suporte prioritário 24/7',
      'Sessões com psicólogos via Zoom'
    ],
    limitations: []
  }
};

// @desc    Get all available plans
// @route   GET /api/subscriptions/plans
// @access  Public
export const getPlans = async (req, res) => {
  try {
    const plans = Object.values(PLANS).map(plan => ({
      ...plan,
      priceMonthlyFormatted: `R$ ${(plan.priceMonthly / 100).toFixed(2).replace('.', ',')}`,
      priceYearlyFormatted: `R$ ${(plan.priceYearly / 100).toFixed(2).replace('.', ',')}`,
      yearlyDiscount: plan.priceMonthly > 0 
        ? Math.round((1 - (plan.priceYearly / (plan.priceMonthly * 12))) * 100) 
        : 0
    }));

    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar planos',
      error: error.message
    });
  }
};

// @desc    Get current user subscription
// @route   GET /api/subscriptions/current
// @access  Private
export const getCurrentSubscription = async (req, res) => {
  try {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(req.user.id).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const user = userDoc.data();
    const now = new Date();
    
    // Check trial status for free users
    let trialStatus = null;
    let isTrialExpired = false;
    let daysRemaining = 0;

    if (user.plan === 'free') {
      const trialEndsAt = user.trialEndsAt ? user.trialEndsAt.toDate() : null;
      
      if (trialEndsAt) {
        isTrialExpired = now > trialEndsAt;
        daysRemaining = Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)));
        
        trialStatus = {
          isActive: !isTrialExpired,
          endsAt: trialEndsAt,
          daysRemaining
        };
      } else {
        // User registered before trial system - give them 7 days from now
        const newTrialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        await userDoc.ref.update({ trialEndsAt: newTrialEnd });
        
        trialStatus = {
          isActive: true,
          endsAt: newTrialEnd,
          daysRemaining: 7
        };
      }
    }

    // Check subscription status for paid users
    let subscriptionStatus = null;
    if (user.plan !== 'free' && user.planExpiresAt) {
      const expiresAt = user.planExpiresAt.toDate();
      const isExpired = now > expiresAt;
      
      subscriptionStatus = {
        isActive: !isExpired,
        expiresAt,
        billingCycle: user.billingCycle || 'monthly',
        autoRenew: user.autoRenew !== false
      };
    }

    res.status(200).json({
      success: true,
      data: {
        plan: user.plan,
        planDetails: PLANS[user.plan],
        trial: trialStatus,
        subscription: subscriptionStatus,
        canAccessApp: user.plan !== 'free' || (trialStatus && trialStatus.isActive),
        needsUpgrade: user.plan === 'free' && isTrialExpired
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar assinatura',
      error: error.message
    });
  }
};

// @desc    Create new subscription
// @route   POST /api/subscriptions/create
// @access  Private
export const createSubscription = async (req, res) => {
  try {
    const { planId, billingCycle, paymentToken } = req.body;
    const db = getFirestore();

    if (!['premium', 'elite'].includes(planId)) {
      return res.status(400).json({
        success: false,
        message: 'Plano inválido'
      });
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({
        success: false,
        message: 'Ciclo de cobrança inválido'
      });
    }

    const plan = PLANS[planId];
    const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    const durationDays = billingCycle === 'yearly' ? 365 : 30;

    // Calculate expiration date
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Create subscription record
    const subscriptionData = {
      userId: req.user.id,
      planId,
      billingCycle,
      price,
      status: 'pending', // Will be updated after payment verification
      paymentToken,
      createdAt: now,
      expiresAt
    };

    const subscriptionRef = await db.collection('subscriptions').add(subscriptionData);

    // Update user plan (will be confirmed after payment)
    await db.collection('users').doc(req.user.id).update({
      pendingSubscription: subscriptionRef.id,
      updatedAt: now
    });

    res.status(201).json({
      success: true,
      message: 'Assinatura criada. Aguardando confirmação de pagamento.',
      data: {
        subscriptionId: subscriptionRef.id,
        plan: planId,
        billingCycle,
        price,
        priceFormatted: `R$ ${(price / 100).toFixed(2).replace('.', ',')}`,
        expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar assinatura',
      error: error.message
    });
  }
};

// @desc    Verify Google Pay payment and activate subscription
// @route   POST /api/subscriptions/verify-google-payment
// @access  Private
export const verifyGooglePayment = async (req, res) => {
  try {
    const { subscriptionId, purchaseToken, productId } = req.body;
    const db = getFirestore();

    // Get subscription
    const subscriptionDoc = await db.collection('subscriptions').doc(subscriptionId).get();
    
    if (!subscriptionDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Assinatura não encontrada'
      });
    }

    const subscription = subscriptionDoc.data();

    if (subscription.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // TODO: Verify with Google Play API
    // For now, we'll trust the client-side verification
    // In production, you should verify the purchase token with Google's API

    const now = new Date();
    const durationDays = subscription.billingCycle === 'yearly' ? 365 : 30;
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Update subscription status
    await subscriptionDoc.ref.update({
      status: 'active',
      purchaseToken,
      productId,
      activatedAt: now,
      expiresAt
    });

    // Update user plan
    await db.collection('users').doc(req.user.id).update({
      plan: subscription.planId,
      planExpiresAt: expiresAt,
      billingCycle: subscription.billingCycle,
      autoRenew: true,
      pendingSubscription: null,
      updatedAt: now
    });

    res.status(200).json({
      success: true,
      message: 'Pagamento verificado e assinatura ativada!',
      data: {
        plan: subscription.planId,
        expiresAt,
        billingCycle: subscription.billingCycle
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar pagamento',
      error: error.message
    });
  }
};

// @desc    Cancel subscription
// @route   POST /api/subscriptions/cancel
// @access  Private
export const cancelSubscription = async (req, res) => {
  try {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(req.user.id).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const user = userDoc.data();

    if (user.plan === 'free') {
      return res.status(400).json({
        success: false,
        message: 'Você não possui uma assinatura ativa'
      });
    }

    // Cancel auto-renewal but keep access until expiration
    await userDoc.ref.update({
      autoRenew: false,
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Assinatura cancelada. Você ainda terá acesso até o fim do período atual.',
      data: {
        accessUntil: user.planExpiresAt?.toDate()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao cancelar assinatura',
      error: error.message
    });
  }
};
