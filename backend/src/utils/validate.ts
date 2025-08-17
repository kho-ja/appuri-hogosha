export function isValidEmail(email: string): boolean {
    // Prevent ReDoS by limiting email length and using simpler regex
    if (!email || email.length > 254) return false;

    // More secure email regex that prevents ReDoS
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

export function isValidPhoneNumber(phone_number: string): boolean {
    // Make phone number validation more secure
    if (!phone_number || phone_number.length > 20) return false;
    const phoneRegex = /^[0-9+\-\s()]+$/; // More restrictive but still functional
    return phone_number.length > 0 && phoneRegex.test(phone_number);
}

export function isValidString(name: string): boolean {
    return (
        typeof name === 'string' && name.trim().length > 0 && name.length <= 100
    ); // Prevent excessively long strings
}

export function isValidLongString(text: string): boolean {
    return (
        typeof text === 'string' &&
        text.trim().length > 0 &&
        text.length <= 5000
    );
}

export function isValidStudentNumber(student_number: string): boolean {
    return (
        typeof student_number === 'string' && student_number.trim().length > 0
    );
}

export function isValidId(id: string): boolean {
    if (!id || id.length > 10) return false; // Reasonable limit for ID length
    return parseInt(id) > 0 && /^[0-9]+$/.test(id);
}

export function isValidArrayId(ids: number[]): boolean {
    if (!Array.isArray(ids)) {
        return false;
    }
    return ids.every(id => Number.isInteger(id) && id > 0);
}

export function isValidStringArrayId(ids: string[]): boolean {
    if (!Array.isArray(ids)) {
        return false;
    }
    return ids.every(id => isValidId(id));
}

const priorityList = ['low', 'medium', 'high'];

export function isValidPriority(priority: string): boolean {
    return typeof priority === 'string' && priorityList.includes(priority);
}

export function isValidImage(mimetype: string): boolean {
    return mimetype.includes('image');
}

const permissionList = {};

export function isValidPermissions(permissions: any): boolean {
    return false;
}

const formStatusList = ['accept', 'reject', 'wait'];

export function isValidStatus(status: string): boolean {
    return typeof status === 'string' && formStatusList.includes(status);
}

const reasonList = ['other', 'absence', 'lateness', 'leaving early'];
export function isValidReason(reason: string): boolean {
    return typeof reason === 'string' && reasonList.includes(reason);
}

export function isValidDate(dateTime: string): boolean {
    const dateTimeRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateTimeRegex.test(dateTime);
}

// Add URL validation utility for SSRF protection
export function isValidUrl(url: string): boolean {
    try {
        const parsedUrl = new URL(url);
        // Only allow HTTP/HTTPS protocols
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return false;
        }
        // Block internal/private IP ranges
        const hostname = parsedUrl.hostname;
        if (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.startsWith('10.') ||
            hostname.startsWith('192.168.') ||
            (hostname.startsWith('172.') &&
                parseInt(hostname.split('.')[1]) >= 16 &&
                parseInt(hostname.split('.')[1]) <= 31) ||
            hostname.startsWith('169.254.') // AWS metadata
        ) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

// Kintone-specific URL validation with enhanced SSRF protection
export function isValidKintoneUrl(url: string): boolean {
    // Input sanitization - reject if null, undefined, or not string
    if (!url || typeof url !== 'string' || url.length === 0) {
        return false;
    }

    // Prevent excessively long URLs
    if (url.length > 2048) {
        return false;
    }

    // Normalize and trim the URL
    url = url.trim();

    try {
        const parsedUrl = new URL(url);

        // Only allow HTTPS for Kintone (security requirement)
        if (parsedUrl.protocol !== 'https:') {
            return false;
        }

        // Validate hostname is present and not empty
        if (!parsedUrl.hostname || parsedUrl.hostname.length === 0) {
            return false;
        }

        // Block any userinfo in URL (username:password@domain)
        if (parsedUrl.username || parsedUrl.password) {
            return false;
        }

        // Block non-standard ports (Kintone uses standard HTTPS port 443)
        if (
            parsedUrl.port &&
            parsedUrl.port !== '443' &&
            parsedUrl.port !== ''
        ) {
            return false;
        }

        // Validate Kintone domain patterns with strict matching
        const hostname = parsedUrl.hostname.toLowerCase();

        // Only allow official Kintone domains - no custom domains for security
        const validKintonePatterns = [
            /^[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?\.cybozu\.com$/,
            /^[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?\.kintone\.com$/,
            /^[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?\.cybozu-dev\.com$/,
        ];

        const isValidDomain = validKintonePatterns.some(pattern =>
            pattern.test(hostname)
        );

        if (!isValidDomain) {
            return false;
        }

        // Block internal/private IP addresses (additional layer)
        const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        const ipMatch = hostname.match(ipv4Regex);
        if (ipMatch) {
            const octets = ipMatch.slice(1, 5).map(Number);
            // Block private IP ranges
            if (
                octets[0] === 10 ||
                (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
                (octets[0] === 192 && octets[1] === 168) ||
                octets[0] === 127 || // Loopback
                (octets[0] === 169 && octets[1] === 254) // Link-local
            ) {
                return false;
            }
        }

        // Validate path structure - must be Kintone API endpoints
        const validPathPatterns = [
            /^\/k\/v1\/records\.json$/, // Get/Update records
            /^\/k\/v1\/record\.json$/, // Get specific record
            /^\/k\/v1\/preview\/app\/views\.json$/, // Get views (pre-live)
            /^\/k\/v1\/preview\/app\/form\/fields\.json$/, // Get form fields (pre-live)
            /^\/k\/guest\/\d+\/v1\/records\.json$/, // Guest space records
            /^\/k\/guest\/\d+\/v1\/record\.json$/, // Guest space specific record
        ];

        const isValidPath = validPathPatterns.some(pattern =>
            pattern.test(parsedUrl.pathname)
        );
        if (!isValidPath) {
            return false;
        }

        // Additional security: block any malicious patterns in the full URL
        const maliciousPatterns = [
            /javascript:/i,
            /data:/i,
            /vbscript:/i,
            /file:/i,
            /ftp:/i,
            /<script/i,
            /\.\./, // Path traversal
            /\0/, // Null bytes
            /%00/i, // URL encoded null bytes
            /%2e%2e/i, // URL encoded path traversal
        ];

        const fullUrl = url.toLowerCase();
        for (const pattern of maliciousPatterns) {
            if (pattern.test(fullUrl)) {
                return false;
            }
        }

        return true;
    } catch (error) {
        // Any parsing error should result in rejection
        return false;
    }
}
