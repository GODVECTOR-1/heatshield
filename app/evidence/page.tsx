import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import EvidenceReportView from '@/components/evidence/EvidenceReportView';
import type { EpochMs, EvidenceReport } from '@/lib/types';

function readEvidenceReport(): EvidenceReport {
  const publishedPath = path.join(process.cwd(), 'public', 'evidence.json');
  const reportPath = existsSync(publishedPath)
    ? publishedPath
    : path.join(process.cwd(), 'mocks', 'evidence', 'report.json');
  return JSON.parse(readFileSync(reportPath, 'utf8')) as EvidenceReport;
}

function formatDate(ms: EpochMs): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Dubai',
  }).format(ms);
}

export default function EvidencePage() {
  return <EvidenceReportView report={readEvidenceReport()} formatDate={formatDate} />;
}
