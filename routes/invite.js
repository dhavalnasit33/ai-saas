const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Invite = require("../models/Invite");
const User = require("../models/User");
const { sendTemplateEmail } = require("../utils/sendgridService");
const { protect } = require("../middleware/auth");

// ========================
// 1️⃣ Send Invites
// ========================
router.post("/", protect, async (req, res) => {
  try {
    const { inviteeEmails } = req.body;
    const inviter = req.user;

    if (!Array.isArray(inviteeEmails) || inviteeEmails.length === 0) {
      return res.status(400).json({ message: "Invite emails required" });
    }

    if (inviteeEmails.length > 5) {
      return res.status(400).json({ message: "Max 5 invites allowed" });
    }

    const emailPromises = inviteeEmails.map(async (email) => {
      const inviteToken = crypto.randomBytes(32).toString("hex");
      const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;
      console.log("inviteLink", inviteLink);

      // Optional: set expiration 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invite = await Invite.create({
        inviter: inviter._id,
        inviteeEmail: email,
        inviteToken,
        status: "pending",
        expiresAt,
      });

      return sendTemplateEmail({
        to: email,
        subject: `${inviter.name} invited you to OneChat AI`,
        templateName: "teamInvite",
         fromName: `${inviter.name} (via OneChat AI)`,
        variables: {
          inviterName: inviter.name,
          inviteLink,
        },
      });
    });

    await Promise.all(emailPromises);

    res.json({ success: true, message: "Invitations sent" });
  } catch (error) {
    console.error("❌ Invite error:", error.message);
    res.status(500).json({ success: false, message: "Invite failed" });
  }
});

router.post("/validate", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        valid: false,
        message: "Invite token is required",
      });
    }

    const invite = await Invite.findOne({ inviteToken: token });

    if (!invite) {
      return res.json({
        valid: false,
        reason: "invalid",
        message: "Invalid invite link",
      });
    }

    if (invite.status === "accepted") {
      return res.json({
        valid: false,
        reason: "accepted",
        message: "Invite already accepted",
      });
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      invite.status = "expired";
      await invite.save();

      return res.json({
        valid: false,
        reason: "expired",
        message: "Invite has expired",
      });
    }

    // Check if user already exists
    const userExists = await User.exists({
      email: invite.inviteeEmail,
    });

    return res.json({
      valid: true,
      inviteId: invite._id,
      email: invite.inviteeEmail,
      userExists: !!userExists,
      status: invite.status,
    });
  } catch (error) {
    console.error("❌ Validate invite error:", error);
    res.status(500).json({
      valid: false,
      message: "Failed to validate invite",
    });
  }
});

router.post("/accept", protect, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({  success: false,message: "Invite token is required" });
    }

    const invite = await Invite.findOne({ inviteToken: token });

    if (!invite) {
      return res.status(400).json({ success: false, message: "Invalid invite token" });
    }

    if (invite.status === "accepted") {
      return res.status(400).json({ success: false, message: "Invite already accepted" });
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      invite.status = "expired";
      await invite.save();
      return res.status(400).json({ success: false, message: "Invite has expired" });
    }

    // ✅ Logged-in user from protect middleware
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // ✅ Email match check (VERY IMPORTANT)
    if (user.email !== invite.inviteeEmail) {
      return res.status(403).json({
         success: false,
        message: "This invite does not belong to your account",
      });
    }

    invite.accepted = true;
    invite.acceptedAt = new Date();
    invite.acceptedBy = user._id;
    invite.status = "accepted";

    await invite.save();

    res.json({
      success: true,
      message: "Invite accepted successfully",
    });
  } catch (error) {
    console.error("❌ Accept invite error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept invite",
    });
  }
});

// ========================
// 3️⃣ List Invites (Dashboard)
// ========================
router.get("/", protect, async (req, res) => {
  try {
    const invites = await Invite.find({ inviter: req.user._id })
      .sort({ createdAt: -1 })
      .populate("acceptedBy", "name email"); // optional: show who accepted

    res.status(200).json({ success: true, invites });
  } catch (error) {
    console.error("❌ List invites error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch invites" });
  }
});

// ========================
// 4️⃣ Resend Invite
// ========================
router.post("/resend/:id", protect, async (req, res) => {
  try {
    const invite = await Invite.findById(req.params.id);

    if (!invite) return res.status(404).json({ message: "Invite not found" });
    if (invite.inviter.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to resend this invite" });
    }

    if (invite.status === "accepted")
      return res.status(400).json({ message: "Invite already accepted" });

    invite.resendCount = (invite.resendCount || 0) + 1;
    await invite.save();

    const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${invite.inviteToken}`;

    await sendTemplateEmail({
      to: invite.inviteeEmail,
      subject: `${req.user.name} invited you to OneChat AI`,
      templateName: "teamInvite",
      variables: {
        inviterName: req.user.name,
        inviteLink,
      },
    });

    res.status(200).json({ success: true, message: "Invite email resent" });
  } catch (error) {
    console.error("❌ Resend invite error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to resend invite" });
  }
});

// ========================
// 5️⃣ Delete/Cancel Invite
// ========================
router.delete("/:id", protect, async (req, res) => {
  try {
    const invite = await Invite.findById(req.params.id);

    if (!invite) return res.status(404).json({ message: "Invite not found" });
    if (invite.inviter.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this invite" });
    }

    await invite.remove();

    res.status(200).json({ success: true, message: "Invite canceled" });
  } catch (error) {
    console.error("❌ Delete invite error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to cancel invite" });
  }
});

module.exports = router;
