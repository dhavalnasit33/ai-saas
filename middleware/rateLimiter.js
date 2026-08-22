const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Login Route Limiter: Max 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    if (logger && typeof logger.logSecurity === 'function') {
      logger.logSecurity('Login rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
        body: req.body?.email ? { email: req.body.email } : {}
      }, req);
    }
    
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again after 15 minutes.'
    });
  }
});

// Signup Route Limiter: Max 3 attempts per 1 hour per IP
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many signup attempts, please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    if (logger && typeof logger.logSecurity === 'function') {
      logger.logSecurity('Signup rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
        body: req.body?.email ? { email: req.body.email } : {}
      }, req);
    }
    
    res.status(429).json({
      success: false,
      message: 'Too many signup attempts, please try again after an hour.'
    });
  }
});

// AI Generation Route Limiter: Max 20 requests per 1 minute based on user ID
const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: {
    success: false,
    message: 'Too many generation requests, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Crucially based on authenticated user's ID
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    if (logger && typeof logger.logSecurity === 'function') {
      logger.logSecurity('AI generation rate limit exceeded', {
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl
      }, req);
    }
    
    res.status(429).json({
      success: false,
      message: 'Too many generation requests, please slow down.'
    });
  }
});

// Publish Route Limiter: Max 10 publish requests per hour per user
const publishLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Too many publish requests. Please wait up to an hour before publishing again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Autosave Route Limiter: Max 60 autosave requests per minute per user
const autosaveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    success: false,
    message: 'Too many save requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// General Publishing API Limiter: Max 100 requests per 15 minutes per IP
const publishingApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many request attempts, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

module.exports = {
  loginLimiter,
  signupLimiter,
  aiGenerationLimiter,
  publishLimiter,
  autosaveLimiter,
  publishingApiLimiter
};