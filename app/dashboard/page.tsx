import { EventCalendar } from '@/app/(main)/event-calendar/event-calendar';
import { client } from '@/server/client';
import { cookies } from 'next/headers';
import { SearchParams } from 'nuqs';
import { searchParamsCache } from '@/lib/searchParams';
import { CalendarViewType } from '@/types/event';
import { Suspense } from 'react';
import { ModeToggle } from '@/components/ui/mode-toggel';
import { LogoutButton } from '@/components/ui/logout-button';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface DemoPageProps {
  searchParams: Promise<SearchParams>;
}

export default async function DemoPage(props: DemoPageProps) {
  const searchParams = await props.searchParams;
  const search = searchParamsCache.parse(searchParams);

  const cookieStore = await cookies();
  const query = {
    date: search.date.toISOString(),
    view: search.view as CalendarViewType,
    daysCount: search.daysCount ? String(search.daysCount) : '7',
    categories: search.categories,
    title: search.title,
    colors: search.colors,
    locations: search.locations,
    isRepeating: search.isRepeating ? String(search.isRepeating) : undefined,
    repeatingTypes: search.repeatingTypes,
  };

  const response = await client.api.events.$get(
    { query },
    {
      headers: {
        Cookie: cookieStore.toString(),
      },
    }
  );

  let events: any[] = [];
  if (response.ok) {
    const data = await response.json();
    if (data.success) {
      events = data.events.map((event: any) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
      }));
    }
  }
  const session = await auth.api.getSession({
    headers: await headers(), // needs to be awaited in Next.js 15+
  });
  const user = session?.user;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/95 sticky top-0 z-50 border-b backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between">

          {/* Left side */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight">
              {user?.name}
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <ModeToggle />
            <LogoutButton />
          </div>

        </div>
      </header>

      <main className="flex-1 py-6">
        <div className="container mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Event Calendar</h1>
            <p className="text-muted-foreground mt-2">
              you can add the events and manage them.
            </p>
          </div>

          <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
            <Suspense
              fallback={
                <div className="flex h-[700px] items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
                    <p className="text-muted-foreground text-sm">
                      Loading calendar...
                    </p>
                  </div>
                </div>
              }
            >
              <EventCalendar
                events={events}
                initialDate={search.date}
              />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
