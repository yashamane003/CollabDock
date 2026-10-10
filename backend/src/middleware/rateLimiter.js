const rateLimit = require('express-rate-limit');

// Strict Rate Limiter for Authentication endpoints (5 requests per 5 minutes)
const authRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes window
    max: 5, // Limit each IP to 5 requests per windowMs
    standardHeaders: true, // Return standard rate limit headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    statusCode: 429,
    message: {
        status: 429,
        error: 'Too Many Requests',
        message: 'Too many authentication attempts from this IP. Please try again after 5 minutes.',
    },
    // Handler for customized 429 response
    handler: (req, res, next, options) => {
        const retryAfterMinutes = Math.ceil(options.windowMs / 60000);
        res.status(options.statusCode).json({
            status: 429,
            error: 'Too Many Requests',
            message: `Too many authentication attempts. For security reasons, please wait ${retryAfterMinutes} minutes before trying again.`,
            retryAfter: `${retryAfterMinutes} minutes`,
        });
    },
});

// General API Rate Limiter (e.g. 100 requests per 15 minutes to prevent DoS scraping)
const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        error: 'Too Many Requests',
        message: 'Too many requests from this IP, please try again later.',
    },
});

module.exports = {
    authRateLimiter,
    apiRateLimiter,
};
