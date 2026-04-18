import { hasPermission } from '../utils/helpers';
import RoleForm from '../features/roles/RoleForm';
import RoleList from '../features/roles/RoleList';
import useRoles from '../hooks/useRoles';

export default function RolesView({ client, user, onStatus, onError }) {
    const {
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
        loading,
    } = useRoles({ client, onStatus, onError });

    const canCreate = hasPermission(user, 'roles.create');
    const canEdit = hasPermission(user, 'roles.update');
    const canDelete = hasPermission(user, 'roles.delete');

    return (
        <section className="panel-stack form-list-stack">
            {canCreate || canEdit ? (
                <RoleForm
                    form={form}
                    setForm={setForm}
                    availablePermissions={availablePermissions}
                    onSubmit={submitRole}
                    canCreate={canCreate}
                    canEdit={canEdit}
                />
            ) : null}
            <RoleList
                filters={filters}
                setFilters={setFilters}
                setPage={setPage}
                roles={roles}
                setForm={setForm}
                removeRole={removeRole}
                bulkRemoveRoles={bulkRemoveRoles}
                canEdit={canEdit}
                canDelete={canDelete}
                meta={meta}
                setPerPage={setPerPage}
                setSort={setSort}
                loading={loading}
            />
        </section>
    );
}
