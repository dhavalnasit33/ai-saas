const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const Message = mongoose.model("Message", baseSchema);
module.exports = Message;
