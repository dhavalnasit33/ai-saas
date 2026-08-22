const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paymentService = require('../utils/paymentService');

// IMPORTANT: raw body middleware MUST be used in the main app for this route
router.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    console.log('🔔 Incoming Stripe webhook...');

    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log('✅ Webhook verified:', event.type);

      // Call your payment handler
      await paymentService.handleStripeWebhook(event);

      res.status(200).json({ received: true });
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

module.exports = router;
