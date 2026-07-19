import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ErrorBanner } from '../components/ui/Feedback';
import { api } from '../lib/api';
import type { GenerateAttackRequest } from '../lib/types';

const industries = ['Finance', 'Healthcare', 'Technology', 'Retail', 'Government', 'Manufacturing', 'Education'];
const attackTypes = ['Ransomware', 'Phishing', 'Data Breach', 'Supply Chain', 'DDoS', 'Insider Threat', 'Zero-Day Exploit'];
const difficulties = ['Easy', 'Medium', 'Hard'];
const operatingSystems = ['Windows', 'Linux', 'macOS'];
const environments = ['On-Premise', 'Cloud', 'Hybrid'];

const loadingMessages = [
  'Briefing the attack planner agent…',
  'Mapping techniques to MITRE ATT&CK…',
  'Building the network topology…',
  'Handing off to the SOC analyst…',
  'Scoring severity and priority…',
];

export function GenerateAttack() {
  const navigate = useNavigate();
  const [form, setForm] = useState<GenerateAttackRequest>({
    name: '',
    industry: 'Finance',
    attack_type: 'Ransomware',
    difficulty: 'Medium',
    operating_system: 'Windows',
    environment: 'On-Premise',
    custom_scenario: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [messageIdx, setMessageIdx] = useState(0);

  const update = (patch: Partial<GenerateAttackRequest>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Give this scenario a name.');
      return;
    }
    setError('');
    setSubmitting(true);
    const interval = setInterval(() => {
      setMessageIdx((i) => (i + 1) % loadingMessages.length);
    }, 2200);

    try {
      const payload = { ...form, custom_scenario: form.custom_scenario?.trim() || undefined };
      const result = await api.generateAttack(payload);
      navigate(`/attacks/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate attack');
    } finally {
      clearInterval(interval);
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Generate Attack" subtitle="Configure a scenario for the AI to simulate and analyze">
      <div className="max-w-2xl mx-auto">
        <Card padding="lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Field label="Scenario name" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="e.g. Q3 Ransomware Tabletop"
                className={inputClasses}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Industry">
                <Select value={form.industry} onChange={(v) => update({ industry: v })} options={industries} />
              </Field>
              <Field label="Attack type">
                <Select value={form.attack_type} onChange={(v) => update({ attack_type: v })} options={attackTypes} />
              </Field>
              <Field label="Difficulty">
                <Select value={form.difficulty} onChange={(v) => update({ difficulty: v })} options={difficulties} />
              </Field>
              <Field label="Operating system">
                <Select
                  value={form.operating_system}
                  onChange={(v) => update({ operating_system: v })}
                  options={operatingSystems}
                />
              </Field>
              <Field label="Environment" className="col-span-2">
                <Select value={form.environment} onChange={(v) => update({ environment: v })} options={environments} />
              </Field>
            </div>

            <Field label="Custom scenario (optional)" hint="Describe a specific situation - the AI will still build a full MITRE-mapped scenario, steered by your description.">
              <textarea
                value={form.custom_scenario}
                onChange={(e) => update({ custom_scenario: e.target.value })}
                rows={4}
                placeholder="e.g. A disgruntled contractor with VPN access exfiltrates customer records before their contract ends…"
                className={`${inputClasses} resize-none`}
              />
            </Field>

            {error && <ErrorBanner message={error} />}

            <Button type="submit" size="lg" loading={submitting} className="mt-1">
              {submitting ? loadingMessages[messageIdx] : 'Generate Attack Scenario'}
            </Button>

            {submitting && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-center text-[var(--text-muted)]"
              >
                This calls Groq/Gemini live and usually takes 15-45 seconds.
              </motion.p>
            )}
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

const inputClasses =
  'w-full bg-[var(--bg-surface-raised)] border border-[var(--border-strong)] rounded-2xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-[var(--accent-violet)]';

function Field({
  label,
  required,
  hint,
  className = '',
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[var(--text-muted)] mt-1.5">{hint}</p>}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClasses} appearance-none pr-9 cursor-pointer`}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </div>
  );
}
