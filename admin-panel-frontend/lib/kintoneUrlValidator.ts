/**
 * Client-side Kintone URL validation for enhanced security and user experience
 * This provides immediate feedback to users and adds a layer of defense,
 * though the main security validation still happens on the server-side.
 */

export interface KintoneUrlValidationResult {
  isValid: boolean;
  errorKey?: string;
  error?: string;
}

/**
 * Validates a Kintone URL on the client-side to match server-side security requirements
 * @param url - The URL to validate
 * @returns Validation result with error key for translation
 */
export function validateKintoneUrl(url: string): KintoneUrlValidationResult {
  // Input sanitization - reject if null, undefined, or not string
  if (!url || typeof url !== "string" || url.length === 0) {
    return {
      isValid: false,
      errorKey: "kintone_url_required",
    };
  }

  // Prevent excessively long URLs
  if (url.length > 2048) {
    return {
      isValid: false,
      errorKey: "kintone_url_too_long",
    };
  }

  // Normalize and trim the URL
  url = url.trim();

  try {
    const parsedUrl = new URL(url);

    // Only allow HTTPS for Kintone (security requirement)
    if (parsedUrl.protocol !== "https:") {
      return {
        isValid: false,
        errorKey: "kintone_url_https_only",
      };
    }

    // Validate hostname is present and not empty
    if (!parsedUrl.hostname || parsedUrl.hostname.length === 0) {
      return {
        isValid: false,
        errorKey: "kintone_url_invalid_hostname",
      };
    }

    // Block any userinfo in URL (username:password@domain)
    if (parsedUrl.username || parsedUrl.password) {
      return {
        isValid: false,
        errorKey: "kintone_url_auth_not_allowed",
      };
    }

    // Block non-standard ports (Kintone uses standard HTTPS port 443)
    if (parsedUrl.port && parsedUrl.port !== "443" && parsedUrl.port !== "") {
      return {
        isValid: false,
        errorKey: "kintone_url_invalid_port",
      };
    }

    // Validate Kintone domain patterns with strict matching
    const hostname = parsedUrl.hostname.toLowerCase();

    // Only allow official Kintone domains - no custom domains for security
    const validKintonePatterns = [
      /^[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?\.cybozu\.com$/,
      /^[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?\.kintone\.com$/,
      /^[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?\.cybozu-dev\.com$/,
    ];

    const isValidDomain = validKintonePatterns.some((pattern) =>
      pattern.test(hostname)
    );

    if (!isValidDomain) {
      return {
        isValid: false,
        errorKey: "kintone_url_invalid_domain",
      };
    }

    // Block internal/private IP addresses (additional layer)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      return {
        isValid: false,
        errorKey: "kintone_url_ip_not_allowed",
      };
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

    const isValidPath = validPathPatterns.some((pattern) =>
      pattern.test(parsedUrl.pathname)
    );
    if (!isValidPath) {
      return {
        isValid: false,
        errorKey: "kintone_url_invalid_path",
      };
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
        return {
          isValid: false,
          errorKey: "kintone_url_malicious_content",
        };
      }
    }

    return {
      isValid: true,
    };
  } catch (error) {
    // Any parsing error should result in rejection
    return {
      isValid: false,
      errorKey: "kintone_url_invalid_format",
    };
  }
}

/**
 * Zod schema for Kintone URL validation with translation support
 */
export const kintoneUrlSchema = () => {
  return (url: string) => {
    const result = validateKintoneUrl(url);
    return result.isValid;
  };
};

/**
 * Get validation error message for Zod
 */
export const getKintoneUrlValidationError = (url: string): string => {
  const result = validateKintoneUrl(url);
  return result.errorKey || "invalid_kintone_url_provided";
};

/**
 * Get user-friendly suggestions for common Kintone URL patterns
 */
export function getKintoneUrlSuggestions(): string[] {
  return [
    "https://your-subdomain.kintone.com/k/v1/records.json",
    "https://your-subdomain.cybozu.com/k/v1/records.json",
    "https://your-subdomain.kintone.com/k/guest/123/v1/records.json",
    "https://your-subdomain.cybozu.com/k/v1/record.json",
  ];
}
