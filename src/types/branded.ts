/**
 * Branded Types for Type-Safe IDs
 * 
 * Prevents mixing up different ID types at compile time.
 * Example: can't pass CharacterId where SessionId is expected.
 */

// ==================== BRAND UTILITY ====================

declare const brand: unique symbol;
type Brand<T, TBrand> = T & { [brand]: TBrand };

// ==================== BRANDED ID TYPES ====================

/** Session ID - identifies game sessions */
export type SessionId = Brand<string, 'SessionId'>;

/** Character ID - identifies player characters */
export type CharacterId = Brand<string, 'CharacterId'>;

/** Location ID - identifies world locations */
export type LocationId = Brand<string, 'LocationId'>;

/** Message ID - identifies chat messages */
export type MessageId = Brand<string, 'MessageId'>;

/** Sect ID - identifies cultivation sects */
export type SectId = Brand<string, 'SectId'>;

/** NPC ID - identifies non-player characters */
export type NPCId = Brand<string, 'NPCId'>;

// ==================== CREATION HELPERS ====================

/** Cast string to SessionId (use after validation) */
export const asSessionId = (s: string): SessionId => s as SessionId;

/** Cast string to CharacterId */
export const asCharacterId = (s: string): CharacterId => s as CharacterId;

/** Cast string to LocationId */
export const asLocationId = (s: string): LocationId => s as LocationId;

/** Cast string to MessageId */
export const asMessageId = (s: string): MessageId => s as MessageId;

/** Cast string to SectId */
export const asSectId = (s: string): SectId => s as SectId;

/** Cast string to NPCId */
export const asNPCId = (s: string): NPCId => s as NPCId;

// ==================== ZOD SCHEMAS ====================

import { z } from 'zod';

/** Zod schema for SessionId */
export const sessionIdSchema: z.ZodType<SessionId> = z.string().min(1) as z.ZodType<SessionId>;

/** Zod schema for CharacterId */
export const characterIdSchema: z.ZodType<CharacterId> = z.string().min(1) as z.ZodType<CharacterId>;

/** Zod schema for LocationId */
export const locationIdSchema: z.ZodType<LocationId> = z.string().min(1) as z.ZodType<LocationId>;

/** Zod schema for MessageId */
export const messageIdSchema: z.ZodType<MessageId> = z.string().min(1) as z.ZodType<MessageId>;

/** Zod schema for SectId */
export const sectIdSchema: z.ZodType<SectId> = z.string().min(1) as z.ZodType<SectId>;

/** Zod schema for NPCId */
export const npcIdSchema: z.ZodType<NPCId> = z.string().min(1) as z.ZodType<NPCId>;

// ==================== EXTRACTION ====================

/** Extract raw string from branded type */
export const extractId = <T extends string>(id: T): string => id;
