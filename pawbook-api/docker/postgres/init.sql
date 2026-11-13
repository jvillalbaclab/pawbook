-- Extensiones que exige la arquitectura (§8): geoconsultas de PawMates y búsqueda difusa.
-- Los esquemas por módulo los crean las migraciones de drizzle-kit, no este script.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
