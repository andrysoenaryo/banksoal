import { useEffect, useState } from 'react';
import { FiArrowRight, FiBookOpen, FiClock, FiFileText, FiLayers, FiSettings, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { formatDateTime } from '../utils/helpers';

export default function DashboardView({ client, user, onError, onNavigate }) {
    const [dashboard, setDashboard] = useState(null);

    useEffect(() => {
        client.get('/dashboard')
            .then((response) => setDashboard(response.data))
            .catch((error) => onError(error));
    }, [client, onError]);

    if (!dashboard) {
        return <div className="panel">Memuat ringkasan...</div>;
    }

    const { summary, recent } = dashboard;

    const metrics = [
        ['Total Soal', summary.multiple_choice_questions + summary.essay_questions, 'Soal aktif di bank soal', FiBookOpen, 'tone-blue'],
        ['Bab & Sub Bab', summary.chapters + summary.sub_chapters, 'Struktur materi tersedia', FiLayers, 'tone-green'],
        ['Paket Soal', summary.question_packages, 'Riwayat paket generated', FiFileText, 'tone-amber'],
        ['Pengguna', summary.users, 'User dengan akses panel', FiUsers, 'tone-rose'],
    ];

    const quickActions = [
        ['Bank Soal', 'Kelola dan upload soal baru', 'questions', FiBookOpen, 'tone-blue'],
        ['Bab Materi', 'Rapikan struktur bab dan sub bab', 'chapters', FiLayers, 'tone-green'],
        ['Generator Paket', 'Susun paket soal siap export', 'packages', FiFileText, 'tone-amber'],
        ['Hak Akses', 'Atur akun dan permission user', 'users', FiSettings, 'tone-rose'],
    ];

    const totalQuestions = summary.multiple_choice_questions + summary.essay_questions;
    const questionMix = totalQuestions > 0
        ? [
            {
                label: 'Pilihan Ganda',
                value: summary.multiple_choice_questions,
                percentage: Math.round((summary.multiple_choice_questions / totalQuestions) * 100),
                tone: 'tone-blue',
            },
            {
                label: 'Essay',
                value: summary.essay_questions,
                percentage: Math.round((summary.essay_questions / totalQuestions) * 100),
                tone: 'tone-amber',
            },
        ]
        : [];

    const structureProgress = [
        {
            label: 'Bab Aktif',
            value: summary.chapters,
            helper: `${summary.sub_chapters} sub bab terhubung`,
            tone: 'tone-green',
        },
        {
            label: 'Paket Tersusun',
            value: summary.question_packages,
            helper: `${summary.users} pengguna panel`,
            tone: 'tone-rose',
        },
    ];

    const activityItems = [
        ...(recent?.questions ?? []).map((item) => ({
            id: `question-${item.id}`,
            title: item.title,
            helper: `${item.chapter ?? '-'} • ${item.actor ?? '-'}`,
            when: item.created_at,
            type: item.type === 'multiple_choice' ? 'Soal PG' : 'Soal Essay',
            tone: 'tone-blue',
            target: 'questions',
        })),
        ...(recent?.packages ?? []).map((item) => ({
            id: `package-${item.id}`,
            title: item.title,
            helper: `${item.total_questions} soal • ${item.actor ?? '-'}`,
            when: item.generated_at,
            type: 'Paket Soal',
            tone: 'tone-amber',
            target: 'packages',
        })),
        ...(recent?.users ?? []).map((item) => ({
            id: `user-${item.id}`,
            title: item.name,
            helper: `${item.email} • ${item.is_active ? 'Aktif' : 'Nonaktif'}`,
            when: item.created_at,
            type: 'User',
            tone: 'tone-rose',
            target: 'users',
        })),
        ...(recent?.chapters ?? []).map((item) => ({
            id: `chapter-${item.id}`,
            title: item.name,
            helper: `${item.scope} • ${item.questions_count} soal`,
            when: item.created_at,
            type: 'Bab',
            tone: 'tone-green',
            target: 'chapters',
        })),
    ]
        .sort((left, right) => new Date(right.when ?? 0).getTime() - new Date(left.when ?? 0).getTime())
        .slice(0, 6);

    return (
        <section className="panel-stack">
            <div className="hero-strip dashboard-hero">
                <div>
                    <p className="eyebrow">Ringkasan Guru</p>
                    <h2>Aktivitas bank soal hari ini</h2>
                    <p className="muted">Monitor data utama sebelum upload soal, menyusun paket, atau mengatur hak akses.</p>
                </div>
                <span className="badge">Login sebagai {user?.name ?? 'Pengguna'}</span>
            </div>

            <div className="stats-grid kpi-grid">
                {metrics.map(([label, value, helper, Icon, tone]) => (
                    <article key={label} className="stat-card kpi-card">
                        <div className="kpi-card-head">
                            <span className={`kpi-icon ${tone}`}><Icon /></span>
                            <div>
                                <p>{label}</p>
                                <strong>{value}</strong>
                            </div>
                        </div>
                        <p className="muted">{helper}</p>
                    </article>
                ))}
            </div>

            <div className="stats-grid quick-action-grid">
                {quickActions.map(([label, helper, target, Icon, tone]) => (
                    <article key={label} className="stat-card quick-action-card">
                        <div className="kpi-card-head">
                            <span className={`kpi-icon ${tone}`}><Icon /></span>
                            <div>
                                <p>{label}</p>
                                <p className="muted">{helper}</p>
                            </div>
                        </div>
                        <button type="button" className="ghost-button quick-action-button" onClick={() => onNavigate(target)}>
                            <span>Buka Menu</span>
                            <FiArrowRight />
                        </button>
                    </article>
                ))}
            </div>

            <div className="stats-grid dashboard-detail-grid">
                <article className="panel progress-panel">
                    <div className="panel-header">
                        <div>
                            <p className="eyebrow">Komposisi Soal</p>
                            <h2>Proporsi tipe soal</h2>
                        </div>
                        <span className="badge"><FiTrendingUp /> {totalQuestions} total</span>
                    </div>

                    <div className="progress-stack">
                        {questionMix.map((item) => (
                            <div key={item.label} className="progress-item">
                                <div className="progress-copy">
                                    <strong>{item.label}</strong>
                                    <span className="muted">{item.value} soal</span>
                                </div>
                                <div className="progress-bar-track">
                                    <span className={`progress-bar-fill ${item.tone}`} style={{ width: `${item.percentage}%` }} />
                                </div>
                                <span className="progress-value">{item.percentage}%</span>
                            </div>
                        ))}
                    </div>
                </article>

                <article className="panel progress-panel">
                    <div className="panel-header">
                        <div>
                            <p className="eyebrow">Kesiapan Sistem</p>
                            <h2>Ringkasan struktur</h2>
                        </div>
                        <span className="badge subtle">Snapshot hari ini</span>
                    </div>

                    <div className="mini-stat-grid">
                        {structureProgress.map((item) => (
                            <div key={item.label} className="mini-stat-card">
                                <span className={`kpi-icon ${item.tone}`}><FiClock /></span>
                                <strong>{item.value}</strong>
                                <p>{item.label}</p>
                                <span className="muted">{item.helper}</span>
                            </div>
                        ))}
                    </div>
                </article>
            </div>

            <article className="panel activity-panel">
                <div className="panel-header">
                    <div>
                        <p className="eyebrow">Aktivitas Terbaru</p>
                        <h2>Pembaruan terakhir di sistem</h2>
                    </div>
                    <span className="badge"><FiClock /> {activityItems.length} item</span>
                </div>

                <div className="activity-list">
                    {activityItems.map((item) => (
                        <button key={item.id} type="button" className="activity-item" onClick={() => onNavigate(item.target)}>
                            <span className={`kpi-icon ${item.tone}`}><FiClock /></span>
                            <span className="activity-copy">
                                <strong>{item.title}</strong>
                                <span className="muted">{item.helper}</span>
                            </span>
                            <span className="activity-meta">
                                <span className="badge subtle">{item.type}</span>
                                <span className="muted">{formatDateTime(item.when)}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </article>
        </section>
    );
}
