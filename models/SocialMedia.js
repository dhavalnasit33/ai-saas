const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const SocialMedia = mongoose.model("SocialMedia", baseSchema);
module.exports = SocialMedia;
