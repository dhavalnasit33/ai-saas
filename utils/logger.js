const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      pid: process.pid
    }) + '\n';
  }

  writeToFile(filename, content) {
    const filePath = path.join(this.logDir, filename);
    fs.appendFileSync(filePath, content);
  }

  info(message, meta = {}) {
    const logMessage = this.formatMessage('info', message, meta);
    console.log(`ℹ️  ${message}`, meta);
    this.writeToFile('app.log', logMessage);
  }

  error(message, error = null, meta = {}) {
    const errorMeta = {
      ...meta,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      })
    };
    
    const logMessage = this.formatMessage('error', message, errorMeta);
    console.error(`❌ ${message}`, errorMeta);
    this.writeToFile('error.log', logMessage);
  }

  warn(message, meta = {}) {
    const logMessage = this.formatMessage('warn', message, meta);
    console.warn(`⚠️  ${message}`, meta);
    this.writeToFile('app.log', logMessage);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = this.formatMessage('debug', message, meta);
      console.debug(`🐛 ${message}`, meta);
      this.writeToFile('debug.log', logMessage);
    }
  }

  // Log API requests
  logRequest(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.id || 'anonymous'
    };

    this.info('API Request', logData);
  }

  // Log payment events
  logPayment(event, paymentData, userId = null) {
    const logData = {
      event,
      paymentData,
      userId
    };

    this.info(`Payment Event: ${event}`, logData);
    this.writeToFile('payments.log', this.formatMessage('payment', event, logData));
  }

  // Log AI usage
  logAIUsage(userId, toolId, provider, tokensUsed, success, responseTime) {
    const logData = {
      userId,
      toolId,
      provider,
      tokensUsed,
      success,
      responseTime
    };

    this.info('AI Usage', logData);
    this.writeToFile('ai-usage.log', this.formatMessage('ai-usage', 'AI tool used', logData));
  }

  // Log security events
  logSecurity(event, details, req = null) {
    const logData = {
      event,
      details,
      ip: req?.ip,
      userAgent: req?.get('User-Agent'),
      userId: req?.user?.id
    };

    this.warn(`Security Event: ${event}`, logData);
    this.writeToFile('security.log', this.formatMessage('security', event, logData));
  }
}

module.exports = new Logger();