/**
 * Game Service
 * 
 * Handles core game actions: meditation, breakthrough, combat.
 * Integrates with qi-system, fatigue-system, and meditation-interruption.
 * Pure TypeScript class - stateless, all data in database.
 */

import { db } from '@/lib/db';
import type { Character, Location, WorldTime, MeditationResult, BreakthroughResult } from '@/types/game';
import {
  performMeditation,
  attemptBreakthrough,
} from '@/lib/game/qi-system';
import {
  calculateFatigueFromAction,
  type ActionType,
} from '@/lib/game/fatigue-system';
import {
  checkMeditationInterruption,
  generateInterruptionPrompt,
  getLocationDangerLevel,
  type InterruptionEvent,
} from '@/lib/game/meditation-interruption';
import { CharacterService, type CharacterWithRelations } from './character.service';
import { SessionService } from './session.service';
import { WorldService } from './world.service';
import { Prisma } from '@prisma/client';

// Result types
export interface MeditationActionResult {
  success: boolean;
  result?: MeditationResult;
  character?: CharacterWithRelations;
  interruption?: {
    event: InterruptionEvent;
    options: Array<{ id: string; label: string; risk: string }>;
    checkHour: number;
    finalChance: number;
  };
  timeAdvance: number; // minutes
  response?: {
    type: string;
    content: string;
    characterState: Record<string, unknown>;
  };
  error?: string;
}

export interface BreakthroughActionResult {
  success: boolean;
  result?: BreakthroughResult & { newCoreCapacity: number };
  character?: CharacterWithRelations;
  timeAdvance: number;
  response?: {
    type: string;
    content: string;
    characterState: Record<string, unknown>;
  };
  error?: string;
}

export interface CombatActionResult {
  success: boolean;
  character?: CharacterWithRelations;
  timeAdvance: number;
  fatigueResult?: {
    physicalFatigue: number;
    mentalFatigue: number;
    warnings: string[];
    canPerform: boolean;
  };
  error?: string;
}

/**
 * Game Service Class
 */
export class GameService {
  /**
   * Process meditation action
   * Handles accumulation, interruption checks, and state updates
   */
  static async processMeditation(
    character: Character,
    location: Location | null,
    worldTime: WorldTime | null,
    durationMinutes: number,
    meditationType: 'accumulation' | 'breakthrough' = 'accumulation'
  ): Promise<MeditationActionResult> {
    try {
      // Check for interruption based on location and character
      const interruptionCheck = checkMeditationInterruption(
        character,
        location,
        worldTime,
        durationMinutes
      );

      // If interrupted
      if (interruptionCheck.interrupted && interruptionCheck.event) {
        const event = interruptionCheck.event;
        const interruptedMinutes = interruptionCheck.checkHour * 60;

        // Calculate partial Qi for time before interruption
        const partialResult = performMeditation(
          character,
          location,
          interruptedMinutes,
          meditationType
        );

        // Update character state
        const mechanicsUpdate: Record<string, unknown> = {
          currentQi: character.currentQi + partialResult.qiGained,
          fatigue: Math.max(0, character.fatigue - partialResult.fatigueGained.physical),
          mentalFatigue: Math.max(0, (character.mentalFatigue || 0) - partialResult.fatigueGained.mental),
        };

        await db.character.update({
          where: { id: character.id },
          data: { ...mechanicsUpdate, updatedAt: new Date() },
        });

        // Build options for player
        const options: Array<{ id: string; label: string; risk: string }> = [];
        if (event.canIgnore) {
          options.push({ id: 'ignore', label: 'Проигнорировать', risk: 'низкий' });
        }
        options.push({ id: 'confront', label: 'Встать и встретить', risk: 'средний' });
        if (event.canHide) {
          options.push({ id: 'hide', label: 'Скрыться', risk: 'низкий' });
        }

        // Build response
        const eventTypeEmoji = this.getEventEmoji(event.type);
        const responseContent = `⚠️ **Медитация прервана!** (${interruptionCheck.checkHour} час)\n\n` +
          `🎯 **${eventTypeEmoji} ${event.description}**\n\n` +
          `📊 Шанс прерывания: ${Math.round(interruptionCheck.finalChance * 100)}%\n` +
          `⚡ Накоплено до прерывания: +${partialResult.qiGained} Ци\n\n` +
          `**Действия:**\n` +
          options.map((o, i) => `${i + 1}. ${o.label} (риск: ${o.risk})`).join('\n');

        // Get updated character
        const updatedCharacter = await db.character.findUnique({
          where: { id: character.id },
          include: { currentLocation: true, sect: true },
        });

        return {
          success: true,
          result: partialResult,
          character: updatedCharacter as CharacterWithRelations,
          interruption: {
            event,
            options,
            checkHour: interruptionCheck.checkHour,
            finalChance: interruptionCheck.finalChance,
          },
          timeAdvance: interruptedMinutes,
          response: {
            type: 'interruption',
            content: responseContent,
            characterState: mechanicsUpdate,
          },
        };
      }

      // Normal meditation (no interruption)
      const result = performMeditation(character, location, durationMinutes, meditationType);

      if (!result.success) {
        return {
          success: false,
          result,
          timeAdvance: 0,
          error: result.interruptionReason,
        };
      }

      // Calculate character updates
      const mechanicsUpdate: Record<string, unknown> = {
        fatigue: Math.max(0, character.fatigue - result.fatigueGained.physical),
        mentalFatigue: Math.max(0, (character.mentalFatigue || 0) - result.fatigueGained.mental),
      };

      if (result.coreWasFilled) {
        mechanicsUpdate.currentQi = character.coreCapacity;
        mechanicsUpdate.accumulatedQi = character.accumulatedQi + result.accumulatedQiGained;
      } else {
        mechanicsUpdate.currentQi = character.currentQi + result.qiGained;
      }

      // Update character
      await db.character.update({
        where: { id: character.id },
        data: { ...mechanicsUpdate, updatedAt: new Date() },
      });

      // Get updated character
      const updatedCharacter = await db.character.findUnique({
        where: { id: character.id },
        include: { currentLocation: true, sect: true },
      });

      // Build response content
      const breakdownText = result.breakdown
        ? `\n  • Ядро: +${result.breakdown.coreGeneration}\n  • Среда: +${result.breakdown.environmentalAbsorption}`
        : '';

      const locationDanger = getLocationDangerLevel(location);
      const safetyInfo = interruptionCheck.finalChance < 0.1
        ? '\n🛡️ Безопасное место для медитации.'
        : interruptionCheck.finalChance < 0.3
          ? '\n⚠️ Есть риск прерывания.'
          : '\n⚠️ Опасное место! Высокий риск прерывания.';

      let responseContent = '';
      if (result.coreWasFilled) {
        const newAccumulated = character.accumulatedQi + result.accumulatedQiGained;
        const currentFills = Math.floor(newAccumulated / character.coreCapacity);
        const requiredFills = character.cultivationLevel * 10 + character.cultivationSubLevel;
        const fillsNeeded = Math.max(0, requiredFills - currentFills);
        responseContent = `⚡ **Ядро заполнено!**\n\n📊 Прогресс: ${currentFills}/${requiredFills} заполнений\n🔄 Осталось: ${fillsNeeded}\n\n⚠️ **Потратьте Ци (техники, бой) чтобы продолжить!**${breakdownText}\n⏱️ Время: ${result.duration} мин.\n😌 Усталость снижена.${safetyInfo}`;
      } else {
        responseContent = `🧘 Медитация завершена.\n\n⚡ Накоплено Ци: +${result.qiGained}${breakdownText}\n  Ядро: ${character.currentQi + result.qiGained}/${character.coreCapacity}\n😌 Усталость снижена.\n⏱️ Время: ${result.duration} мин.${safetyInfo}`;
      }

      return {
        success: true,
        result,
        character: updatedCharacter as CharacterWithRelations,
        timeAdvance: result.duration,
        response: {
          type: 'narration',
          content: responseContent,
          characterState: mechanicsUpdate,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, timeAdvance: 0, error: `Failed to process meditation: ${message}` };
    }
  }

  /**
   * Process breakthrough attempt
   */
  static async processBreakthrough(
    character: Character
  ): Promise<BreakthroughActionResult> {
    try {
      const result = attemptBreakthrough(character);

      // Calculate character updates
      const mechanicsUpdate: Record<string, unknown> = {};

      if (result.success) {
        mechanicsUpdate.cultivationLevel = result.newLevel;
        mechanicsUpdate.cultivationSubLevel = result.newSubLevel;
        mechanicsUpdate.coreCapacity = result.newCoreCapacity;
        mechanicsUpdate.accumulatedQi = Math.max(0, character.accumulatedQi - result.qiConsumed);
        mechanicsUpdate.fatigue = Math.max(0, character.fatigue - result.fatigueGained.physical);
        mechanicsUpdate.mentalFatigue = Math.max(0, (character.mentalFatigue || 0) - result.fatigueGained.mental);
      }

      // Update character
      await db.character.update({
        where: { id: character.id },
        data: { ...mechanicsUpdate, updatedAt: new Date() },
      });

      // Get updated character
      const updatedCharacter = await db.character.findUnique({
        where: { id: character.id },
        include: { currentLocation: true, sect: true },
      });

      // Build response
      const responseContent = result.success
        ? `${result.message}\n\n💎 Ёмкость ядра: ${result.newCoreCapacity}\n⚡ Накопленная Ци: ${updatedCharacter?.accumulatedQi || 0}`
        : `❌ ${result.message}`;

      return {
        success: true,
        result,
        character: updatedCharacter as CharacterWithRelations,
        timeAdvance: 30, // Breakthrough takes 30 minutes
        response: {
          type: 'narration',
          content: responseContent,
          characterState: mechanicsUpdate,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, timeAdvance: 0, error: `Failed to process breakthrough: ${message}` };
    }
  }

  /**
   * Process combat action
   * Applies fatigue and updates character state
   */
  static async processCombat(
    character: Character,
    combatType: 'light' | 'heavy' = 'light',
    durationMinutes: number = 5
  ): Promise<CombatActionResult> {
    try {
      // Determine action type
      const actionType: ActionType = combatType === 'heavy' ? 'combat_heavy' : 'combat_light';

      // Calculate fatigue from combat
      const fatigueResult = calculateFatigueFromAction(character, actionType, durationMinutes);

      if (!fatigueResult.canPerform) {
        return {
          success: false,
          timeAdvance: 0,
          fatigueResult,
          error: fatigueResult.warnings.join('; '),
        };
      }

      // Update character with new fatigue levels
      const mechanicsUpdate = {
        fatigue: fatigueResult.physicalFatigue,
        mentalFatigue: fatigueResult.mentalFatigue,
      };

      await db.character.update({
        where: { id: character.id },
        data: { ...mechanicsUpdate, updatedAt: new Date() },
      });

      // Get updated character
      const updatedCharacter = await db.character.findUnique({
        where: { id: character.id },
        include: { currentLocation: true, sect: true },
      });

      return {
        success: true,
        character: updatedCharacter as CharacterWithRelations,
        timeAdvance: durationMinutes,
        fatigueResult,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, timeAdvance: 0, error: `Failed to process combat: ${message}` };
    }
  }

  /**
   * Process technique usage
   */
  static async processTechniqueUse(
    character: Character,
    qiCost: number,
    techniqueType: 'basic' | 'advanced' = 'basic',
    durationMinutes: number = 1
  ): Promise<{
    success: boolean;
    character?: CharacterWithRelations;
    timeAdvance: number;
    qiSpent: number;
    error?: string;
  }> {
    try {
      // Check if character has enough Qi
      if (character.currentQi < qiCost) {
        return {
          success: false,
          timeAdvance: 0,
          qiSpent: 0,
          error: 'Недостаточно Ци для техники',
        };
      }

      // Calculate fatigue from technique use
      const actionType: ActionType = techniqueType === 'advanced' ? 'technique_advanced' : 'technique_basic';
      const fatigueResult = calculateFatigueFromAction(character, actionType, durationMinutes, qiCost);

      if (!fatigueResult.canPerform) {
        return {
          success: false,
          timeAdvance: 0,
          qiSpent: 0,
          error: fatigueResult.warnings.join('; '),
        };
      }

      // Update character
      const mechanicsUpdate = {
        currentQi: character.currentQi - qiCost,
        fatigue: fatigueResult.physicalFatigue,
        mentalFatigue: fatigueResult.mentalFatigue,
      };

      await db.character.update({
        where: { id: character.id },
        data: { ...mechanicsUpdate, updatedAt: new Date() },
      });

      // Get updated character
      const updatedCharacter = await db.character.findUnique({
        where: { id: character.id },
        include: { currentLocation: true, sect: true },
      });

      return {
        success: true,
        character: updatedCharacter as CharacterWithRelations,
        timeAdvance: durationMinutes,
        qiSpent: qiCost,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, timeAdvance: 0, qiSpent: 0, error: `Failed to process technique: ${message}` };
    }
  }

  /**
   * Parse meditation request from user message
   */
  static parseMeditationRequest(message: string): {
    isMeditation: boolean;
    isBreakthrough: boolean;
    durationMinutes: number;
  } {
    const lowerMessage = message.toLowerCase();
    const isBreakthrough = /прорыв|breakthrough/.test(lowerMessage);
    const isMeditation = /медитир|медитац|meditat/i.test(lowerMessage) || isBreakthrough;

    // Parse duration
    let durationMinutes = 60; // Default 1 hour
    const meditationMatch = lowerMessage.match(/(\d+)\s*(час|минут)/);
    if (meditationMatch) {
      const value = parseInt(meditationMatch[1]);
      const unit = meditationMatch[2];
      durationMinutes = unit === 'час' ? value * 60 : value;
    }

    return {
      isMeditation,
      isBreakthrough,
      durationMinutes,
    };
  }

  /**
   * Get emoji for event type
   */
  private static getEventEmoji(eventType: InterruptionEvent['type']): string {
    switch (eventType) {
      case 'creature':
        return '🐺';
      case 'person':
        return '👤';
      case 'spirit':
        return '👻';
      case 'phenomenon':
        return '🌀';
      case 'rare':
        return '✨';
      default:
        return '❓';
    }
  }
}

// Export convenience functions for backward compatibility
export const processMeditation = GameService.processMeditation;
export const processBreakthrough = GameService.processBreakthrough;
export const processCombat = GameService.processCombat;
export const parseMeditationRequest = GameService.parseMeditationRequest;
