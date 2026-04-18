import { useEffect, useMemo, useState } from 'react';
import { EMPTY_META } from '../config/constants';
import { createChapterForm } from '../utils/factories';
import { compactParams, flattenChapters, parsePaginated } from '../utils/helpers';

export default function useChapters({ client, onStatus, onError }) {
    const [chapterTree, setChapterTree] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [meta, setMeta] = useState(EMPTY_META);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [filters, setFilters] = useState({ search: '', subject_id: '', scope: '', is_active: '' });
    const [sort, setSort] = useState({ sortBy: '', sortDir: 'asc' });
    const [form, setForm] = useState(createChapterForm());
    const [loading, setLoading] = useState(false);

    const flatChapters = useMemo(() => flattenChapters(chapterTree), [chapterTree]);

    async function loadTree() {
        const response = await client.get('/chapters', { params: { tree: 1 } });
        setChapterTree(response.data);
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

    async function loadList(targetPage = page, targetPerPage = perPage, targetFilters = filters, targetSort = sort) {
        setLoading(true);
        try {
            const response = await client.get('/chapters', {
                params: compactParams({
                    page: targetPage,
                    per_page: targetPerPage,
                    search: targetFilters.search,
                    subject_id: targetFilters.subject_id,
                    scope: targetFilters.scope,
                    is_active: targetFilters.is_active,
                    sort_by: targetSort.sortBy,
                    sort_direction: targetSort.sortDir,
                }),
            });

            const paginated = parsePaginated(response);
            setChapters(paginated.items);
            setMeta(paginated.meta);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        Promise.all([loadTree(), loadSubjects()]).catch(onError);
    }, [client, onError]);

    useEffect(() => {
        loadList(page, perPage, filters, sort).catch(onError);
    }, [client, page, perPage, filters, sort, onError]);

    async function submitChapter(event) {
        event.preventDefault();

        try {
            const payload = {
                ...form,
                subject_id: Number(form.subject_id),
                parent_id: form.parent_id || null,
            };

            if (form.id) {
                await client.put(`/chapters/${form.id}`, payload);
            } else {
                await client.post('/chapters', payload);
            }

            setForm(createChapterForm());
            await Promise.all([loadTree(), loadList(page, perPage, filters)]);
            onStatus({ type: 'success', message: 'Data bab berhasil disimpan.' });
        } catch (error) {
            onError(error);
        }
    }

    async function removeChapter(id) {
        try {
            await client.delete(`/chapters/${id}`);
            await Promise.all([loadTree(), loadList(page, perPage, filters, sort)]);
            onStatus({ type: 'success', message: 'Bab berhasil dihapus.' });
        } catch (error) {
            onError(error);
        }
    }

    async function bulkRemoveChapters(ids) {
        try {
            await Promise.all(ids.map((id) => client.delete(`/chapters/${id}`)));
            await Promise.all([loadTree(), loadList(page, perPage, filters, sort)]);
            onStatus({ type: 'success', message: `${ids.length} bab berhasil dihapus.` });
        } catch (error) {
            onError(error);
        }
    }

    return {
        form,
        setForm,
        flatChapters,
        subjects,
        submitChapter,
        filters,
        setFilters,
        setPage,
        chapters,
        removeChapter,
        bulkRemoveChapters,
        meta,
        setPerPage,
        sort,
        setSort,
        loading,
    };
}
