import { useEffect, useState } from 'react';
import { FEATHER_ICON_NAMES } from '../config/featherIcons';
import { EMPTY_META } from '../config/constants';
import { createMenuForm } from '../utils/factories';
import { compactParams } from '../utils/helpers';

export default function useMenus({ client, onStatus, onError, onNavigationChanged }) {
    const [menus, setMenus] = useState([]);
    const [menuTree, setMenuTree] = useState([]);
    const [availablePermissions, setAvailablePermissions] = useState([]);
    const [availableParentMenus, setAvailableParentMenus] = useState([]);
    const [meta, setMeta] = useState(EMPTY_META);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [filters, setFilters] = useState({ search: '', is_active: '' });
    const [sort, setSort] = useState({ sortBy: '', sortDir: 'asc' });
    const [form, setForm] = useState(createMenuForm());
    const [loading, setLoading] = useState(false);

    async function loadMenus(targetPage = page, targetPerPage = perPage, targetFilters = filters, targetSort = sort) {
        setLoading(true);
        try {
            const response = await client.get('/menus', {
                params: compactParams({
                    page: targetPage,
                    per_page: targetPerPage,
                    search: targetFilters.search,
                    is_active: targetFilters.is_active,
                    sort_by: targetSort.sortBy,
                    sort_direction: targetSort.sortDir,
                }),
            });

            setMenus(response.data?.data ?? []);
            setMeta(response.data?.meta ?? EMPTY_META);
            setAvailablePermissions(response.data?.available_permissions ?? []);
            setAvailableParentMenus(response.data?.available_parent_menus ?? []);
        } finally {
            setLoading(false);
        }
    }

    async function loadMenuTree() {
        const response = await client.get('/menus/tree');
        setMenuTree(response.data?.data ?? []);
    }

    useEffect(() => {
        Promise.all([
            loadMenus(page, perPage, filters, sort),
            loadMenuTree(),
        ]).catch(onError);
    }, [client, page, perPage, filters, sort, onError]);

    async function submitMenu(event) {
        event.preventDefault();

        try {
            const payload = {
                key: form.key,
                parent_id: form.parent_id ? Number(form.parent_id) : null,
                label: form.label,
                icon: form.icon || null,
                permission: form.permission || null,
                sort_order: Number(form.sort_order || 0),
                is_active: Boolean(form.is_active),
            };

            if (form.id) {
                await client.put(`/menus/${form.id}`, payload);
            } else {
                await client.post('/menus', payload);
            }

            setForm(createMenuForm());
            await Promise.all([
                loadMenus(page, perPage, filters, sort),
                loadMenuTree(),
            ]);
            await onNavigationChanged?.();
            onStatus({ type: 'success', message: 'Menu berhasil disimpan.' });
        } catch (error) {
            onError(error);
        }
    }

    async function removeMenu(id) {
        try {
            await client.delete(`/menus/${id}`);
            await Promise.all([
                loadMenus(page, perPage, filters, sort),
                loadMenuTree(),
            ]);
            await onNavigationChanged?.();
            onStatus({ type: 'success', message: 'Menu berhasil dihapus.' });
        } catch (error) {
            onError(error);
        }
    }

    async function reorderMenuTree(tree) {
        try {
            await client.put('/menus/reorder', {
                tree,
            });

            await Promise.all([
                loadMenus(page, perPage, filters, sort),
                loadMenuTree(),
            ]);
            await onNavigationChanged?.();
            onStatus({ type: 'success', message: 'Urutan parent/child menu berhasil disimpan.' });
        } catch (error) {
            onError(error);
        }
    }

    return {
        form,
        setForm,
        submitMenu,
        menus,
        menuTree,
        removeMenu,
        reorderMenuTree,
        availablePermissions,
        availableIcons: FEATHER_ICON_NAMES,
        availableParentMenus,
        filters,
        setFilters,
        setPage,
        meta,
        setPerPage,
        sort,
        setSort,
        loading,
    };
}
