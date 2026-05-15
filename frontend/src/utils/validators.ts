// Form Validation Utilities

/**
 * Validate email address
 * @param email - Email to validate
 * @returns True if valid
 */
export const isValidEmail = (email: string): boolean => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate phone number (Indian format)
 * @param phone - Phone number to validate
 * @returns True if valid
 */
export const isValidPhone = (phone: string): boolean => {
    if (!phone) return false;
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleaned = phone.replace(/\D/g, '');
    return phoneRegex.test(cleaned);
};

/**
 * Validate PAN number (Indian)
 * @param pan - PAN number to validate
 * @returns True if valid
 */
export const isValidPAN = (pan: string): boolean => {
    if (!pan) return false;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
};

/**
 * Validate Aadhar number (Indian)
 * @param aadhar - Aadhar number to validate
 * @returns True if valid
 */
export const isValidAadhar = (aadhar: string): boolean => {
    if (!aadhar) return false;
    const cleaned = aadhar.replace(/\D/g, '');
    return cleaned.length === 12;
};

/**
 * Validate IFSC code (Indian)
 * @param ifsc - IFSC code to validate
 * @returns True if valid
 */
export const isValidIFSC = (ifsc: string): boolean => {
    if (!ifsc) return false;
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc.toUpperCase());
};

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with validation result and message
 */
export const validatePassword = (password: string): { isValid: boolean; message: string } => {
    if (!password) {
        return { isValid: false, message: 'Password is required' };
    }

    if (password.length < 8) {
        return { isValid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/[a-z]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/[0-9]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one number' };
    }

    if (!/[!@#$%^&*]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one special character (!@#$%^&*)' };
    }

    return { isValid: true, message: 'Password is strong' };
};

/**
 * Validate required field
 * @param value - Value to validate
 * @param fieldName - Field name for error message
 * @returns Error message or empty string
 */
export const validateRequired = (value: any, fieldName: string): string => {
    if (value === null || value === undefined || value === '') {
        return `${fieldName} is required`;
    }
    if (typeof value === 'string' && value.trim() === '') {
        return `${fieldName} is required`;
    }
    return '';
};

/**
 * Validate date range
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Error message or empty string
 */
export const validateDateRange = (startDate: string, endDate: string): string => {
    if (!startDate || !endDate) {
        return 'Both start and end dates are required';
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 'Invalid date format';
    }

    if (start > end) {
        return 'Start date must be before end date';
    }

    return '';
};

/**
 * Validate number range
 * @param value - Number to validate
 * @param min - Minimum value
 * @param max - Maximum value
 * @param fieldName - Field name for error message
 * @returns Error message or empty string
 */
export const validateNumberRange = (
    value: number,
    min: number,
    max: number,
    fieldName: string
): string => {
    if (typeof value !== 'number' || isNaN(value)) {
        return `${fieldName} must be a valid number`;
    }

    if (value < min || value > max) {
        return `${fieldName} must be between ${min} and ${max}`;
    }

    return '';
};

/**
 * Validate file size
 * @param file - File to validate
 * @param maxSizeMB - Maximum size in MB
 * @returns Error message or empty string
 */
export const validateFileSize = (file: File, maxSizeMB: number = 5): string => {
    if (!file) {
        return 'No file selected';
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return `File size must be less than ${maxSizeMB}MB`;
    }

    return '';
};

/**
 * Validate file type
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns Error message or empty string
 */
export const validateFileType = (file: File, allowedTypes: string[]): string => {
    if (!file) {
        return 'No file selected';
    }

    if (!allowedTypes.includes(file.type)) {
        return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
    }

    return '';
};

/**
 * Validate form data
 * @param data - Form data object
 * @param rules - Validation rules object
 * @returns Object with field errors
 */
export const validateForm = (
    data: { [key: string]: any },
    rules: { [key: string]: (value: any) => string }
): { [key: string]: string } => {
    const errors: { [key: string]: string } = {};

    Object.keys(rules).forEach(field => {
        const error = rules[field](data[field]);
        if (error) {
            errors[field] = error;
        }
    });

    return errors;
};

/**
 * Check if form has errors
 * @param errors - Errors object
 * @returns True if there are errors
 */
export const hasFormErrors = (errors: { [key: string]: string }): boolean => {
    return Object.keys(errors).length > 0;
};
