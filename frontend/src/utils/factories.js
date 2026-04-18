export function createOption(index) {
    return {
        option_key: String.fromCharCode(65 + index),
        option_text: '',
        is_correct: index === 0,
        sort_order: index,
    };
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
        options: [createOption(0), createOption(1), createOption(2), createOption(3)],
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
