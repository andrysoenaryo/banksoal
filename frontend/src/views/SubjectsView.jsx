import { hasPermission } from '../utils/helpers';
import SubjectForm from '../features/subjects/SubjectForm';
import SubjectList from '../features/subjects/SubjectList';
import useSubjects from '../hooks/useSubjects';

export default function SubjectsView({ client, user, onStatus, onError }) {
    const {
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
    } = useSubjects({ client, onStatus, onError });

    const canCreate = hasPermission(user, 'subjects.create');
    const canEdit = hasPermission(user, 'subjects.update');
    const canDelete = hasPermission(user, 'subjects.delete');

    return (
        <section className="panel-stack form-list-stack">
            {canCreate || canEdit ? (
                <SubjectForm
                    form={form}
                    setForm={setForm}
                    onSubmit={submitSubject}
                    canCreate={canCreate}
                    canEdit={canEdit}
                />
            ) : null}
            <SubjectList
                filters={filters}
                setFilters={setFilters}
                setPage={setPage}
                subjects={subjects}
                setForm={setForm}
                removeSubject={removeSubject}
                bulkRemoveSubjects={bulkRemoveSubjects}
                canEdit={canEdit}
                canDelete={canDelete}
                meta={meta}
                setPerPage={setPerPage}
                sort={sort}
                setSort={setSort}
                loading={loading}
            />
        </section>
    );
}
