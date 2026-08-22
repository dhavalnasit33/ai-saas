const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    billing_period: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    currency: {
      type: String,
      required: true,
      enum: ["USD", "INR", "EUR"],
      default: "USD",
    },
    transaction_id: {
      type: String,
      sparse: true,
    },
    payment_method: {
      type: String,
      enum: ["stripe", "razorpay"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "success",
        "failed",
        "refunded",
        "cancelled",
        "cancelling",
      ],
      default: "pending",
    },
    cancellation_reason: {
      type: String,
      default: null,
    },
    cancellation_feedback: {
      type: String,
      default: null,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    gateway_response: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    session_id: String,
    start_date: { type: Date, default: Date.now },
    end_date: { type: Date },
    refund_id: String,
    refund_amount: Number,
    invoice_url: String,
    receipt_url: String,
    payment_option: {
      type: String,
      enum: ["pay_now", "try_free"],
      default: "try_free",
    },
  },
  {
    timestamps: true,
  },
);

// Automatically set end_date based on billing_period
paymentSchema.pre("save", function (next) {
  if (!this.start_date) {
    this.start_date = new Date();
  }

  if (!this.end_date) {
    const end = new Date(this.start_date);
    if (this.billing_period === "monthly") {
      end.setMonth(end.getMonth() + 1);
    } else if (this.billing_period === "yearly") {
      end.setFullYear(end.getFullYear() + 1);
    }
    this.end_date = end;
  }

  next();
});

// Virtual field to check if subscription expired
paymentSchema.virtual("is_expired").get(function () {
  if (!this.end_date) return false;
  return new Date() > this.end_date;
});

// Ensure virtuals are included in JSON output
paymentSchema.set("toJSON", { virtuals: true });
paymentSchema.set("toObject", { virtuals: true });

// Index for efficient queries
paymentSchema.index({ user_id: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
