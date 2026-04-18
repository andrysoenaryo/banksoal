import { API_BASE_URL, EMPTY_META } from '../config/constants';

export function hasPermission(user, permission) {
    return Array.isArray(user?.permissions) && user.permissions.includes(permission);
}

export function flattenChapters(tree, level = 0, inheritedSubjectName = '') {
    return tree.flatMap((chapter) => [
        (() => {
            const subjectName = chapter.subject?.name ?? inheritedSubjectName;
            const chapterName = `${level > 0 ? `${'— '.repeat(level)}` : ''}${chapter.name}`;

            return {
                id: chapter.id,
                subject_id: chapter.subject_id ?? '',
                name: subjectName ? `${subjectName} - ${chapterName}` : chapterName,
            };
        })(),
        ...flattenChapters(chapter.children_recursive ?? [], level + 1, chapter.subject?.name ?? inheritedSubjectName),
    ]);
}

export function extractError(error) {
    if (error.response?.data?.message) {
        return error.response.data.message;
    }

    const messages = error.response?.data?.errors;

    if (messages) {
        const firstGroup = Object.values(messages)[0];

        if (Array.isArray(firstGroup) && firstGroup.length > 0) {
            return firstGroup[0];
        }
    }

    return error.message || 'Terjadi kesalahan yang tidak diketahui.';
}

export function formatDateTime(value) {
    if (!value) {
        return '-';
    }

    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

export function parsePaginated(response) {
    return {
        items: response.data?.data ?? [],
        meta: response.data?.meta ?? EMPTY_META,
    };
}

export function compactParams(params) {
    return Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
    );
}

export function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
}

export function resolveMediaUrl(url) {
    if (!url) {
        return null;
    }

    if (/^(https?:)?\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')) {
        return url;
    }

    const apiBase = API_BASE_URL.replace(/\/+$/, '');
    const apiOrigin = apiBase.replace(/\/api(?:\/.*)?$/i, '');

    return `${apiOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
}
