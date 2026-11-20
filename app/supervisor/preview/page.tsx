import type { BoardView } from '@/lib/types';
import type { TimelineData } from '@/components/board/types';
import BoardPreview from '@/components/board/BoardPreview';
import firstPoll from '@/mocks/board/view-first-poll-empty.json';
import live from '@/mocks/board/view-live.json';
import offline from '@/mocks/board/view-offline.json';
import replay from '@/mocks/board/view-replay.json';
import invalid from '@/mocks/board/view-session-invalid.json';
import replayTimeline from '@/mocks/board/timeline-replay.json';

// Direct links: /supervisor/preview?view=offline
export default async function SupervisorPreviewPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const views: Record<string, BoardView> = {
    'first-poll-empty': firstPoll as unknown as BoardView,
    live: live as unknown as BoardView,
    offline: offline as unknown as BoardView,
    replay: replay as unknown as BoardView,
    'session-invalid': invalid as unknown as BoardView,
  };
  return <BoardPreview views={views} initialName={view && view in views ? view : undefined} timeline={replayTimeline as unknown as TimelineData} />;
}
