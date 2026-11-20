import type { Metadata } from 'next';
import DemoClient from '@/components/demo/DemoClient';

export const metadata: Metadata = { title: 'HeatShield · 15 July demo' };

export default function DemoPage() {
  return <DemoClient />;
}
