import { useEffect, useState } from 'react';
import { EMPTY_META } from '../config/constants';
import { createSubjectForm } from '../utils/factories';
import { compactParams, parsePaginated } from '../utils/helpers';

export default function useSubjects({ client, onStatus, onError }) {
    const [subjects, setSubjects] = useState([]);
    const [meta, setMeta] = useState(EMPTY_META);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [filters, setFilters] = useState({ search: '', is_active: '' });
    const [sort, setSort] = useState({ sortBy: '', sortDir: 'asc' });
    const [form, setForm] = useState(createSubjectForm());
    const [loading, setLoading] = useState(false);

    async function loadData(targetPage = page, targetPerPage = perPage, targetFilters = filters, targetSort = sort) {
        setLoading(true);
        try {
            const response = await client.get('/subjects', {
                params: compactParams({
                    page: targetPage,
                    per_page: targetPerPage,
                    search: targetFilters.search,
                    is_active: targetFilters.is_active,
                    sort_by: targetSort.sortBy,
                    sort_direction: targetSort.sortDir,
                }),
            });

            const paginated = parsePaginated(response);
            setSubjects(paginated.items);
            setMeta(paginated.meta);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData(page, perPage, filters, sort).catch(onError);
    }, [client, page, perPage, filters, sort, onError]);

    async function submitSubject(event) {
        event.preventDefault();

        try {
            const payload = {
                ...form,
            };

            if (form.id) {
                await client.put(`/subjects/${form.id}`, payload);
            } else {
                await client.post('/subjects', payload);
            }

            setForm(createSubjectForm());
            await loadData(page, perPage, filters, sort);
            onStatus({ type: 'success', message: 'Subject berhasil disimpan.' });
        } catch (error) {
            onError(error);
        }
    }

    async function removeSubject(id) {
        try {
            await client.delete(`/subjects/${id}`);
            await loadData(page, perPage, filters, sort);
            onStatus({ type: 'success', message: 'Subject berhasil dihapus.' });
        } catch (error) {
            onError(error);
        }
    }

    async function bulkRemoveSubjects(ids) {
        try {
            await Promise.all(ids.map((id) => client.delete(`/subjects/${id}`)));
            await loadData(page, perPage, filters, sort);
            onStatus({ type: 'success', message: `${ids.length} subject berhasil dihapus.` });
        } catch (error) {
            onError(error);
        }
    }

    return {
        form,
        setForm,
        submitSubject,
        filters,
        setFilters,
        setPage,
        subjects,
        removeSubject,
        bulkRemoveSubjects,
        meta,
        setPerPage,
        sort,
        setSort,
        loading,
    };
}
