const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const BudgetCalculator = mongoose.model("BudgetCalculator", baseSchema);

module.exports = BudgetCalculator;
