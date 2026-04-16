import Link from "next/link";

export default function WhyYudokuPage() {
  return (
    <div className="min-h-screen bg-black text-neutral-200">
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-white">
          Why Yudoku
        </h1>

        <div className="mt-10 text-[15px] leading-7 space-y-8">
          <section className="space-y-4">
            <p>
              Yudoku exists because most learning tools are designed to keep you
              watching, not finishing.
            </p>

            <p>
              They reward attention, not progress. They make starting easy and
              finishing optional.
            </p>

            <p>
              Yudoku is built for the opposite goal.
            </p>
          </section>

          <div className="h-px bg-white/10" />

          <section className="space-y-4">
            <p>Most platforms optimize for engagement.</p>
            <p>More recommendations. More distractions. More noise.</p>

            <p>Yudoku optimizes for completion.</p>

            <ul className="list-disc pl-5 space-y-1">
              <li>No algorithmic feed</li>
              <li>No endless recommendations</li>
              <li>One active course at a time</li>
              <li>Clear progress and a visible finish</li>
            </ul>

            <p>
              The goal isn’t discovery.
              <br />
              The goal is to actually finish what you started.
            </p>
          </section>

          <div className="h-px bg-white/10" />

          <section className="space-y-4">
            <p>
              Yudoku is intentionally quiet.
            </p>

            <p>
              The interface is designed to get out of your way — no feeds, no
              visual noise, no constant decisions.
            </p>

            <p>
              The UI fades into the background so the work can stay in focus.
              You’re not meant to think about the app. You’re meant to finish the
              thing you came to learn.
            </p>
          </section>

          <div className="h-px bg-white/10" />

          <section className="space-y-4">
            <p>
              Yudoku is built by a single developer who got tired of half-finished
              playlists and tools that confuse motion with progress.
            </p>

            <p>
              It’s for people who want fewer tools, fewer tabs, and fewer
              decisions — and more things actually done.
            </p>
          </section>

          <div className="h-px bg-white/10" />

          <section className="space-y-4">
            <p>You can find more of my work here:</p>

            <p>
              <Link
                href="https://jerkeyray.com"
                target="_blank"
                className="underline underline-offset-4 hover:text-white"
              >
                jerkeyray.com
              </Link>
            </p>
          </section>

          <div className="h-px bg-white/10" />

          <section className="space-y-4">
            <p>
              If Yudoku helped you finish something you would’ve otherwise
              dropped, you can support its development here:
            </p>

            <p>
              <Link
                href="https://buymeacoffee.com/jerkeyray"
                target="_blank"
                className="underline underline-offset-4 hover:text-white"
              >
                buy me a coffee
              </Link>
            </p>
          </section>

          <p className="pt-6 text-xs text-neutral-500">
            Built to reduce noise. Not add to it.
          </p>
        </div>
      </div>
    </div>
  );
}
