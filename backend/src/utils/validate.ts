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
    typeof text === 'string' && text.trim().length > 0 && text.length <= 5000
  );
}

export function isValidStudentNumber(student_number: string): boolean {
  return typeof student_number === 'string' && student_number.trim().length > 0;
}

export function isValidId(id: string): boolean {
  if (!id || id.length > 10) return false; // Reasonable limit for ID length
  return parseInt(id) > 0 && /^[0-9]+$/.test(id);
}

export function isValidArrayId(ids: number[]): boolean {
  if (!Array.isArray(ids)) {
    return false;
  }
  return ids.every((id) => Number.isInteger(id) && id > 0);
}

export function isValidStringArrayId(ids: string[]): boolean {
  if (!Array.isArray(ids)) {
    return false;
  }
  return ids.every((id) => isValidId(id));
}

const priorityList = ['low', 'medium', 'high'];

export function isValidPriority(priority: string): boolean {
  return typeof priority === 'string' && priorityList.includes(priority);
}

export function isValidImage(mimetype: string): boolean {
  return mimetype.includes('image');
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

// Kintone-specific URL validation
export function isValidKintoneUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Only allow HTTPS for Kintone (security requirement)
    if (parsedUrl.protocol !== 'https:') {
      return false;
    }

    // Validate Kintone domain patterns
    const hostname = parsedUrl.hostname.toLowerCase();

    // Official Kintone domain patterns:
    // - subdomain.cybozu.com
    // - subdomain.kintone.com
    // - subdomain.cybozu-dev.com (for development)
    // - Custom domains with cybozu in path (some enterprise setups)
    const validKintonePatterns = [
      /^[a-zA-Z0-9\-]+\.cybozu\.com$/,
      /^[a-zA-Z0-9\-]+\.kintone\.com$/,
      /^[a-zA-Z0-9\-]+\.cybozu-dev\.com$/,
    ];

    const isValidDomain = validKintonePatterns.some((pattern) =>
      pattern.test(hostname)
    );

    if (!isValidDomain) {
      return false;
    }

    // Validate path structure - should contain /k/v1/ for API endpoints
    const validPathPattern = /^\/k\/v1\//;
    if (!validPathPattern.test(parsedUrl.pathname)) {
      return false;
    }

    // Additional security: block any obviously malicious patterns
    const maliciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /@/, // Userinfo in URL
    ];

    const fullUrl = url.toLowerCase();
    for (const pattern of maliciousPatterns) {
      if (pattern.test(fullUrl)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}
