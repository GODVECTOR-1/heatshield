import type { Metadata } from 'next';
import DemoClient from '@/components/demo/DemoClient';

export const metadata: Metadata = { title: 'HeatShield · Supervisor' };

export default function SupervisorPage() {
  return <DemoClient layout="board" />;
}
