import { useEffect, useMemo, useState } from 'react';
import { EMPTY_META } from '../config/constants';
import { createPackageForm } from '../utils/factories';
import { compactParams, downloadBlob, flattenChapters, parsePaginated } from '../utils/helpers';

export default function usePackages({ client, onStatus, onError }) {
    const [chapters, setChapters] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [packages, setPackages] = useState([]);
    const [meta, setMeta] = useState(EMPTY_META);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [filters, setFilters] = useState({ search: '', from_date: '', to_date: '', min_questions: '', max_questions: '' });
    const [sort, setSort] = useState({ sortBy: '', sortDir: 'desc' });
    const [form, setForm] = useState(createPackageForm());
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [detailForm, setDetailForm] = useState({ title: '', description: '' });
    const [savingDetail, setSavingDetail] = useState(false);
    const [ruleQuestionEditor, setRuleQuestionEditor] = useState([]);
    const [ruleQuestionSelections, setRuleQuestionSelections] = useState({});
    const [loadingRuleQuestions, setLoadingRuleQuestions] = useState(false);
    const [savingItems, setSavingItems] = useState(false);
    const [addingRule, setAddingRule] = useState(false);
    const [loading, setLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewingPackageId, setPreviewingPackageId] = useState(null);

    const flatChapters = useMemo(() => flattenChapters(chapters), [chapters]);
    const filteredFlatChapters = useMemo(() => {
        if (!form.subject_id) {
            return [];
        }

        return flatChapters.filter((chapter) => String(chapter.subject_id) === String(form.subject_id));
    }, [flatChapters, form.subject_id]);

    async function loadChapters() {
        const response = await client.get('/chapters', { params: { tree: 1 } });
        setChapters(response.data);
    }

    async function loadSubjects() {
        const response = await client.get('/subjects', {
            params: {
                per_page: 100,
                sort_by: 'sort_order',
                sort_direction: 'asc',
            },
        });

        setSubjects(response.data?.data ?? []);
    }

    async function loadPackages(targetPage = page, targetPerPage = perPage, targetFilters = filters, targetSort = sort) {
        setLoading(true);
        try {
            const response = await client.get('/question-packages', {
                params: compactParams({
                    page: targetPage,
                    per_page: targetPerPage,
                    search: targetFilters.search,
                    from_date: targetFilters.from_date,
                    to_date: targetFilters.to_date,
                    min_questions: targetFilters.min_questions,
                    max_questions: targetFilters.max_questions,
                    sort_by: targetSort.sortBy,
                    sort_direction: targetSort.sortDir,
                }),
            });

            const paginated = parsePaginated(response);
            setPackages(paginated.items);
            setMeta(paginated.meta);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        Promise.all([loadChapters(), loadSubjects()]).catch(onError);
    }, [client, onError]);

    useEffect(() => {
        loadPackages(page, perPage, filters, sort).catch(onError);
    }, [client, page, perPage, filters, sort, onError]);

    function updateRule(index, key, value) {
        setForm((current) => ({
            ...current,
            rules: current.rules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, [key]: value } : rule),
        }));
    }

    async function submitPackage(event) {
        event.preventDefault();

        try {
            const response = await client.post('/question-packages/generate', {
                title: form.title,
                description: form.description,
                total_questions: Number(form.total_questions),
                rules: form.rules.map((rule) => ({
                    ...rule,
                    chapter_id: Number(rule.chapter_id),
                    composition_value: Number(rule.composition_value),
                    type: rule.type || null,
                })),
            });

            setForm(createPackageForm());
            setSelectedPackage(response.data);
            setDetailForm({
                title: response.data.title ?? '',
                description: response.data.description ?? '',
            });
            await loadRuleQuestions(response.data.id);
            await loadPackages(page, perPage, filters, sort);
            onStatus({ type: 'success', message: 'Paket soal berhasil digenerate.' });
        } catch (error) {
            onError(error);
        }
    }

    async function removePackage(id) {
        try {
            await client.delete(`/question-packages/${id}`);
            await loadPackages(page, perPage, filters, sort);
            onStatus({ type: 'success', message: 'Paket soal dihapus.' });
        } catch (error) {
            onError(error);
        }
    }

    async function bulkRemovePackages(ids) {
        try {
            await Promise.all(ids.map((id) => client.delete(`/question-packages/${id}`)));
            await loadPackages(page, perPage, filters, sort);
            onStatus({ type: 'success', message: `${ids.length} paket berhasil dihapus.` });
        } catch (error) {
            onError(error);
        }
    }

    async function exportPackage(id, format, includeAnswerKey = false) {
        try {
            const response = await client.get(`/question-packages/${id}/export/${format}`, {
                params: {
                    include_answer_key: includeAnswerKey ? 1 : 0,
                },
                responseType: 'blob',
            });

            const extension = format === 'pdf' ? 'pdf' : (format === 'excel' ? 'xlsx' : 'docx');
            downloadBlob(response.data, `paket-soal-${id}.${extension}`);
            onStatus({ type: 'success', message: `Export ${format.toUpperCase()} berhasil.` });
        } catch (error) {
            onError(error);
        }
    }

    async function previewPackage(id) {
        setPreviewLoading(true);
        setPreviewingPackageId(id);
        setSelectedPackage(null);
        setRuleQuestionEditor([]);
        setRuleQuestionSelections({});

        try {
            const response = await client.get(`/question-packages/${id}`);
            setSelectedPackage(response.data);
            setDetailForm({
                title: response.data.title ?? '',
                description: response.data.description ?? '',
            });
            await loadRuleQuestions(response.data.id);
        } catch (error) {
            onError(error);
        } finally {
            setPreviewLoading(false);
            setPreviewingPackageId(null);
        }
    }

    async function loadRuleQuestions(packageId) {
        setLoadingRuleQuestions(true);

        try {
            const response = await client.get(`/question-packages/${packageId}/rule-questions`);
            const rules = response.data?.rules ?? [];
            setRuleQuestionEditor(rules);
            setRuleQuestionSelections(
                Object.fromEntries(
                    rules.map((rule) => [String(rule.id), Array.isArray(rule.selected_question_ids) ? rule.selected_question_ids.map(Number) : []])
                )
            );
        } catch (error) {
            onError(error);
        } finally {
            setLoadingRuleQuestions(false);
        }
    }

    function toggleRuleQuestion(ruleId, questionId, checked) {
        const normalizedRuleId = String(ruleId);
        const normalizedQuestionId = Number(questionId);

        setRuleQuestionSelections((current) => {
            const next = { ...current };

            if (checked) {
                Object.keys(next).forEach((key) => {
                    next[key] = (next[key] ?? []).filter((id) => id !== normalizedQuestionId);
                });

                next[normalizedRuleId] = [...(next[normalizedRuleId] ?? []), normalizedQuestionId];
            } else {
                next[normalizedRuleId] = (next[normalizedRuleId] ?? []).filter((id) => id !== normalizedQuestionId);
            }

            return next;
        });
    }

    async function savePackageItems() {
        if (!selectedPackage) {
            return;
        }

        setSavingItems(true);

        try {
            const payload = {
                rules: ruleQuestionEditor.map((rule) => ({
                    rule_id: Number(rule.id),
                    question_ids: (ruleQuestionSelections[String(rule.id)] ?? []).map(Number),
                })),
            };

            const response = await client.put(`/question-packages/${selectedPackage.id}/items`, payload);
            setSelectedPackage(response.data);
            await loadRuleQuestions(selectedPackage.id);
            await loadPackages(page, perPage, filters, sort);
            onStatus({ type: 'success', message: 'Daftar soal paket berhasil diperbarui.' });
        } catch (error) {
            onError(error);
        } finally {
            setSavingItems(false);
        }
    }

    async function addRuleToPackage(chapterId) {
        if (!selectedPackage) {
            return;
        }

        const normalizedChapterId = Number(chapterId);
        if (!normalizedChapterId) {
            onStatus({ type: 'error', message: 'Pilih bab terlebih dahulu sebelum menambah rule.' });
            return;
        }

        setAddingRule(true);

        try {
            const response = await client.post(`/question-packages/${selectedPackage.id}/rules`, {
                chapter_id: normalizedChapterId,
            });

            setSelectedPackage(response.data);
            await loadRuleQuestions(selectedPackage.id);
            await loadPackages(page, perPage, filters, sort);
            onStatus({ type: 'success', message: 'Rule baru berhasil ditambahkan ke paket.' });
        } catch (error) {
            onError(error);
        } finally {
            setAddingRule(false);
        }
    }

    function closePreview() {
        setSelectedPackage(null);
        setDetailForm({ title: '', description: '' });
        setRuleQuestionEditor([]);
        setRuleQuestionSelections({});
        setPreviewLoading(false);
        setPreviewingPackageId(null);
    }

    async function savePackageDetail(event) {
        event.preventDefault();

        if (!selectedPackage) {
            return;
        }

        setSavingDetail(true);

        try {
            const response = await client.put(`/question-packages/${selectedPackage.id}`, {
                title: detailForm.title,
                description: detailForm.description,
            });

            setSelectedPackage(response.data);
            setDetailForm({
                title: response.data.title ?? '',
                description: response.data.description ?? '',
            });
            await loadPackages(page, perPage, filters);
            onStatus({ type: 'success', message: 'Detail paket berhasil diperbarui.' });
        } catch (error) {
            onError(error);
        } finally {
            setSavingDetail(false);
        }
    }

    return {
        form,
        setForm,
        subjects,
        flatChapters,
        filteredFlatChapters,
        updateRule,
        submitPackage,
        filters,
        setFilters,
        setPage,
        packages,
        exportPackage,
        previewPackage,
        removePackage,
        bulkRemovePackages,
        meta,
        setPerPage,
        sort,
        setSort,
        selectedPackage,
        detailForm,
        setDetailForm,
        savingDetail,
        savePackageDetail,
        closePreview,
        ruleQuestionEditor,
        ruleQuestionSelections,
        loadingRuleQuestions,
        savingItems,
        addingRule,
        toggleRuleQuestion,
        addRuleToPackage,
        savePackageItems,
        loading,
        previewLoading,
        previewingPackageId,
    };
}
