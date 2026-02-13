/**
 * Service Layer Exports
 * 
 * All services are pure TypeScript classes focused on single domains.
 * Services are stateless - all state is stored in the database.
 * 
 * Note: game-client.service is for client-side API calls
 */

// Server-side services (used in API routes)
export * from './character.service';
export * from './session.service';
export * from './world.service';
export * from './game.service';

// Client-side service (used in hooks/components)
export * from './game-client.service';
