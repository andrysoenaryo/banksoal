import { useEffect, useState } from 'react';
import { EMPTY_META } from '../config/constants';
import { createRoleForm } from '../utils/factories';
import { compactParams } from '../utils/helpers';

export default function useRoles({ client, onStatus, onError }) {
    const [roles, setRoles] = useState([]);
    const [availablePermissions, setAvailablePermissions] = useState([]);
    const [protectedRoles, setProtectedRoles] = useState([]);
    const [meta, setMeta] = useState(EMPTY_META);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [filters, setFilters] = useState({ search: '' });
    const [sort, setSort] = useState({ sortBy: '', sortDir: 'asc' });
    const [form, setForm] = useState(createRoleForm());
    const [loading, setLoading] = useState(false);

    async function loadData(targetPage = page, targetPerPage = perPage, targetFilters = filters, targetSort = sort) {
        setLoading(true);
        try {
            const response = await client.get('/roles', {
                params: compactParams({
                    page: targetPage,
                    per_page: targetPerPage,
                    search: targetFilters.search,
                    sort_by: targetSort.sortBy,
                    sort_direction: targetSort.sortDir,
                }),
            });

            setRoles(response.data.data ?? []);
            setMeta(response.data.meta ?? EMPTY_META);
            setAvailablePermissions(response.data.available_permissions ?? []);
            setProtectedRoles(response.data.protected_roles ?? []);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData(page, perPage, filters, sort).catch(onError);
    }, [client, page, perPage, filters, sort, onError]);

    async function submitRole(event) {
        event.preventDefault();

        try {
            const payload = {
                name: form.name,
                permissions: form.permissions,
            };

            if (form.id) {
                await client.put(`/roles/${form.id}`, payload);
            } else {
                await client.post('/roles', payload);
            }

            setForm(createRoleForm());
            await loadData(page, perPage, filters, sort);
            onStatus({ type: 'success', message: 'Role berhasil disimpan.' });
        } catch (error) {
            onError(error);
        }
    }

    async function removeRole(id) {
        try {
            await client.delete(`/roles/${id}`);
            await loadData(page, perPage, filters, sort);
            onStatus({ type: 'success', message: 'Role berhasil dihapus.' });
        } catch (error) {
            onError(error);
        }
    }

    async function bulkRemoveRoles(ids) {
        try {
            await Promise.all(ids.map((id) => client.delete(`/roles/${id}`)));
            await loadData(page, perPage, filters, sort);
            onStatus({ type: 'success', message: `${ids.length} role berhasil dihapus.` });
        } catch (error) {
            onError(error);
        }
    }

    return {
        form,
        setForm,
        availablePermissions,
        submitRole,
        filters,
        setFilters,
        setPage,
        roles,
        removeRole,
        bulkRemoveRoles,
        meta,
        setPerPage,
        sort,
        setSort,
        protectedRoles,
        loading,
    };
}
