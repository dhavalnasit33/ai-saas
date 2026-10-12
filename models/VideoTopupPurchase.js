const mongoose = require("mongoose");

const videoTopupPurchaseSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      default: 10.0,
      required: true,
    },
    currency: {
      type: String,
      default: "USD",
    },
    credits_added: {
      type: Number,
      default: 600,
      required: true,
    },
    stripe_session_id: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    stripe_payment_intent_id: {
      type: String,
      sparse: true,
      index: true,
    },
    stripe_price_id: {
      type: String,
      default: process.env.STRIPE_VIDEO_TOPUP_PRICE_ID || "price_1UNoMsAasrkJ38UQdVn5oG1A",
    },
    stripe_product_id: {
      type: String,
      default: process.env.STRIPE_VIDEO_TOPUP_PRODUCT_ID || "prod_VObaXBiP6ty2fq",
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },
    payment_method: {
      type: String,
      default: "stripe",
    },
    credits_processed: {
      type: Boolean,
      default: false, // Prevents duplicate webhook credit additions
    },
    refund_details: {
      refund_id: String,
      refunded_at: Date,
      amount_refunded: Number,
      credits_deducted: Number,
      admin_review_required: Boolean,
      notes: String,
    },
    gateway_response: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("VideoTopupPurchase", videoTopupPurchaseSchema);
