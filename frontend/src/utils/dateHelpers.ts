export const calculateExperience = (date: string) => {
    if (!date || date === "—") return "—";
    const start = new Date(date);
    if (isNaN(start.getTime())) return "—";
    const now = new Date();

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();

    if (days < 0) {
        months--;
        const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += lastMonth.getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (months > 0) parts.push(`${months}m`);
    if (parts.length === 0 || (years === 0 && months === 0)) parts.push(`${days}d`);

    return parts.join(' ');
};

export const formatLongExperience = (date: string) => {
    if (!date || date === "—") return "—";
    const start = new Date(date);
    if (isNaN(start.getTime())) return "—";
    const now = new Date();

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();

    if (days < 0) {
        months--;
        const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += lastMonth.getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} Year${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} Month${months > 1 ? 's' : ''}`);
    if (parts.length === 0 || (years === 0 && months === 0)) parts.push(`${days} Day${days !== 1 ? 's' : ''}`);

    return parts.join(', ');
};
