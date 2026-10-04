-- Run after cutover verification and archiving any outbox rows worth retaining.
REMOVE TABLE IF EXISTS outbox_event;
