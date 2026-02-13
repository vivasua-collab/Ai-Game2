/**
 * Сервис медитации
 * Инкапсулирует бизнес-логику медитации и прорыва
 */

import type { Character, Location } from "@/types/game";
import type { ICharacterRepository } from "@/repositories/ICharacterRepository";
import {
  performMeditation,
  attemptBreakthrough,
} from "@/lib/game/qi-system";
import {
  checkMeditationInterruption,
  generateInterruptionPrompt,
  getLocationDangerLevel,
} from "@/lib/game/meditation-interruption";
import type { WorldTime } from "@/types/game";

export interface MeditationResult {
  success: boolean;
  content: string;
  characterState: Partial<Character>;
  timeAdvance: { minutes: number };
  wasInterrupted: boolean;
  interruption?: {
    event: unknown;
    options: Array<{ id: string; label: string; risk: string }>;
  };
}

export interface BreakthroughResult {
  success: boolean;
  content: string;
  characterState: Partial<Character>;
  timeAdvance: { minutes: number };
}

export class MeditationService {
  constructor(private characterRepo: ICharacterRepository) {}

  /**
   * Обработка медитации
   */
  async handleMeditation(
    character: Character,
    location: Location | null,
    worldTime: WorldTime,
    durationMinutes: number
  ): Promise<MeditationResult> {
    const meditationType = "accumulation" as const;

    // Проверка прерывания
    const interruptionCheck = checkMeditationInterruption(
      character,
      location,
      worldTime,
      durationMinutes
    );

    if (interruptionCheck.interrupted && interruptionCheck.event) {
      return this.handleInterruption(
        character,
        location,
        interruptionCheck,
        meditationType
      );
    }

    // Обычная медитация
    const result = performMeditation(
      character,
      location,
      durationMinutes,
      meditationType
    );

    if (!result.success) {
      return {
        success: false,
        content: result.interruptionReason || "Медитация не удалась",
        characterState: {},
        timeAdvance: { minutes: 0 },
        wasInterrupted: true,
      };
    }

    // Формируем состояние персонажа
    const characterState: Partial<Character> = {
      fatigue: Math.max(0, character.fatigue - result.fatigueGained.physical),
      mentalFatigue: Math.max(0, character.mentalFatigue - result.fatigueGained.mental),
    };

    if (result.coreWasFilled) {
      characterState.currentQi = character.coreCapacity;
      characterState.accumulatedQi = character.accumulatedQi + result.accumulatedQiGained;
    } else {
      characterState.currentQi = character.currentQi + result.qiGained;
    }

    // Обновляем персонажа в БД
    await this.characterRepo.update(character.id, characterState);

    // Формируем контент
    const content = this.formatMeditationContent(result, character, location, interruptionCheck.finalChance);

    return {
      success: true,
      content,
      characterState,
      timeAdvance: { minutes: result.duration },
      wasInterrupted: false,
    };
  }

  /**
   * Обработка прерывания медитации
   */
  private async handleInterruption(
    character: Character,
    location: Location | null,
    interruptionCheck: {
      event: unknown;
      checkHour: number;
      finalChance: number;
    },
    meditationType: "accumulation" | "breakthrough"
  ): Promise<MeditationResult> {
    const event = interruptionCheck.event as {
      type: string;
      description: string;
      canIgnore?: boolean;
      canHide?: boolean;
    };
    const interruptedMinutes = interruptionCheck.checkHour * 60;

    // Рассчитываем Qi за время до прерывания
    const partialResult = performMeditation(
      character,
      location,
      interruptedMinutes,
      meditationType
    );

    // Обновляем персонажа
    const characterState: Partial<Character> = {
      currentQi: character.currentQi + partialResult.qiGained,
      fatigue: Math.max(0, character.fatigue - partialResult.fatigueGained.physical),
      mentalFatigue: Math.max(0, character.mentalFatigue - partialResult.fatigueGained.mental),
    };

    await this.characterRepo.update(character.id, characterState);

    // Формируем опции
    const options: Array<{ id: string; label: string; risk: string }> = [];
    if (event.canIgnore) {
      options.push({ id: "ignore", label: "Проигнорировать", risk: "низкий" });
    }
    options.push({ id: "confront", label: "Встать и встретить", risk: "средний" });
    if (event.canHide) {
      options.push({ id: "hide", label: "Скрыться", risk: "низкий" });
    }

    const icon = this.getEventIcon(event.type);
    const content = `⚠️ **Медитация прервана!** (${interruptionCheck.checkHour} час)\n\n` +
      `🎯 **${icon} ${event.description}**\n\n` +
      `📊 Шанс прерывания: ${Math.round(interruptionCheck.finalChance * 100)}%\n` +
      `⚡ Накоплено до прерывания: +${partialResult.qiGained} Ци\n\n` +
      `**Действия:**\n` +
      options.map((o, i) => `${i + 1}. ${o.label} (риск: ${o.risk})`).join("\n");

    return {
      success: true,
      content,
      characterState,
      timeAdvance: { minutes: interruptedMinutes },
      wasInterrupted: true,
      interruption: {
        event: interruptionCheck.event,
        options,
      },
    };
  }

  /**
   * Обработка попытки прорыва
   */
  async handleBreakthrough(character: Character): Promise<BreakthroughResult> {
    const result = attemptBreakthrough(character);

    if (!result.success) {
      return {
        success: false,
        content: `❌ ${result.message}`,
        characterState: {},
        timeAdvance: { minutes: 30 },
      };
    }

    // Обновляем персонажа
    const characterState: Partial<Character> = {
      cultivationLevel: result.newLevel,
      cultivationSubLevel: result.newSubLevel,
      coreCapacity: result.newCoreCapacity,
      accumulatedQi: Math.max(0, character.accumulatedQi - result.qiConsumed),
      fatigue: Math.max(0, character.fatigue - result.fatigueGained.physical),
      mentalFatigue: Math.max(0, character.mentalFatigue - result.fatigueGained.mental),
    };

    await this.characterRepo.applyBreakthrough(
      character.id,
      result.newLevel,
      result.newSubLevel,
      result.newCoreCapacity,
      result.qiConsumed
    );

    // Обновляем усталость отдельно
    await this.characterRepo.updateFatigue(
      character.id,
      characterState.fatigue!,
      characterState.mentalFatigue!
    );

    const content = `${result.message}\n\n💎 Ёмкость ядра: ${result.newCoreCapacity}\n⚡ Накопленная Ци: ${characterState.accumulatedQi}`;

    return {
      success: true,
      content,
      characterState,
      timeAdvance: { minutes: 30 },
    };
  }

  /**
   * Форматирование контента медитации
   */
  private formatMeditationContent(
    result: ReturnType<typeof performMeditation>,
    character: Character,
    location: Location | null,
    interruptionChance: number
  ): string {
    const breakdownText = result.breakdown
      ? `\n  • Ядро: +${result.breakdown.coreGeneration}\n  • Среда: +${result.breakdown.environmentalAbsorption}`
      : "";

    const safetyInfo = interruptionChance < 0.1
      ? "\n🛡️ Безопасное место для медитации."
      : interruptionChance < 0.3
        ? "\n⚠️ Есть риск прерывания."
        : "\n⚠️ Опасное место! Высокий риск прерывания.";

    if (!result.success) {
      return `❌ ${result.interruptionReason}`;
    }

    if (result.coreWasFilled) {
      const newAccumulated = character.accumulatedQi + result.accumulatedQiGained;
      const currentFills = Math.floor(newAccumulated / character.coreCapacity);
      const requiredFills = character.cultivationLevel * 10 + character.cultivationSubLevel;
      const fillsNeeded = Math.max(0, requiredFills - currentFills);

      return `⚡ **Ядро заполнено!**\n\n📊 Прогресс: ${currentFills}/${requiredFills} заполнений\n🔄 Осталось: ${fillsNeeded}\n\n⚠️ **Потратьте Ци (техники, бой) чтобы продолжить!**${breakdownText}\n⏱️ Время: ${result.duration} мин.\n😌 Усталость снижена.${safetyInfo}`;
    }

    return `🧘 Медитация завершена.\n\n⚡ Накоплено Ци: +${result.qiGained}${breakdownText}\n  Ядро: ${character.currentQi + result.qiGained}/${character.coreCapacity}\n😌 Усталость снижена.\n⏱️ Время: ${result.duration} мин.${safetyInfo}`;
  }

  /**
   * Получение иконки для типа события
   */
  private getEventIcon(type: string): string {
    const icons: Record<string, string> = {
      creature: "🐺",
      person: "👤",
      spirit: "👻",
      phenomenon: "🌀",
      rare: "✨",
    };
    return icons[type] || "❓";
  }
}
