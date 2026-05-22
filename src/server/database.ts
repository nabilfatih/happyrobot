import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { Schema } from "effect";
import { readDatabasePath } from "@/domain/config";
import {
  CachedCarrier,
  type CachedCarrier as CachedCarrierType,
  type CallIngestRequest,
  CallRecord,
  OfferEvent,
  type OfferEventInput,
  OfferInput,
} from "@/domain/schemas";

const CachedCarrierRow = Schema.Struct({
  mc_number: Schema.String,
  eligible: Schema.Number,
  legal_name: Schema.NullOr(Schema.String),
  dba_name: Schema.NullOr(Schema.String),
  dot_number: Schema.NullOr(Schema.String),
  allow_to_operate: Schema.String,
  out_of_service: Schema.String,
  checked_at: Schema.String,
});

const CallRow = Schema.Struct({
  id: Schema.String,
  created_at: Schema.String,
  mc_number: Schema.String,
  carrier_name: Schema.NullOr(Schema.String),
  load_id: Schema.NullOr(Schema.String),
  loadboard_rate: Schema.NullOr(Schema.Number),
  agreed_rate: Schema.NullOr(Schema.Number),
  outcome: Schema.String,
  sentiment: Schema.String,
  negotiation_turns: Schema.Number,
  transfer_mocked: Schema.Number,
  summary: Schema.String,
  offers_json: Schema.String,
});

const OfferEventRow = Schema.Struct({
  id: Schema.String,
  created_at: Schema.String,
  mc_number: Schema.String,
  load_id: Schema.String,
  proposed_rate: Schema.Number,
  turn: Schema.Number,
  decision: Schema.String,
  counter_rate: Schema.NullOr(Schema.Number),
  accepted_rate: Schema.NullOr(Schema.Number),
});

let database: Database.Database | undefined;

/** Opens the SQLite database and applies idempotent migrations. */
export function getDatabase() {
  if (database) {
    return database;
  }

  const databasePath = readDatabasePath();
  mkdirSync(dirname(databasePath), { recursive: true });

  database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.exec(`
    create table if not exists fmcsa_cache (
      mc_number text primary key,
      eligible integer not null,
      legal_name text,
      dba_name text,
      dot_number text,
      allow_to_operate text not null,
      out_of_service text not null,
      checked_at text not null
    );

    create table if not exists calls (
      id text primary key,
      created_at text not null,
      mc_number text not null,
      carrier_name text,
      load_id text,
      loadboard_rate real,
      agreed_rate real,
      outcome text not null,
      sentiment text not null,
      negotiation_turns integer not null,
      transfer_mocked integer not null,
      summary text not null,
      offers_json text not null
    );

    create table if not exists offer_events (
      id text primary key,
      created_at text not null,
      mc_number text not null,
      load_id text not null,
      proposed_rate real not null,
      turn integer not null,
      decision text not null,
      counter_rate real,
      accepted_rate real
    );
  `);

  return database;
}

/** Closes the SQLite connection for test teardown and process cleanup. */
export function closeDatabase() {
  database?.close();
  database = undefined;
}

/** Reads a cached FMCSA carrier by normalized MC number. */
export function findCachedCarrier(mcNumber: string) {
  const row = getDatabase()
    .prepare("select * from fmcsa_cache where mc_number = ?")
    .get(mcNumber);

  if (!row) {
    return undefined;
  }

  return carrierFromRow(Schema.decodeUnknownSync(CachedCarrierRow)(row));
}

/** Upserts a normalized FMCSA carrier cache entry. */
export function saveCachedCarrier(carrier: CachedCarrierType) {
  getDatabase()
    .prepare(`
      insert into fmcsa_cache (
        mc_number,
        eligible,
        legal_name,
        dba_name,
        dot_number,
        allow_to_operate,
        out_of_service,
        checked_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(mc_number) do update set
        eligible = excluded.eligible,
        legal_name = excluded.legal_name,
        dba_name = excluded.dba_name,
        dot_number = excluded.dot_number,
        allow_to_operate = excluded.allow_to_operate,
        out_of_service = excluded.out_of_service,
        checked_at = excluded.checked_at
    `)
    .run(
      carrier.mcNumber,
      carrier.eligible ? 1 : 0,
      carrier.legalName ?? null,
      carrier.dbaName ?? null,
      carrier.dotNumber ?? null,
      carrier.allowToOperate,
      carrier.outOfService,
      carrier.checkedAt,
    );
}

/** Stores the final HappyRobot call extraction payload. */
export function recordCall(input: CallIngestRequest) {
  const call = Schema.decodeUnknownSync(CallRecord)({
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    offers: input.offers ?? [],
  });

  getDatabase()
    .prepare(`
      insert into calls (
        id,
        created_at,
        mc_number,
        carrier_name,
        load_id,
        loadboard_rate,
        agreed_rate,
        outcome,
        sentiment,
        negotiation_turns,
        transfer_mocked,
        summary,
        offers_json
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      call.id,
      call.createdAt,
      call.mcNumber,
      call.carrierName ?? null,
      call.loadId ?? null,
      call.loadboardRate ?? null,
      call.agreedRate ?? null,
      call.outcome,
      call.sentiment,
      call.negotiationTurns,
      call.transferMocked ? 1 : 0,
      call.summary,
      JSON.stringify(call.offers),
    );

  return call;
}

/** Stores one negotiated offer event for dashboard metrics and auditability. */
export function recordOfferEvent(input: OfferEventInput) {
  const event = Schema.decodeUnknownSync(OfferEvent)({
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });

  getDatabase()
    .prepare(`
      insert into offer_events (
        id,
        created_at,
        mc_number,
        load_id,
        proposed_rate,
        turn,
        decision,
        counter_rate,
        accepted_rate
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      event.id,
      event.createdAt,
      event.mcNumber,
      event.loadId,
      event.proposedRate,
      event.turn,
      event.decision,
      event.counterRate ?? null,
      event.acceptedRate ?? null,
    );

  return event;
}

/** Reads recent calls in reverse chronological order. */
export function readRecentCalls() {
  const rows = getDatabase()
    .prepare("select * from calls order by created_at desc limit 100")
    .all();

  return Schema.decodeUnknownSync(Schema.Array(CallRow))(rows).map(callFromRow);
}

/** Reads recent offer events in reverse chronological order. */
export function readRecentOfferEvents() {
  const rows = getDatabase()
    .prepare("select * from offer_events order by created_at desc limit 100")
    .all();

  return Schema.decodeUnknownSync(Schema.Array(OfferEventRow))(rows).map(
    offerEventFromRow,
  );
}

function callFromRow(row: Schema.Schema.Type<typeof CallRow>) {
  return Schema.decodeUnknownSync(CallRecord)({
    id: row.id,
    createdAt: row.created_at,
    mcNumber: row.mc_number,
    carrierName: row.carrier_name ?? undefined,
    loadId: row.load_id ?? undefined,
    loadboardRate: row.loadboard_rate ?? undefined,
    agreedRate: row.agreed_rate ?? undefined,
    outcome: row.outcome,
    sentiment: row.sentiment,
    negotiationTurns: row.negotiation_turns,
    transferMocked: Boolean(row.transfer_mocked),
    summary: row.summary,
    offers: Schema.decodeUnknownSync(Schema.Array(OfferInput))(
      JSON.parse(row.offers_json),
    ),
  });
}

function carrierFromRow(row: Schema.Schema.Type<typeof CachedCarrierRow>) {
  return Schema.decodeUnknownSync(CachedCarrier)({
    mcNumber: row.mc_number,
    eligible: Boolean(row.eligible),
    legalName: row.legal_name ?? undefined,
    dbaName: row.dba_name ?? undefined,
    dotNumber: row.dot_number ?? undefined,
    allowToOperate: row.allow_to_operate,
    outOfService: row.out_of_service,
    checkedAt: row.checked_at,
  });
}

function offerEventFromRow(row: Schema.Schema.Type<typeof OfferEventRow>) {
  return Schema.decodeUnknownSync(OfferEvent)({
    id: row.id,
    createdAt: row.created_at,
    mcNumber: row.mc_number,
    loadId: row.load_id,
    proposedRate: row.proposed_rate,
    turn: row.turn,
    decision: row.decision,
    counterRate: row.counter_rate ?? undefined,
    acceptedRate: row.accepted_rate ?? undefined,
  });
}
