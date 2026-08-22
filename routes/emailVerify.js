const express = require("express");
const { validate } = require("deep-email-validator");
const { protect } = require("../middleware/auth"); // Assuming you want this protected
const router = express.Router();

// @desc Verify a single email address
// @route POST /api/email-verify
// @access Private (Protected by Token)
router.post("/", protect, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email address to verify",
      });
    }

    // Run the deep validation checks
    const result = await validate({
      email,
      validateSMTP: false, // 🚫 no mailbox probing
      validateTypo: false,
      validateRegex: true,
      validateDisposable: true,
      validateMx: true,
    });

    // Check if validation passed or failed
    if (result.valid) {
      return res.status(200).json({
        success: true,
        message: "Email is valid",
        data: {
          email: email,
          isValid: true,
          details: result.validators,
        },
      });
    } else {
      return res.status(200).json({
        // 200 OK because the *check* succeeded, even if email is bad
        success: true,
        message: "Email found to be invalid",
        data: {
          email: email,
          isValid: false,
          reason: result.reason,
          details: result.validators,
        },
      });
    }
  } catch (error) {
    console.error("Email verification error: ", error);
    res.status(500).json({
      success: false,
      message: "Server Error during verification",
    });
  }
});

module.exports = router;
