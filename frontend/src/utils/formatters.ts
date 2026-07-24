// Data Formatting Utilities

/**
 * Format a number as currency
 * @param amount - Number to format
 * @param currency - Currency code (default: 'INR')
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = 'INR'): string => {
    if (typeof amount !== 'number') return '₹0.00';

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
    }).format(amount);
};

/**
 * Format a number with thousand separators
 * @param num - Number to format
 * @returns Formatted number string
 */
export const formatNumber = (num: number): string => {
    if (typeof num !== 'number') return '0';
    return new Intl.NumberFormat('en-IN').format(num);
};

/**
 * Format a percentage
 * @param value - Number to format as percentage
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
    if (typeof value !== 'number') return '0%';
    return `${value.toFixed(decimals)}%`;
};

/**
 * Truncate text to a specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
};

/**
 * Capitalize the first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export const capitalizeFirst = (str: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Capitalize the first letter of each word
 * @param str - String to capitalize
 * @returns Title case string
 */
export const toTitleCase = (str: string): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Format a full name from first and last name
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Full name
 */
export const formatFullName = (firstName: string, lastName: string): string => {
    return `${firstName || ''} ${lastName || ''}`.trim();
};

/**
 * Get initials from a name
 * @param name - Full name
 * @returns Initials
 */
export const getInitials = (name: string): string => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Format phone number
 * @param phone - Phone number
 * @returns Formatted phone number
 */
export const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
    }
    return phone;
};

/**
 * Format employee ID with padding
 * @param id - Employee ID number
 * @param prefix - Prefix (default: 'EMP')
 * @param padding - Number of digits (default: 4)
 * @returns Formatted employee ID
 */
export const formatEmployeeId = (id: number, prefix: string = 'EMP', padding: number = 4): string => {
    return `${prefix}${id.toString().padStart(padding, '0')}`;
};

/**
 * Format work hours
 * @param hours - Number of hours
 * @returns Formatted hours string
 */
export const formatWorkHours = (hours: number): string => {
    if (typeof hours !== 'number') return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
};

/**
 * Get status badge color
 * @param status - Status string
 * @returns CSS color class or color code
 */
export const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();

    const colorMap: { [key: string]: string } = {
        'active': '#10b981',
        'present': '#10b981',
        'approved': '#10b981',
        'inactive': '#6b7280',
        'absent': '#ef4444',
        'rejected': '#ef4444',
        'pending': '#f59e0b',
        'on leave': '#3b82f6',
        'late': '#f59e0b',
        'half day': '#f59e0b',
        'holiday': '#8b5cf6',
        'weekend': '#6b7280',
        'cancelled': '#6b7280',
    };

    return colorMap[statusLower] || '#6b7280';
};

/**
 * Parse CSV data
 * @param csvText - CSV text content
 * @returns Array of objects
 */
export const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const obj: any = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });
        data.push(obj);
    }

    return data;
};

/**
 * Download data as JSON file
 * @param data - Data to download
 * @param filename - File name
 */
export const downloadJSON = (data: any, filename: string): void => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Download data as CSV file
 * @param data - Array of objects
 * @param filename - File name
 */
export const downloadCSV = (data: any[], filename: string): void => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => row[header] || '').join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Safely parses ISO date/time string from backend into a JavaScript Date object,
 * handling UTC vs local timezone offsets correctly.
 */
export const parseISOToLocalDate = (isoStr: any): Date => {
    if (!isoStr || isoStr === 'null' || isoStr === 'undefined' || isoStr === '—' || isoStr === 'N/A') return new Date(NaN);
    if (isoStr instanceof Date) return isoStr;
    if (typeof isoStr === 'number') return new Date(isoStr);

    let str = String(isoStr).trim();
    if (!str || str === 'null' || str === 'undefined' || str === '—' || str === 'N/A') return new Date(NaN);

    // If string is pure time like "17:25:00" or "05:29:00"
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(str)) {
        const parts = str.split(':');
        const d = new Date();
        d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), parts[2] ? parseInt(parts[2], 10) : 0, 0);
        return d;
    }

    // Handle space formatted dates e.g. "2026-07-23 06:00:00"
    if (str.includes(' ') && !str.includes('T')) {
        str = str.replace(' ', 'T');
    }

    // If ISO string has no timezone offset, it's a naive LOCAL time from the server (datetime.now() = IST).
    // Parse components directly to avoid browser interpreting it as UTC.
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (isoMatch && !str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
        const y = parseInt(isoMatch[1], 10);
        const m = parseInt(isoMatch[2], 10) - 1;
        const day = parseInt(isoMatch[3], 10);
        const hr = parseInt(isoMatch[4], 10);
        const min = parseInt(isoMatch[5], 10);
        const sec = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
        return new Date(y, m, day, hr, min, sec);
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d;
    }

    const fallback = new Date(isoStr as string);
    return isNaN(fallback.getTime()) ? new Date(NaN) : fallback;
};

/**
 * Returns the persistent daily login timestamp (stored in localStorage/sessionStorage),
 * ensuring browser refreshes retain the original login anchor date for today.
 */
export const getOrSetDailyLoginTime = (sessionStartTime?: string): string => {
    const todayStr = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem("login_time") || sessionStorage.getItem("login_time");

    if (stored) {
        const storedDateStr = stored.split('T')[0];
        if (storedDateStr === todayStr) {
            return stored;
        }
    }

    let candidate = sessionStartTime || new Date().toISOString();
    const candidateDateStr = candidate.split('T')[0];
    if (candidateDateStr !== todayStr) {
        candidate = new Date().toISOString();
    }

    localStorage.setItem("login_time", candidate);
    sessionStorage.setItem("login_time", candidate);
    return candidate;
};

/**
 * Formats an ISO datetime string or time string into 12-hour local time (e.g., "11:00 AM")
 */
export const formatLocalTime = (isoStr: string | null | undefined): string => {
    if (!isoStr || isoStr === '—' || isoStr === 'N/A' || isoStr === 'null' || isoStr === 'undefined') return '—';
    const str = String(isoStr).trim();
    // Return dash for date-only strings (e.g. "2026-07-24") to avoid false 12:00 AM midnight rendering
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return '—';
    }
    try {
        const d = parseISOToLocalDate(str);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
        return '—';
    }
};
