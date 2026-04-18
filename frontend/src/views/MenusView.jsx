import { useEffect, useMemo, useState } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import AppDataTable from '../components/AppDataTable';
import { resolveFeatherIcon } from '../config/featherIcons';
import useMenus from '../hooks/useMenus';
import { createMenuForm } from '../utils/factories';

function cloneTree(tree) {
    return tree.map((node) => ({
        ...node,
        children: cloneTree(node.children ?? []),
    }));
}

function removeNodeById(nodes, id) {
    let removed = null;
    const next = [];

    for (const node of nodes) {
        if (Number(node.id) === Number(id)) {
            removed = node;
            continue;
        }

        const childResult = removeNodeById(node.children ?? [], id);
        if (childResult.removed) {
            removed = childResult.removed;
            next.push({
                ...node,
                children: childResult.nodes,
            });
            continue;
        }

        next.push(node);
    }

    return { nodes: next, removed };
}

function containsNode(nodes, id) {
    for (const node of nodes) {
        if (Number(node.id) === Number(id)) {
            return true;
        }

        if (containsNode(node.children ?? [], id)) {
            return true;
        }
    }

    return false;
}

function insertNodeInside(nodes, targetId, nodeToInsert) {
    return nodes.map((node) => {
        if (Number(node.id) === Number(targetId)) {
            return {
                ...node,
                children: [...(node.children ?? []), nodeToInsert],
            };
        }

        return {
            ...node,
            children: insertNodeInside(node.children ?? [], targetId, nodeToInsert),
        };
    });
}

function flattenTreeForPayload(nodes) {
    return nodes.map((node) => ({
        id: Number(node.id),
        children: flattenTreeForPayload(node.children ?? []),
    }));
}

export default function MenusView({ client, user, onStatus, onError, onNavigationChanged }) {
    const {
        form,
        setForm,
        submitMenu,
        menus,
        menuTree,
        removeMenu,
        reorderMenuTree,
        availablePermissions,
        availableIcons,
        availableParentMenus,
        filters,
        setFilters,
        setPage,
        meta,
        setPerPage,
        sort,
        setSort,
        loading,
    } = useMenus({ client, onStatus, onError, onNavigationChanged });
    const [draggingMenuId, setDraggingMenuId] = useState(null);
    const [draftTree, setDraftTree] = useState([]);

    const isSuperAdmin = Array.isArray(user?.roles) && user.roles.includes('super-admin');

    const iconOptions = useMemo(() => [
        { value: '', label: 'Tanpa Icon' },
        ...availableIcons.map((iconName) => {
            const Icon = resolveFeatherIcon(iconName);

            return {
                value: iconName,
                searchText: iconName,
                selectedLabel: iconName,
                label: (
                    <span className="inline-option-with-icon">
                        {Icon ? <Icon /> : null}
                        <span>{iconName}</span>
                    </span>
                ),
            };
        }),
    ], [availableIcons]);

    useEffect(() => {
        setDraftTree(cloneTree(menuTree));
    }, [menuTree]);

    const treeChanged = useMemo(() => JSON.stringify(flattenTreeForPayload(draftTree)) !== JSON.stringify(flattenTreeForPayload(menuTree)), [draftTree, menuTree]);

    function moveAsRoot() {
        if (!draggingMenuId) {
            return;
        }

        setDraftTree((currentTree) => {
            const current = cloneTree(currentTree);
            const { nodes, removed } = removeNodeById(current, draggingMenuId);

            if (!removed) {
                return currentTree;
            }

            return [...nodes, removed];
        });
        setDraggingMenuId(null);
    }

    function moveInside(targetId) {
        if (!draggingMenuId || Number(draggingMenuId) === Number(targetId)) {
            return;
        }

        setDraftTree((currentTree) => {
            const current = cloneTree(currentTree);
            const { nodes, removed } = removeNodeById(current, draggingMenuId);

            if (!removed) {
                return currentTree;
            }

            if (containsNode([removed], targetId)) {
                return currentTree;
            }

            return insertNodeInside(nodes, targetId, removed);
        });
        setDraggingMenuId(null);
    }

    async function saveTreeOrder() {
        await reorderMenuTree(flattenTreeForPayload(draftTree));
    }

    function renderTree(nodes, level = 0) {
        return (
            <div className="menu-dnd-tree">
                {nodes.map((node) => (
                    <div key={node.id} className={`menu-dnd-node level-${level}`}>
                        <div
                            className={`menu-dnd-card ${draggingMenuId === node.id ? 'dragging' : ''}`}
                            draggable
                            onDragStart={() => setDraggingMenuId(node.id)}
                            onDragEnd={() => setDraggingMenuId(null)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                                event.preventDefault();
                                moveInside(node.id);
                            }}
                        >
                            <div className="menu-dnd-card-main">
                                <strong>{node.label}</strong>
                                <span className="muted">{node.key}</span>
                            </div>
                            <span className="badge subtle">Drop item lain ke sini jadi child</span>
                        </div>
                        {node.children?.length ? renderTree(node.children, level + 1) : null}
                    </div>
                ))}
            </div>
        );
    }

    if (!isSuperAdmin) {
        return (
            <article className="panel">
                <div className="panel-header">
                    <div>
                        <p className="eyebrow">Manajemen Menu</p>
                        <h2>Akses ditolak</h2>
                        <p className="muted">Fitur ini hanya untuk super-admin.</p>
                    </div>
                </div>
            </article>
        );
    }

    const columns = [
        {
            name: 'Key',
            selector: (item) => item.key,
            sortable: true,
            sortField: 'key',
            width: '170px',
        },
        {
            name: 'Label',
            selector: (item) => item.label,
            sortable: true,
            sortField: 'label',
            grow: 1.4,
        },
        {
            name: 'Parent',
            selector: (item) => item.parent?.label || '-',
            grow: 1.2,
        },
        {
            name: 'Permission',
            selector: (item) => item.permission || '-',
            grow: 1.5,
        },
        {
            name: 'Icon',
            selector: (item) => item.icon || '-',
            width: '140px',
        },
        {
            name: 'Urutan',
            selector: (item) => item.sort_order,
            sortable: true,
            sortField: 'sort_order',
            width: '110px',
        },
        {
            name: 'Status',
            cell: (item) => <span className="badge">{item.is_active ? 'Aktif' : 'Nonaktif'}</span>,
            width: '120px',
        },
        {
            name: 'Aksi',
            width: '220px',
            cell: (item) => (
                <div className="button-row compact table-actions">
                    <button
                        type="button"
                        className="ghost-button"
                        onClick={() => setForm({
                            id: item.id,
                            key: item.key,
                            parent_id: item.parent_id ? String(item.parent_id) : '',
                            label: item.label,
                            icon: item.icon || '',
                            permission: item.permission || '',
                            sort_order: item.sort_order,
                            is_active: item.is_active,
                        })}
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        className="danger-button"
                        disabled={item.key === 'dashboard'}
                        onClick={async () => {
                            if (item.key === 'dashboard') return;
                            const shouldDelete = window.confirm('Yakin ingin menghapus menu ini?');
                            if (!shouldDelete) return;
                            await removeMenu(item.id);
                        }}
                    >
                        Hapus
                    </button>
                </div>
            ),
        },
    ];

    function handleSort(column, direction) {
        setSort({ sortBy: column.sortField ?? '', sortDir: direction });
        setPage(1);
    }

    return (
        <section className="panel-stack form-list-stack">
            <article className="panel">
                <div className="panel-header">
                    <div>
                        <p className="eyebrow">Manajemen Menu</p>
                        <h2>Tambah / Edit Menu</h2>
                    </div>
                </div>

                <form className="form-grid" onSubmit={submitMenu}>
                    <label>
                        <span>Key</span>
                        <input value={form.key} onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))} required />
                    </label>
                    <label>
                        <span>Label</span>
                        <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} required />
                    </label>
                    <label>
                        <span>Parent Menu</span>
                        <SearchableSelect
                            value={form.parent_id}
                            onChange={(value) => setForm((current) => ({ ...current, parent_id: value }))}
                            options={[
                                { value: '', label: 'Root Menu' },
                                ...availableParentMenus
                                    .filter((menu) => Number(menu.id) !== Number(form.id))
                                    .map((menu) => ({ value: String(menu.id), label: `${menu.label} (${menu.key})` })),
                            ]}
                            placeholder="Root Menu"
                            searchPlaceholder="Cari parent menu..."
                        />
                    </label>
                    <label>
                        <span>Icon</span>
                        <SearchableSelect
                            value={form.icon}
                            onChange={(value) => setForm((current) => ({ ...current, icon: value }))}
                            options={iconOptions}
                            placeholder="Pilih icon"
                            searchPlaceholder="Cari icon..."
                        />
                    </label>
                    <label>
                        <span>Permission</span>
                        <SearchableSelect
                            value={form.permission}
                            onChange={(value) => setForm((current) => ({ ...current, permission: value }))}
                            options={[{ value: '', label: 'Tanpa Permission' }, ...availablePermissions.map((permission) => ({ value: permission, label: permission }))]}
                            placeholder="Pilih permission"
                            searchPlaceholder="Cari permission..."
                        />
                    </label>
                    <label>
                        <span>Sort Order</span>
                        <input type="number" min="0" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))} />
                    </label>
                    <label className="toggle-row">
                        <span>Aktif</span>
                        <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
                    </label>

                    <div className="button-row full-span">
                        <button type="submit" className="primary-button">{form.id ? 'Update Menu' : 'Simpan Menu'}</button>
                        <button type="button" className="ghost-button" onClick={() => setForm(createMenuForm())}>Reset</button>
                    </div>
                </form>
            </article>

            <article className="panel">
                <div className="panel-header">
                    <div>
                        <p className="eyebrow">Drag & Drop</p>
                        <h2>Atur urutan parent/child menu</h2>
                        <p className="muted">Tarik menu lalu drop ke menu lain untuk menjadikan child. Drop ke area root untuk menjadikannya menu utama.</p>
                    </div>
                    <div className="button-row compact">
                        <button
                            type="button"
                            className="ghost-button"
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                                event.preventDefault();
                                moveAsRoot();
                            }}
                        >
                            Drop ke Root
                        </button>
                        <button type="button" className="primary-button" onClick={saveTreeOrder} disabled={!treeChanged}>
                            Simpan Urutan
                        </button>
                    </div>
                </div>

                {renderTree(draftTree)}
            </article>

            <article className="panel">
                <div className="form-grid filter-bar">
                    <label className="filter-field filter-field-search">
                        <span>Cari</span>
                        <input value={filters.search} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, search: event.target.value })); }} placeholder="Key, label, permission" />
                    </label>
                    <label className="filter-field">
                        <span>Status</span>
                        <SearchableSelect
                            value={filters.is_active}
                            onChange={(value) => { setPage(1); setFilters((current) => ({ ...current, is_active: value })); }}
                            options={[
                                { value: '', label: 'Semua' },
                                { value: '1', label: 'Aktif' },
                                { value: '0', label: 'Nonaktif' },
                            ]}
                            placeholder="Semua"
                        />
                    </label>
                </div>

                <AppDataTable
                    columns={columns}
                    data={menus}
                    meta={meta}
                    onPageChange={setPage}
                    onPerPageChange={(nextPerPage) => {
                        setPerPage(nextPerPage);
                        setPage(1);
                    }}
                    noDataText="Belum ada menu."
                    sortServer
                    onSort={handleSort}
                />
            </article>
        </section>
    );
}
