const axios = require("axios");

const verifyCaptcha = async (captchaToken) => {
  if (!captchaToken) return false;

  try {
    const secretKey = process.env.GOOGLE_CAPTCHA_SECRET_KEY; // from .env
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;

    const response = await axios.post(url);
    return response.data.success; // true if human
  } catch (error) {
    console.error("CAPTCHA verification error:", error);
    return false;
  }
};

module.exports = { verifyCaptcha };
