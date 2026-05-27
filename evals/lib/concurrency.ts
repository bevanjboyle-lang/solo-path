// evals/lib/concurrency.ts
//
// Simple semaphore + parallel runner. Up to N tasks in flight at once.

export class Semaphore {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly limit: number) {
    if (limit < 1) throw new Error("Semaphore limit must be >= 1");
  }

  async acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active++;
  }

  release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/**
 * Run `fn` against every item in `items` with at most `concurrency` in flight.
 * Returns results in the same order as `items`. Failures are surfaced as
 * rejected promises in the results array (use Promise.allSettled-style
 * handling at the call site).
 */
export async function runWithConcurrency<TIn, TOut>(
  items: TIn[],
  concurrency: number,
  fn: (item: TIn, index: number) => Promise<TOut>,
): Promise<Array<{ ok: true; value: TOut } | { ok: false; error: Error }>> {
  const sem = new Semaphore(concurrency);
  const results: Array<{ ok: true; value: TOut } | { ok: false; error: Error }> = new Array(items.length);

  await Promise.all(
    items.map((item, i) =>
      sem.run(async () => {
        try {
          const value = await fn(item, i);
          results[i] = { ok: true, value };
        } catch (e) {
          results[i] = { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
        }
      }),
    ),
  );

  return results;
}
