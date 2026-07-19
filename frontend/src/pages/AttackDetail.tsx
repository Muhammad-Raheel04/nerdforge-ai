import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, SeverityBadge } from '../components/ui/Badge';
import { Spinner, EmptyState, ErrorBanner, Tabs } from '../components/ui/Feedback';
import { CodeBlock } from '../components/ui/CodeBlock';
import { AttackChainGraph } from '../components/charts/AttackChainGraph';
import { SeverityDonut } from '../components/charts/SeverityDonut';
import { IOCRiskChart } from '../components/charts/BarCharts';
import { api } from '../lib/api';
import { deriveEvents } from '../lib/deriveEvents';
import type { AttackDetail as AttackDetailType, DetectionRule, IOC, IncidentReport } from '../lib/types';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'events', label: 'Timeline & Events' },
  { id: 'iocs', label: 'IOCs' },
  { id: 'detections', label: 'Detections' },
  { id: 'report', label: 'Report' },
];

export function AttackDetail() {
  const { id } = useParams<{ id: string }>();
  const [attack, setAttack] = useState<AttackDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!id) return;
    // Refetching when the route param changes is the standard "fetch on prop
    // change" effect pattern; resetting loading synchronously here is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api
      .getAttack(id)
      .then(setAttack)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load attack'))
      .finally(() => setLoading(false));
  }, [id]);

  const events = useMemo(
    () => (attack ? deriveEvents(attack.tactics || [], attack.timeline || []) : []),
    [attack]
  );

  if (loading) {
    return (
      <AppLayout title="Loading…">
        <Spinner label="Fetching attack details…" />
      </AppLayout>
    );
  }

  if (error || !attack || !id) {
    return (
      <AppLayout title="Attack not found">
        <Card>
          <EmptyState
            title="Couldn't load this attack"
            description={error || 'It may have been removed.'}
            action={
              <Link to="/attacks">
                <Button variant="secondary">Back to history</Button>
              </Link>
            }
          />
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={attack.name} subtitle={attack.description}>
      <div className="flex flex-col gap-6">
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'overview' && <OverviewTab attack={attack} />}
            {activeTab === 'events' && <EventsTab attack={attack} events={events} />}
            {activeTab === 'iocs' && <IOCsTab attackId={id} />}
            {activeTab === 'detections' && <DetectionsTab attackId={id} />}
            {activeTab === 'report' && <ReportTab attackId={id} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------

function OverviewTab({ attack }: { attack: AttackDetailType }) {
  const severityScore = Number(attack.summary?.severity_score);
  const priority = String(attack.summary?.priority || '');
  const actions = (attack.summary?.recommended_actions as string[]) || [];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Attack chain" subtitle={`${attack.tactics?.length || 0} stages mapped to MITRE ATT&CK`} />
        <AttackChainGraph stages={attack.tactics || []} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="SOC analysis summary" />
          {attack.summary?.summary ? (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{String(attack.summary.summary)}</p>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No summary available.</p>
          )}

          {actions.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                Recommended actions
              </div>
              <ul className="flex flex-col gap-2">
                {actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                    <span className="w-5 h-5 rounded-md bg-[var(--accent-violet-soft)] text-[var(--accent-violet)] flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Priority" />
          <div className="flex flex-col items-center justify-center py-4">
            {priority && <SeverityBadge severity={priority} />}
            <div className="font-display text-4xl font-semibold text-[var(--text-primary)] mt-4">
              {Number.isNaN(severityScore) ? '—' : severityScore}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">severity score / 100</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function EventsTab({ attack, events }: { attack: AttackDetailType; events: ReturnType<typeof deriveEvents> }) {
  const counts: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  events.forEach((e) => {
    const key = Object.keys(counts).find((k) => k.toLowerCase() === e.severity.toLowerCase());
    if (key) counts[key] += 1;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card padding="none">
          <div className="p-6 pb-0">
            <CardHeader title="Timeline" subtitle="Chronological sequence of the attack" />
          </div>
          <div className="px-6 pb-6 flex flex-col gap-4">
            {(attack.timeline || []).map((t, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: 'var(--gradient-primary)' }} />
                  {i < attack.timeline.length - 1 && <span className="w-px flex-1 bg-[var(--border-subtle)] mt-1" />}
                </div>
                <div className="pb-1">
                  <div className="text-xs font-mono text-[var(--accent-pink)]">{t.time}</div>
                  <div className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{t.action}</div>
                  <div className="text-sm text-[var(--text-muted)] mt-0.5">{t.description}</div>
                </div>
              </div>
            ))}
            {(!attack.timeline || attack.timeline.length === 0) && (
              <p className="text-sm text-[var(--text-muted)]">No timeline data.</p>
            )}
          </div>
        </Card>

        <Card padding="none">
          <div className="p-6 pb-0">
            <CardHeader title="Security events" subtitle="Reconstructed from attack stages" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)] uppercase tracking-wide border-y border-[var(--border-subtle)]">
                  <th className="px-6 py-3 font-medium">Source</th>
                  <th className="px-6 py-3 font-medium">Event</th>
                  <th className="px-6 py-3 font-medium">MITRE</th>
                  <th className="px-6 py-3 font-medium">Severity</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-6 py-3 text-[var(--text-muted)] whitespace-nowrap">{e.log_source}</td>
                    <td className="px-6 py-3">
                      <div className="font-medium text-[var(--text-primary)]">{e.event_type}</div>
                      <div className="text-xs text-[var(--text-muted)]">{e.description}</div>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-[var(--accent-violet)]">{e.mitre_technique}</td>
                    <td className="px-6 py-3">
                      <SeverityBadge severity={e.severity} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Event severity" />
        <SeverityDonut counts={counts} centerLabel="events" />
      </Card>
    </div>
  );
}

function IOCsTab({ attackId }: { attackId: string }) {
  const [iocs, setIocs] = useState<IOC[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listIOCs(attackId)
      .then(setIocs)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load IOCs'))
      .finally(() => setLoading(false));
  }, [attackId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const result = await api.generateIOCs(attackId);
      setIocs((prev) => [...result, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to extract IOCs');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card padding="none" className="lg:col-span-2">
        <div className="p-6 flex items-center justify-between">
          <CardHeader title="Indicators of Compromise" subtitle={`${iocs.length} extracted`} />
          <Button size="sm" onClick={handleGenerate} loading={generating}>
            Extract IOCs
          </Button>
        </div>
        {error && (
          <div className="px-6 pb-4">
            <ErrorBanner message={error} />
          </div>
        )}
        {loading ? (
          <Spinner label="Loading IOCs…" />
        ) : iocs.length === 0 ? (
          <EmptyState
            title="No IOCs extracted yet"
            description="Click 'Extract IOCs' to have the AI pull indicators from this attack's stages and analysis."
          />
        ) : (
          <div className="overflow-x-auto pb-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)] uppercase tracking-wide border-y border-[var(--border-subtle)]">
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Value</th>
                  <th className="px-6 py-3 font-medium">Context</th>
                  <th className="px-6 py-3 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {iocs.map((i) => (
                  <tr key={i.id} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-6 py-3">
                      <Badge color="violet">{i.indicator_type}</Badge>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-[var(--text-primary)]">{i.value}</td>
                    <td className="px-6 py-3 text-[var(--text-muted)] max-w-xs">{i.threat_intel?.context}</td>
                    <td className="px-6 py-3">
                      <RiskPill score={i.risk_score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Risk distribution" subtitle="Top indicators by risk score" />
        <IOCRiskChart iocs={iocs} />
      </Card>
    </div>
  );
}

function RiskPill({ score }: { score: number }) {
  const color = score >= 80 ? 'text-rose-500 bg-rose-500/10' : score >= 60 ? 'text-orange-500 bg-orange-500/10' : score >= 35 ? 'text-amber-500 bg-amber-500/10' : 'text-emerald-500 bg-emerald-500/10';
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{score}</span>;
}

function DetectionsTab({ attackId }: { attackId: string }) {
  const [detections, setDetections] = useState<DetectionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [format, setFormat] = useState<'sigma' | 'yara'>('sigma');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listDetections(attackId)
      .then(setDetections)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load detections'))
      .finally(() => setLoading(false));
  }, [attackId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const result = await api.generateDetections(attackId, format, 5);
      setDetections((prev) => [...result, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate detection rules');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">Detection rules</h3>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{detections.length} rules generated</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-lg p-0.5">
            {(['sigma', 'yara'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                  format === f
                    ? 'text-white shadow-[var(--shadow-violet)] [background:var(--gradient-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={handleGenerate} loading={generating}>
            Generate Rules
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <Spinner label="Loading detection rules…" />
      ) : detections.length === 0 ? (
        <Card>
          <EmptyState
            title="No detection rules yet"
            description="Generate Sigma or YARA rules from this attack's stages."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {detections.map((d) => (
            <Card key={d.id}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-medium text-sm text-[var(--text-primary)]">{d.rule_name}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">{d.description}</div>
                </div>
                <SeverityBadge severity={d.severity} />
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge color="cyan">{d.rule_format.toUpperCase()}</Badge>
                {d.mitre_technique && <Badge>{d.mitre_technique}</Badge>}
                <Badge>Confidence {d.confidence}%</Badge>
              </div>
              <CodeBlock content={d.rule_content} language={d.rule_format} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportTab({ attackId }: { attackId: string }) {
  const [report, setReport] = useState<IncidentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const list = await api.listReports(attackId);
        if (list.length > 0) {
          const latest = await api.getReport(attackId, list[list.length - 1].id);
          setReport(latest);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    })();
  }, [attackId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const result = await api.generateReport(attackId);
      setReport(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Spinner label="Loading report…" />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">Incident report</h3>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {report ? 'Regenerate to reflect any new IOCs or detections' : 'Not generated yet'}
          </p>
        </div>
        <Button size="sm" onClick={handleGenerate} loading={generating}>
          {report ? 'Regenerate Report' : 'Generate Report'}
        </Button>
      </div>

      {error && <ErrorBanner message={error} />}

      {!report ? (
        <Card>
          <EmptyState
            title="No report generated yet"
            description="Generate a professional incident report summarizing this attack, its IOCs, and detections."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-3">{report.title}</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{report.summary}</p>
          </Card>

          {report.technical_details && (
            <Card>
              <CardHeader title="Technical details" />
              <div className="flex flex-col gap-4 text-sm">
                {report.technical_details.attack_narrative && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                      Attack narrative
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {report.technical_details.attack_narrative}
                    </p>
                  </div>
                )}
                {report.technical_details.root_cause && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                      Root cause
                    </div>
                    <p className="text-[var(--text-secondary)]">{report.technical_details.root_cause}</p>
                  </div>
                )}
                {report.technical_details.affected_systems && report.technical_details.affected_systems.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                      Affected systems
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {report.technical_details.affected_systems.map((s, i) => (
                        <Badge key={i}>{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {report.recommendations && report.recommendations.length > 0 && (
            <Card>
              <CardHeader title="Recommendations" />
              <ul className="flex flex-col gap-2.5">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                    <span className="w-5 h-5 rounded-md bg-[var(--accent-violet-soft)] text-[var(--accent-violet)] flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
