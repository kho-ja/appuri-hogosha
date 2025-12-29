export interface OperatorRouting {
    isUzbekistan: boolean;
    operator: string;
    usePlayMobile: boolean;
}

export const getUzbekistanOperatorRouting = (
    phoneNumber: string
): OperatorRouting => {
    if (!phoneNumber)
        return {
            isUzbekistan: false,
            operator: 'Unknown',
            usePlayMobile: false,
        };

    // Remove + if present for checking
    const cleanNumber = phoneNumber.startsWith('+')
        ? phoneNumber.substring(1)
        : phoneNumber;

    // Check if it's Uzbekistan (12 digits starting with 998)
    if (cleanNumber.length !== 12 || !cleanNumber.startsWith('998')) {
        return {
            isUzbekistan: false,
            operator: 'Unknown',
            usePlayMobile: false,
        };
    }

    // Operator detection - All Uzbekistan numbers use PlayMobile
    const operatorCode = cleanNumber.substring(3, 5);
    const operators: Record<string, string> = {
        '20': 'OQ',           // Beeline's digital brand
        '33': 'Humans',       // New MVNO
        '55': 'Ucell',
        '77': 'UzMobile',
        '88': 'Mobiuz',
        '90': 'Beeline',
        '91': 'Beeline',
        '93': 'Ucell',
        '94': 'Ucell',
        '95': 'UMS',
        '97': 'Mobiuz',
        '98': 'Mobiuz',
        '99': 'Beeline',
    };

    const operatorName = operators[operatorCode];
    if (operatorName) {
        return {
            isUzbekistan: true,
            operator: operatorName,
            usePlayMobile: true, // All Uzbekistan operators use PlayMobile
        };
    }

    return { isUzbekistan: true, operator: 'Unknown', usePlayMobile: true };
};

export const isUzbekistanNumber = (phoneNumber: string): boolean => {
    const routing = getUzbekistanOperatorRouting(phoneNumber);
    return routing.isUzbekistan;
};

export interface SmsCharacterCheck {
    withinLimit: boolean;
    encoding: string;
    parts: number;
    cost: string;
}

export const checkSmsCharacterLimit = (message: string): SmsCharacterCheck => {
    // Check if message contains non-GSM characters (will use Unicode encoding)
    const nonGsmChars = /[''""—`^{}\\[~\]|€]/;
    const hasUnicode = /[^\x00-\x7F]/.test(message); // Contains non-ASCII characters

    let encoding: string;
    let singleSmsLimit: number;
    let twoSmsLimit: number;
    let threeSmsLimit: number;

    if (hasUnicode || nonGsmChars.test(message)) {
        // Unicode encoding (Cyrillic, extended characters)
        encoding = 'Unicode';
        singleSmsLimit = 70;
        twoSmsLimit = 134;
        threeSmsLimit = 201;
    } else {
        // GSM encoding (Latin, 7-bit)
        encoding = 'GSM-7';
        singleSmsLimit = 160;
        twoSmsLimit = 306;
        threeSmsLimit = 459;
    }

    const length = message.length;
    let parts: number;
    let cost: string;

    if (length <= singleSmsLimit) {
        parts = 1;
        cost = '1 SMS';
    } else if (length <= twoSmsLimit) {
        parts = 2;
        cost = '2 SMS (Double cost!)';
    } else if (length <= threeSmsLimit) {
        parts = 3;
        cost = '3 SMS (Triple cost!)';
    } else {
        parts = Math.ceil(length / (encoding === 'Unicode' ? 67 : 153)); // Multipart limits
        cost = `${parts} SMS (${parts}x cost!)`;
    }

    return {
        withinLimit: parts === 1,
        encoding,
        parts,
        cost,
    };
};
