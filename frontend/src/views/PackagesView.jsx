import { hasPermission } from '../utils/helpers';
import PackageForm from '../features/packages/PackageForm';
import PackageList from '../features/packages/PackageList';
import PackagePreviewPanel from '../features/packages/PackagePreviewPanel';
import usePackages from '../hooks/usePackages';

export default function PackagesView({ client, user, onStatus, onError }) {
    const {
        form,
        setForm,
        subjects,
        flatChapters,
        filteredFlatChapters,
        updateRule,
        submitPackage,
        filters,
        setFilters,
        setPage,
        packages,
        exportPackage,
        previewPackage,
        removePackage,
        bulkRemovePackages,
        meta,
        setPerPage,
        sort,
        setSort,
        selectedPackage,
        detailForm,
        setDetailForm,
        savingDetail,
        savePackageDetail,
        closePreview,
        ruleQuestionEditor,
        ruleQuestionSelections,
        loadingRuleQuestions,
        savingItems,
        addingRule,
        toggleRuleQuestion,
        addRuleToPackage,
        savePackageItems,
        loading,
        previewLoading,
        previewingPackageId,
    } = usePackages({ client, onStatus, onError });

    const canGenerate = hasPermission(user, 'packages.generate');
    const canUpdate = hasPermission(user, 'packages.update');
    const canDelete = hasPermission(user, 'packages.delete');
    const canExport = hasPermission(user, 'packages.export');

    return (
        <section className="panel-stack form-list-stack">
            {canGenerate ? (
                <PackageForm
                    form={form}
                    setForm={setForm}
                    subjects={subjects}
                    flatChapters={filteredFlatChapters}
                    updateRule={updateRule}
                    onSubmit={submitPackage}
                    canGenerate={canGenerate}
                />
            ) : null}
            <PackageList
                filters={filters}
                setFilters={setFilters}
                setPage={setPage}
                packages={packages}
                exportPackage={exportPackage}
                previewPackage={previewPackage}
                removePackage={removePackage}
                bulkRemovePackages={bulkRemovePackages}
                canUpdate={canUpdate}
                canDelete={canDelete}
                canExport={canExport}
                meta={meta}
                setPerPage={setPerPage}
                sort={sort}
                setSort={setSort}
                loading={loading}
                previewLoading={previewLoading}
                previewingPackageId={previewingPackageId}
            />
            <PackagePreviewPanel
                selectedPackage={selectedPackage}
                previewLoading={previewLoading}
                flatChapters={flatChapters}
                detailForm={detailForm}
                setDetailForm={setDetailForm}
                savingDetail={savingDetail}
                onSaveDetail={savePackageDetail}
                onClose={closePreview}
                exportPackage={exportPackage}
                canUpdate={canUpdate}
                canExport={canExport}
                ruleQuestionEditor={ruleQuestionEditor}
                ruleQuestionSelections={ruleQuestionSelections}
                loadingRuleQuestions={loadingRuleQuestions}
                savingItems={savingItems}
                addingRule={addingRule}
                toggleRuleQuestion={toggleRuleQuestion}
                addRuleToPackage={addRuleToPackage}
                savePackageItems={savePackageItems}
            />
        </section>
    );
}
