const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const Email = mongoose.model("Email", baseSchema);
module.exports = Email;
