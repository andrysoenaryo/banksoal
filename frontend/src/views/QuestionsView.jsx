import { hasPermission } from '../utils/helpers';
import QuestionForm from '../features/questions/QuestionForm';
import QuestionList from '../features/questions/QuestionList';
import useQuestions from '../hooks/useQuestions';

export default function QuestionsView({ client, user, onStatus, onError }) {
    const {
        form,
        setForm,
        setQuestionImage,
        clearQuestionImage,
        resetQuestionForm,
        processingImage,
        flatChapters,
        importFile,
        handleImportFileSelect,
        importing,
        previewingDocx,
        docxPreview,
        previewDocxImport,
        importQuestions,
        downloadTemplate,
        downloadTemplateDocx,
        setCorrectOption,
        submitQuestion,
        filters,
        setFilters,
        setPage,
        questions,
        removeQuestion,
        bulkRemoveQuestions,
        meta,
        setPerPage,
        sort,
        setSort,
        loading,
    } = useQuestions({ client, onStatus, onError });

    const canCreate = hasPermission(user, 'questions.create');
    const canEdit = hasPermission(user, 'questions.update');
    const canDelete = hasPermission(user, 'questions.delete');
    const canImport = hasPermission(user, 'questions.import');

    return (
        <section className="panel-stack form-list-stack">
            {canCreate || canEdit || canImport ? (
                <QuestionForm
                    form={form}
                    setForm={setForm}
                    setQuestionImage={setQuestionImage}
                    clearQuestionImage={clearQuestionImage}
                    processingImage={processingImage}
                    flatChapters={flatChapters}
                    importFile={importFile}
                    handleImportFileSelect={handleImportFileSelect}
                    importing={importing}
                    previewingDocx={previewingDocx}
                    docxPreview={docxPreview}
                    previewDocxImport={previewDocxImport}
                    importQuestions={importQuestions}
                    downloadTemplate={downloadTemplate}
                    downloadTemplateDocx={downloadTemplateDocx}
                    setCorrectOption={setCorrectOption}
                    resetQuestionForm={resetQuestionForm}
                    onSubmit={submitQuestion}
                    canCreate={canCreate}
                    canEdit={canEdit}
                    canImport={canImport}
                />
            ) : null}
            <QuestionList
                filters={filters}
                setFilters={setFilters}
                setPage={setPage}
                flatChapters={flatChapters}
                questions={questions}
                setForm={setForm}
                removeQuestion={removeQuestion}
                bulkRemoveQuestions={bulkRemoveQuestions}
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
