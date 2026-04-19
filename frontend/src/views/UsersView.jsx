import { hasPermission } from '../utils/helpers';
import UserForm from '../features/users/UserForm';
import UserList from '../features/users/UserList';
import useUsers from '../hooks/useUsers';

export default function UsersView({ client, user, onStatus, onError }) {
    const {
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
    } = useUsers({ client, onStatus, onError });

    const canCreate = hasPermission(user, 'users.create');
    const canEdit = hasPermission(user, 'users.update');
    const canDelete = hasPermission(user, 'users.delete');
    const canResetPassword = Array.isArray(user?.roles) && user.roles.includes('super-admin');

    return (
        <section className="panel-stack form-list-stack">
            {canCreate || canEdit ? (
                <UserForm
                    form={form}
                    setForm={setForm}
                    roles={roles}
                    onSubmit={submitUser}
                    canCreate={canCreate}
                    canEdit={canEdit}
                />
            ) : null}
            <UserList
                filters={filters}
                setFilters={setFilters}
                setPage={setPage}
                roles={roles}
                users={users}
                setForm={setForm}
                currentUserId={user.id}
                removeUser={removeUser}
                bulkRemoveUsers={bulkRemoveUsers}
                resetUserPassword={resetUserPassword}
                canEdit={canEdit}
                canDelete={canDelete}
                canResetPassword={canResetPassword}
                meta={meta}
                setPerPage={setPerPage}
                sort={sort}
                setSort={setSort}
                loading={loading}
            />
        </section>
    );
}
