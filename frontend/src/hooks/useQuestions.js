import { useEffect, useMemo, useRef, useState } from 'react';
import { EMPTY_META, QUESTION_IMAGE_UPLOAD } from '../config/constants';
import { createQuestionForm } from '../utils/factories';
import { compactParams, downloadBlob, flattenChapters, parsePaginated } from '../utils/helpers';
import { processQuestionImage } from '../utils/imageProcessor';

const MAX_QUESTION_IMAGE_SIZE = QUESTION_IMAGE_UPLOAD.maxMb * 1024 * 1024;
const ALLOWED_IMPORT_EXTENSIONS = ['xlsx', 'xls', 'docx'];

export default function useQuestions({ client, onStatus, onError }) {
    const [chapters, setChapters] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [meta, setMeta] = useState(EMPTY_META);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [filters, setFilters] = useState({ search: '', chapter_id: '', type: '', difficulty_level: '' });
    const [sort, setSort] = useState({ sortBy: '', sortDir: 'desc' });
    const [form, setForm] = useState(createQuestionForm());
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [docxPreview, setDocxPreview] = useState(null);
    const [previewingDocx, setPreviewingDocx] = useState(false);
    const [processingImage, setProcessingImage] = useState(false);
    const [loading, setLoading] = useState(false);
    const previousImageUrlRef = useRef(null);

    const flatChapters = useMemo(() => flattenChapters(chapters), [chapters]);

    async function loadChapters() {
        const response = await client.get('/chapters', { params: { tree: 1 } });
        setChapters(response.data);
    }

    async function loadQuestions(targetPage = page, targetPerPage = perPage, targetFilters = filters, targetSort = sort) {
        setLoading(true);
        try {
            const response = await client.get('/questions', {
                params: compactParams({
                    page: targetPage,
                    per_page: targetPerPage,
                    search: targetFilters.search,
                    chapter_id: targetFilters.chapter_id,
                    type: targetFilters.type,
                    difficulty_level: targetFilters.difficulty_level,
                    sort_by: targetSort.sortBy,
                    sort_direction: targetSort.sortDir,
                }),
            });

            const paginated = parsePaginated(response);
            setQuestions(paginated.items);
            setMeta(paginated.meta);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadChapters().catch(onError);
    }, [client, onError]);

    useEffect(() => {
        loadQuestions(page, perPage, filters, sort).catch(onError);
    }, [client, page, perPage, filters, sort, onError]);

    useEffect(() => {
        const previousUrl = previousImageUrlRef.current;

        if (previousUrl && previousUrl !== form.question_image_url && previousUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previousUrl);
        }

        previousImageUrlRef.current = form.question_image_url;
    }, [form.question_image_url]);

    useEffect(() => () => {
        const currentUrl = previousImageUrlRef.current;

        if (currentUrl && currentUrl.startsWith('blob:')) {
            URL.revokeObjectURL(currentUrl);
        }
    }, []);

    function revokeObjectUrl(url) {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    }

    function resetQuestionForm() {
        revokeObjectUrl(form.question_image_url);
        setForm(createQuestionForm());
    }

    async function setQuestionImage(file) {
        if (!file) {
            return;
        }

        setProcessingImage(true);

        try {
            const processed = await processQuestionImage(file, QUESTION_IMAGE_UPLOAD.processor);

            if (processed.file.size > MAX_QUESTION_IMAGE_SIZE) {
                onStatus({ type: 'error', message: `Gambar masih melebihi ${QUESTION_IMAGE_UPLOAD.maxMb}MB.` });
                return;
            }

            setForm((current) => {
                revokeObjectUrl(current.question_image_url);

                return {
                    ...current,
                    question_image: processed.file,
                    question_image_url: URL.createObjectURL(processed.file),
                    question_image_meta: processed.meta,
                    remove_question_image: false,
                };
            });

            onStatus({
                type: 'success',
                message: `Gambar diproses otomatis (${Math.round(processed.meta.processedSize / 1024)}KB).`,
            });
        } catch (error) {
            onError(error);
        } finally {
            setProcessingImage(false);
        }
    }

    function clearQuestionImage() {
        setForm((current) => {
            revokeObjectUrl(current.question_image_url);

            return {
                ...current,
                question_image: null,
                question_image_url: null,
                question_image_meta: null,
                remove_question_image: true,
            };
        });
    }

    function setCorrectOption(selectedIndex) {
        setForm((current) => ({
            ...current,
            options: current.options.map((option, index) => ({
                ...option,
                is_correct: index === selectedIndex,
            })),
        }));
    }

    async function submitQuestion(event) {
        event.preventDefault();

        try {
            const payload = new FormData();
            payload.append('chapter_id', String(Number(form.chapter_id)));
            payload.append('type', form.type);
            payload.append('question_text', form.question_text);
            payload.append('answer_key', form.answer_key);
            payload.append('difficulty_level', form.difficulty_level);
            payload.append('points', String(Number(form.points)));

            if (form.explanation?.trim()) {
                payload.append('explanation', form.explanation);
            }

            if (form.question_image) {
                payload.append('question_image', form.question_image);
            }

            if (form.remove_question_image) {
                payload.append('remove_question_image', '1');
            }

            if (form.type === 'multiple_choice') {
                form.options.forEach((option, index) => {
                    payload.append(`options[${index}][option_key]`, option.option_key);
                    payload.append(`options[${index}][option_text]`, option.option_text);
                    payload.append(`options[${index}][is_correct]`, option.is_correct ? '1' : '0');
                    payload.append(`options[${index}][sort_order]`, String(option.sort_order ?? index));
                });
            }

            const requestConfig = {
                headers: { 'Content-Type': 'multipart/form-data' },
            };

            if (form.id) {
                await client.post(`/questions/${form.id}?_method=PUT`, payload, requestConfig);
            } else {
                await client.post('/questions', payload, requestConfig);
            }

            resetQuestionForm();
            await loadQuestions(page, perPage, filters, sort);
            onStatus({ type: 'success', message: 'Soal berhasil disimpan.' });
        } catch (error) {
            onError(error);
        }
    }

    async function removeQuestion(id) {
        try {
            await client.delete(`/questions/${id}`);
            await loadQuestions(page, perPage, filters, sort);
            onStatus({ type: 'success', message: 'Soal berhasil dihapus.' });
        } catch (error) {
            onError(error);
        }
    }

    async function bulkRemoveQuestions(ids) {
        try {
            await Promise.all(ids.map((id) => client.delete(`/questions/${id}`)));
            await loadQuestions(page, perPage, filters, sort);
            onStatus({ type: 'success', message: `${ids.length} soal berhasil dihapus.` });
        } catch (error) {
            onError(error);
        }
    }

    async function importQuestions() {
        if (!importFile) {
            onStatus({ type: 'error', message: 'Pilih file Excel atau Word DOCX terlebih dahulu.' });
            return;
        }

        setImporting(true);

        try {
            const payload = new FormData();
            payload.append('file', importFile);

            const extension = importFile.name.split('.').pop()?.toLowerCase() ?? '';
            const endpoint = extension === 'docx' ? '/questions/import-docx' : '/questions/import';

            const response = await client.post(endpoint, payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            await loadQuestions(page, perPage, filters, sort);
            setImportFile(null);
            setDocxPreview(null);
            onStatus({
                type: 'success',
                message: `Import selesai: ${response.data.summary.imported} berhasil, ${response.data.summary.skipped} gagal.`,
            });
        } catch (error) {
            onError(error);
        } finally {
            setImporting(false);
        }
    }

    function handleImportFileSelect(file) {
        if (!file) {
            setImportFile(null);
            setDocxPreview(null);
            return;
        }

        const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

        if (!ALLOWED_IMPORT_EXTENSIONS.includes(extension)) {
            setImportFile(null);
            setDocxPreview(null);
            onStatus({ type: 'error', message: 'Format file tidak didukung. Gunakan .xlsx, .xls, atau .docx.' });
            return;
        }

        setImportFile(file);

        if (extension !== 'docx') {
            setDocxPreview(null);
        }
    }

    async function previewDocxImport() {
        if (!importFile) {
            onStatus({ type: 'error', message: 'Pilih file DOCX terlebih dahulu untuk preview.' });
            return;
        }

        const extension = importFile.name.split('.').pop()?.toLowerCase() ?? '';
        if (extension !== 'docx') {
            onStatus({ type: 'error', message: 'Preview hanya tersedia untuk file DOCX.' });
            return;
        }

        setPreviewingDocx(true);

        try {
            const payload = new FormData();
            payload.append('file', importFile);

            const response = await client.post('/questions/import-docx/preview', payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setDocxPreview(response.data?.preview ?? null);
            const preview = response.data?.preview;
            onStatus({
                type: preview?.invalid_blocks ? 'error' : 'success',
                message: preview
                    ? `Preview DOCX: ${preview.valid_blocks} valid, ${preview.invalid_blocks} invalid dari ${preview.total_blocks} blok.`
                    : 'Preview DOCX selesai diproses.',
            });
        } catch (error) {
            onError(error);
        } finally {
            setPreviewingDocx(false);
        }
    }

    async function downloadTemplate() {
        try {
            const response = await client.get('/questions/import-template', {
                responseType: 'blob',
            });

            downloadBlob(response.data, 'template-import-soal.xlsx');
        } catch (error) {
            onError(error);
        }
    }

    async function downloadTemplateDocx() {
        try {
            const response = await client.get('/questions/import-template/docx', {
                responseType: 'blob',
            });

            downloadBlob(response.data, 'template-import-soal.docx');
        } catch (error) {
            onError(error);
        }
    }

    return {
        form,
        setForm,
        setQuestionImage,
        clearQuestionImage,
        resetQuestionForm,
        flatChapters,
        importFile,
        handleImportFileSelect,
        importing,
        previewingDocx,
        docxPreview,
        previewDocxImport,
        importQuestions,
        downloadTemplate,
        downloadTemplateDocx,
        setCorrectOption,
        submitQuestion,
        filters,
        setFilters,
        setPage,
        questions,
        removeQuestion,
        bulkRemoveQuestions,
        meta,
        setPerPage,
        sort,
        setSort,
        processingImage,
        loading,
    };
}
