const  mongoose = require('mongoose');
const baseSchema = require('./commonSchema');

const JobProtection = new mongoose.model('AiJobProtectionPlan', baseSchema);
module.exports = JobProtection;