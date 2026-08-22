const mongoose = require("mongoose");

const InviteSchema = new mongoose.Schema(
  {
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    inviteeEmail: { type: String, required: true },
    inviteToken: { type: String, required: true, unique: true },
    accepted: { type: Boolean, default: false },
    acceptedAt: { type: Date },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired"],
      default: "pending",
    },
    expiresAt: { type: Date },
    resendCount: { type: Number, default: 0 },
    acceptedFromEmail: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invite", InviteSchema);
