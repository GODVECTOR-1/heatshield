import type { Metadata } from 'next';
import WorkerJoin from '@/components/demo/WorkerJoin';

export const metadata: Metadata = { title: 'HeatShield · Worker' };

export default function WorkerPage() {
  return <WorkerJoin />;
}
