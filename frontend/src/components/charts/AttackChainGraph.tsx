import { motion } from 'framer-motion';
import type { AttackStage } from '../../lib/types';

/**
 * Signature visualization: nodes representing each attack stage, connected
 * left to right along the kill chain, with a traveling pulse animation that
 * loops through the sequence - a direct visualization of MITRE stage
 * progression rather than a decorative flourish.
 */
export function AttackChainGraph({ stages }: { stages: AttackStage[] }) {
  if (!stages || stages.length === 0) return null;

  const nodeCount = stages.length;
  const width = Math.max(nodeCount * 160, 480);
  const height = 140;
  const y = height / 2;
  const spacing = width / (nodeCount + 1);
  const positions = stages.map((_, i) => spacing * (i + 1));

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="min-w-full">
        <defs>
          <linearGradient id="chain-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent-violet)" stopOpacity="0.15" />
            <stop offset="50%" stopColor="var(--accent-violet)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--accent-pink)" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* Connecting line */}
        <line x1={positions[0]} y1={y} x2={positions[positions.length - 1]} y2={y} stroke="url(#chain-line)" strokeWidth={2} />

        {/* Traveling pulse along the chain */}
        <motion.circle
          r={4}
          fill="var(--accent-pink)"
          initial={{ cx: positions[0], cy: y, opacity: 0 }}
          animate={{
            cx: positions,
            cy: y,
            opacity: [0, 1, 1, 0],
          }}
          transition={{ duration: nodeCount * 1.1, repeat: Infinity, ease: 'easeInOut' }}
          style={{ filter: 'drop-shadow(0 0 6px var(--accent-pink))' }}
        />

        {stages.map((stage, i) => (
          <g key={i}>
            <motion.circle
              cx={positions[i]}
              cy={y}
              r={20}
              fill="var(--bg-surface)"
              stroke="var(--accent-violet)"
              strokeWidth={1.5}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            />
            <text
              x={positions[i]}
              y={y + 5}
              textAnchor="middle"
              fontSize="13"
              fontFamily="var(--font-mono)"
              fill="var(--text-secondary)"
              fontWeight={600}
            >
              {i + 1}
            </text>
            <text
              x={positions[i]}
              y={y + 42}
              textAnchor="middle"
              fontSize="11"
              fontFamily="var(--font-sans)"
              fill="var(--text-muted)"
            >
              {truncate(stage.stage, 16)}
            </text>
            <text
              x={positions[i]}
              y={y - 34}
              textAnchor="middle"
              fontSize="10"
              fontFamily="var(--font-mono)"
              fill="var(--accent-violet)"
              opacity={0.9}
            >
              {stage.mitre_technique}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function truncate(s: string, n: number) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
