import { useEffect, useState } from 'react';
import { EMPTY_META } from '../config/constants';
import { createUserForm } from '../utils/factories';
import { compactParams } from '../utils/helpers';

export default function useUsers({ client, onStatus, onError }) {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [meta, setMeta] = useState(EMPTY_META);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [filters, setFilters] = useState({ search: '', role: '', is_active: '' });
    const [sort, setSort] = useState({ sortBy: '', sortDir: 'asc' });
    const [form, setForm] = useState(createUserForm());
    const [loading, setLoading] = useState(false);

    async function loadData(targetPage = page, targetPerPage = perPage, targetFilters = filters, targetSort = sort) {
        setLoading(true);
        try {
            const response = await client.get('/users', {
                params: compactParams({
                    page: targetPage,
                    per_page: targetPerPage,
                    search: targetFilters.search,
                    role: targetFilters.role,
                    is_active: targetFilters.is_active,
                    sort_by: targetSort.sortBy,
                    sort_direction: targetSort.sortDir,
                }),
            });

            setUsers(response.data.data ?? []);
            setMeta(response.data.meta ?? EMPTY_META);
            setRoles(response.data.available_roles ?? []);
            setForm((current) => current.role ? current : createUserForm(response.data.available_roles?.[0] ?? ''));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData(page, perPage, filters, sort).catch(onError);
    }, [client, page, perPage, filters, sort, onError]);

    async function submitUser(event) {
        event.preventDefault();

        try {
            if (form.id) {
                await client.put(`/users/${form.id}`, form);
            } else {
                await client.post('/users', form);
            }

            setForm(createUserForm(roles[0] ?? ''));
            await loadData(page, perPage, filters, sort);
            onStatus({ type: 'success', message: 'Data user berhasil disimpan.' });
        } catch (error) {
            onError(error);
        }
    }

    async function removeUser(id) {
        try {
            await client.delete(`/users/${id}`);
            await loadData(page, perPage, filters, sort);
            onStatus({ type: 'success', message: 'User dihapus.' });
        } catch (error) {
            onError(error);
        }
    }

    async function bulkRemoveUsers(ids) {
        try {
            await Promise.all(ids.map((id) => client.delete(`/users/${id}`)));
            await loadData(page, perPage, filters, sort);
            onStatus({ type: 'success', message: `${ids.length} user berhasil dihapus.` });
        } catch (error) {
            onError(error);
        }
    }

    async function resetUserPassword(id) {
        try {
            await client.post(`/users/${id}/reset-password`);
            onStatus({ type: 'success', message: 'Password user langsung di-reset dan notifikasi email dikirim.' });
        } catch (error) {
            onError(error);
        }
    }

    return {
        form,
        setForm,
        roles,
        submitUser,
        filters,
        setFilters,
        setPage,
        users,
        removeUser,
        bulkRemoveUsers,
        resetUserPassword,
        meta,
        setPerPage,
        sort,
        setSort,
        loading,
    };
}
