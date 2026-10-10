// Security Sanitizer Middleware for Defense Against Cyber Attacks

// 1. Sanitize against NoSQL injection
// Replaces objects or keys containing '$' or '.' which could be exploited in mongo queries
const sanitizeNoSql = (req, res, next) => {
    const cleanObject = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        for (const key of Object.keys(obj)) {
            if (key.startsWith('$') || key.includes('.')) {
                delete obj[key];
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                cleanObject(obj[key]);
            }
        }
        return obj;
    };

    if (req.body) cleanObject(req.body);
    if (req.params) cleanObject(req.params);
    // clean query parameters
    if (req.query) {
        for (const key of Object.keys(req.query)) {
            if (typeof req.query[key] === 'object' && req.query[key] !== null) {
                delete req.query[key]; // Reject object queries like ?search[$gt]=
            }
        }
    }

    next();
};

// 2. HTML Entity Escaping to Prevent Stored XSS in text fields
const escapeHtml = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// 3. Strict Input Type Validation for Auth payloads
const validateAuthInput = (req, res, next) => {
    const { email, password, name } = req.body;

    if (email !== undefined && (typeof email !== 'string' || email.length > 255)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }

    if (password !== undefined && (typeof password !== 'string' || password.length > 255)) {
        return res.status(400).json({ message: 'Invalid password format' });
    }

    if (name !== undefined && (typeof name !== 'string' || name.length > 100)) {
        return res.status(400).json({ message: 'Invalid name format' });
    }

    next();
};

module.exports = {
    sanitizeNoSql,
    escapeHtml,
    validateAuthInput,
};
