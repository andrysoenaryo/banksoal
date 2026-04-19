export function createOption(index) {
    return {
        option_key: String.fromCharCode(65 + index),
        option_text: '',
        is_correct: index === 0,
        sort_order: index,
    };
}

export const MULTIPLE_CHOICE_OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'];

export function createDefaultOptions() {
    return MULTIPLE_CHOICE_OPTION_KEYS.map((_, index) => createOption(index));
}

export function normalizeMultipleChoiceOptions(options = []) {
    const optionMap = new Map(
        options.map((option) => [String(option.option_key ?? '').toUpperCase(), option]),
    );

    return MULTIPLE_CHOICE_OPTION_KEYS.map((key, index) => {
        const existing = optionMap.get(key);

        return {
            option_key: key,
            option_text: existing?.option_text ?? '',
            is_correct: Boolean(existing?.is_correct),
            sort_order: existing?.sort_order ?? index,
        };
    });
}

export function createQuestionForm() {
    return {
        id: null,
        chapter_id: '',
        type: 'multiple_choice',
        question_text: '',
        question_image: null,
        question_image_url: null,
        question_image_meta: null,
        remove_question_image: false,
        answer_key: '',
        explanation: '',
        difficulty_level: 'sedang',
        points: 1,
        options: createDefaultOptions(),
    };
}

export function createPackageForm() {
    return {
        subject_id: '',
        title: '',
        description: '',
        total_questions: 10,
        rules: [
            {
                chapter_id: '',
                composition_type: 'quantity',
                composition_value: 10,
                type: '',
            },
        ],
    };
}

export function createChapterForm() {
    return {
        id: null,
        subject_id: '',
        parent_id: '',
        name: '',
        description: '',
        sort_order: 0,
        is_active: true,
    };
}

export function createSubjectForm() {
    return {
        id: null,
        name: '',
        description: '',
        sort_order: 0,
        is_active: true,
    };
}

export function createUserForm(defaultRole = '') {
    return {
        id: null,
        name: '',
        email: '',
        password: '',
        role: defaultRole,
        is_active: true,
    };
}

export function createRoleForm() {
    return {
        id: null,
        name: '',
        permissions: [],
        is_protected: false,
    };
}

export function createMenuForm() {
    return {
        id: null,
        key: '',
        parent_id: '',
        label: '',
        icon: '',
        permission: '',
        sort_order: 0,
        is_active: true,
    };
}
