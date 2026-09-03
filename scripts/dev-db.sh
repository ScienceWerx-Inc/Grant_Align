#!/usr/bin/env bash
#
# Local database stack: Postgres on 5432, optionally with a pgagroal pool in
# front on 5433.
#
#   ./scripts/dev-db.sh start | stop | status | reset
#   ./scripts/dev-db.sh start --pool     # also bring up pgagroal
#
# The pool is OPT-IN, and off by default. pgagroal 2.2.0 on macOS stops
# answering entirely the moment Prisma opens its normal burst of concurrent
# connections - the log shows only "read error errno=54" and every later
# connection hangs. Raising max_connections, raising the per-database MAX_SIZE
# and pinning Prisma's connection_limit all failed to prevent it; the same
# workload against Postgres directly is stable. Since a local Postgres handles
# a single developer's connections without help, and the deployed app pools
# through Supabase rather than pgagroal, the pool buys nothing here that is
# worth an unexplained hang mid-demo.
#
# Kept because it does work for sequential clients (psql, the seed script) and
# is expected to behave on Linux, where pgagroal is a first-class platform.
#
# The data directory lives under .devdb/ (gitignored), so this never touches a
# system-wide Postgres you may be running for something else.
#
set -euo pipefail

PG_BIN="${PG_BIN:-/usr/local/opt/postgresql@16/bin}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGDATA="$ROOT/.devdb/pgdata"
LOG="$ROOT/.devdb/postgres.log"
POOL_PID="/tmp/pgagroal-grantalign.pid"
DB_NAME="grantalign"
PG_PORT=5432
POOL_PORT=5433

export PATH="$PG_BIN:$PATH"

have_pool() { command -v pgagroal >/dev/null 2>&1; }

# `pgagroal-cli ping` exits 0 even when it cannot reach the daemon, so its exit
# status is useless here. pgagroal speaks the Postgres wire protocol, so
# pg_isready against the pool port is both simpler and actually accurate.
pool_running() {
  pg_isready -q -h 127.0.0.1 -p "$POOL_PORT" 2>/dev/null
}

start() {
  if [ ! -d "$PGDATA" ]; then
    echo "Initializing Postgres in $PGDATA"
    mkdir -p "$(dirname "$PGDATA")"
    initdb -D "$PGDATA" -U postgres --auth=trust >/dev/null
  fi

  if pg_isready -q -p "$PG_PORT" -h 127.0.0.1; then
    echo "Postgres already accepting connections on $PG_PORT"
  else
    pg_ctl -D "$PGDATA" -o "-p $PG_PORT -k /tmp" -l "$LOG" start >/dev/null
    for _ in $(seq 1 20); do
      pg_isready -q -p "$PG_PORT" -h 127.0.0.1 && break
      sleep 0.5
    done
    echo "Postgres started on $PG_PORT"
  fi

  createdb -p "$PG_PORT" -h 127.0.0.1 -U postgres "$DB_NAME" 2>/dev/null \
    && echo "Created database $DB_NAME" \
    || echo "Database $DB_NAME already exists"


  if [ "${WITH_POOL:-0}" = "1" ]; then
    start_pool
  else
    echo "Point DATABASE_URL at 127.0.0.1:$PG_PORT (pass --pool to also run pgagroal)."
  fi
}

start_pool() {
  if ! have_pool; then
    echo "pgagroal not found - skipping the pool."
    return
  fi
  if pool_running; then
    echo "pgagroal already running on $POOL_PORT"
    return
  fi
  pgagroal -d \
    -c "$ROOT/pgagroal/pgagroal.conf" \
    -a "$ROOT/pgagroal/pgagroal_hba.conf" \
    -l "$ROOT/pgagroal/pgagroal_databases.conf"
  sleep 1
  echo "pgagroal pooling $DB_NAME on $POOL_PORT"
  echo "NOTE: point DATABASE_URL at $POOL_PORT, and see the header of this"
  echo "      script for the macOS stability caveat."
}

stop() {
  # Remote management is disabled, so the CLI cannot shut the pool down, and
  # pgagroal rewrites its process title so pattern-matching the command line
  # misses it. The pid file it writes is the only dependable handle, and it
  # also guarantees we never kill another project's pool.
  if [ -f "$POOL_PID" ]; then
    kill "$(cat "$POOL_PID")" 2>/dev/null || true
    rm -f "$POOL_PID"
    echo "pgagroal stopped"
  fi
  if [ -d "$PGDATA" ] && pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
    pg_ctl -D "$PGDATA" stop >/dev/null
    echo "Postgres stopped"
  fi
}

status() {
  pg_isready -p "$PG_PORT" -h 127.0.0.1 || true
  if have_pool; then
    pool_running \
      && echo "pgagroal: pooling $DB_NAME on $POOL_PORT" \
      || echo "pgagroal: not running"
  fi
}

# Drops the whole local cluster. Only ever touches .devdb/.
reset() {
  stop
  rm -rf "$ROOT/.devdb"
  echo "Local database removed. Run 'start' to recreate it."
}

for arg in "$@"; do
  [ "$arg" = "--pool" ] && WITH_POOL=1
done

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  reset) reset ;;
  *) echo "usage: $0 {start|stop|status|reset}" >&2; exit 1 ;;
esac
