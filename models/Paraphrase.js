const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const Paraphrase = mongoose.model("Paraphrase", baseSchema);
module.exports = Paraphrase;
