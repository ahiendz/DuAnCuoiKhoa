// Gender utility functions for Vietnamese <-> English conversion

export const GENDER_MAP = {
    male: 'Nam',
    female: 'Nữ'
};

export const GENDER_MAP_REVERSE = {
    'Nam': 'male',
    'Nữ': 'female'
};

/**
 * Convert gender from English (DB format) to Vietnamese (UI display)
 * @param {string} gender - 'male' or 'female'
 * @returns {string} 'Nam' or 'Nữ'
 */
export const genderToVietnamese = (gender) => {
    return GENDER_MAP[gender] || gender || '—';
};

/**
 * Convert gender from Vietnamese to English (for DB storage)
 * @param {string} gender - 'Nam' or 'Nữ'
 * @returns {string} 'male' or 'female'
 */
export const genderToEnglish = (gender) => {
    return GENDER_MAP_REVERSE[gender] || gender;
};

/**
 * Gender options for dropdown (value in English, label in Vietnamese)
 */
export const GENDER_OPTIONS = [
    { value: '', label: 'Chọn' },
    { value: 'male', label: 'Nam' },
    { value: 'female', label: 'Nữ' }
];
