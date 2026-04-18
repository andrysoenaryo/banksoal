import { hasPermission } from '../utils/helpers';
import ChapterForm from '../features/chapters/ChapterForm';
import ChapterList from '../features/chapters/ChapterList';
import useChapters from '../hooks/useChapters';

export default function ChaptersView({ client, user, onStatus, onError }) {
    const {
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
    } = useChapters({ client, onStatus, onError });

    const canCreate = hasPermission(user, 'chapters.create');
    const canEdit = hasPermission(user, 'chapters.update');
    const canDelete = hasPermission(user, 'chapters.delete');

    return (
        <section className="panel-stack form-list-stack">
            {canCreate || canEdit ? (
                <ChapterForm
                    form={form}
                    setForm={setForm}
                    flatChapters={flatChapters}
                    subjects={subjects}
                    onSubmit={submitChapter}
                    canCreate={canCreate}
                    canEdit={canEdit}
                />
            ) : null}
            <ChapterList
                filters={filters}
                setFilters={setFilters}
                setPage={setPage}
                subjects={subjects}
                chapters={chapters}
                setForm={setForm}
                removeChapter={removeChapter}
                bulkRemoveChapters={bulkRemoveChapters}
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
