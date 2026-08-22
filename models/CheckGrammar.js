const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const CheckGrammar = mongoose.model("CheckGrammar", baseSchema);
module.exports = CheckGrammar;
