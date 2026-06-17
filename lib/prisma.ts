import { Prisma, PrismaClient } from "@prisma/client";

const buildDatabaseUrl = () => {
  const rawUrl = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);

    // Supabase requires TLS in most setups.
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }

    // Prisma + PgBouncer is most stable with a single connection.
    if (
      url.searchParams.get("pgbouncer") === "true" &&
      !url.searchParams.has("connection_limit")
    ) {
      url.searchParams.set("connection_limit", "1");
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
};

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
    log:
      process.env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "stdout", level: "error" },
            { emit: "stdout", level: "warn" },
          ]
        : ["error"],
  });
};

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV === "development") {
  let queryCount = 0;
  const prismaWithQueryEvents = prisma as PrismaClient<
    Prisma.PrismaClientOptions,
    "query"
  >;
  prismaWithQueryEvents.$on("query", (event) => {
    queryCount += 1;
    if (event.duration > 100) {
      console.warn(
        `[prisma] slow query #${queryCount} ${event.duration}ms ${event.query}`
      );
    }
  });
}

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
