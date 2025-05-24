
/**
 * Convert ms to "HH:MM"
 * @param ms {number}
 * @returns {string}
 */
function time_format_from_ms(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const seconds = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Get the week number from a date
 * @param in_date {Date | number}
 * @returns {number}
 */
function get_week_number(in_date) {
    const date = new Date(in_date);
    // Set to Thursday of the current week
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));

    // January 4th is always in week 1 (ISO rule)
    const firstThursday = new Date(date.getFullYear(), 0, 4);
    firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));

    return 1 + Math.round(
        ((date - firstThursday) / 86400000 - 3) / 7
    );
}

export {time_format_from_ms, get_week_number}