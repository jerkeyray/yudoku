# Contributing to Yudoku

Contributions are welcome. Bug fixes, new features, docs improvements, whatever.

## What you'll need

- [Bun](https://bun.sh/)
- [PostgreSQL](https://www.postgresql.org/)
- [Git](https://git-scm.com/)
- A [Google API key](https://console.cloud.google.com/) with YouTube Data API v3 enabled
- A Google OAuth app for sign-in

## Getting it running

1. **Fork & clone**

   ```bash
   git clone https://github.com/<your-username>/yudoku.git
   cd yudoku
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up your `.env`**

   ```env
   DATABASE_URL=           # PostgreSQL connection string (pooled)
   DIRECT_URL=             # PostgreSQL direct connection string
   AUTH_SECRET=             # Random secret - run `openssl rand -base64 32`
   AUTH_GOOGLE_ID=          # Google OAuth client ID
   AUTH_GOOGLE_SECRET=      # Google OAuth client secret
   YOUTUBE_API_KEY=         # YouTube Data API v3 key
   ```

4. **Set up the database**

   ```bash
   bunx prisma migrate dev
   bunx prisma generate
   ```

5. **Start the dev server**

   ```bash
   bun dev
   ```

## Project structure

```
yudoku/
├── app/                  # Next.js App Router
│   ├── api/              # API routes
│   ├── auth/             # Auth pages
│   ├── home/             # Main app pages
│   │   └── courses/      # Course pages and video player
│   └── components/       # Page-specific components
├── components/           # Shared components
│   └── ui/               # shadcn/ui primitives
├── lib/                  # Utilities and helpers
├── prisma/               # DB schema and migrations
├── public/               # Static files
└── types/                # TypeScript types
```

## How we work

1. **Branch off `main`**

   ```bash
   git checkout -b feat/your-feature
   git checkout -b fix/the-bug
   ```

2. **Lint before you commit**

   ```bash
   bun lint
   ```

3. **Commit messages** follow conventional commits:

   ```bash
   git commit -m "feat: add course search"
   git commit -m "fix: video not pausing on tab switch"
   ```

   Prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `style:`

## Code guidelines

- **TypeScript** - type your stuff, avoid `any`
- **Tailwind** - use shadcn/ui components as a base
- **React 19 + App Router** - server components by default, client when needed
- **TanStack React Query** - for client-side data fetching
- **Prisma** - schema in `prisma/schema.prisma`, run `bunx prisma migrate dev --name your_migration` for changes
- **Zod** - validate external inputs

## Pull requests

1. Push your branch and open a PR against `main`
2. Include what you changed and why
3. Screenshots for UI changes
4. Link related issues (e.g., "Closes #12")

## Issues

[Open an issue](../../issues/new) for bugs or feature requests. For bugs, include steps to reproduce and expected vs actual behavior.

## Be cool

Be respectful. Don't be the person who makes it less fun for everyone else.
