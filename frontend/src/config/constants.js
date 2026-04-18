export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api';
export const STORAGE_KEY = 'apps-soal-auth-token';

export const NAV_ITEMS = [
    { key: 'dashboard', label: 'Ikhtisar', permission: 'dashboard.view' },
    { key: 'subjects', label: 'Subject', permission: 'subjects.view' },
    { key: 'chapters', label: 'Bab & Sub Bab', permission: 'chapters.view' },
    { key: 'questions', label: 'Bank Soal', permission: 'questions.view' },
    { key: 'packages', label: 'Generator Soal', permission: 'packages.view' },
    { key: 'users', label: 'Hak Akses User', permission: 'users.view' },
    { key: 'roles', label: 'Role Permission', permission: 'roles.view' },
];

export const QUESTION_TYPES = [
    { value: 'multiple_choice', label: 'Pilihan Ganda' },
    { value: 'essay', label: 'Essay' },
];

export const COMPOSITION_TYPES = [
    { value: 'quantity', label: 'Jumlah Soal' },
    { value: 'percentage', label: 'Persentase dari Total Soal' },
];

export const DIFFICULTY_LEVELS = [
    { value: 'mudah', label: 'Mudah' },
    { value: 'sedang', label: 'Sedang' },
    { value: 'sulit', label: 'Sulit' },
];

export const EMPTY_META = {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
};

export const QUESTION_IMAGE_UPLOAD = {
    maxMb: 2,
    processor: {
        resize_mode: 'fit', //crop, fit, or fill
        aspect_ratio: '16/9',
        max_width: 1400,
        max_height: 1400,
        quality: 82,
        target_size_kb: 1800,
        output_format: 'jpeg',
    },
};
