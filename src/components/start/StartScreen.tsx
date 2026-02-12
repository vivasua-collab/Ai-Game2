"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StartScreenProps {
  onStartGame: (variant: 1 | 2 | 3, customConfig?: Record<string, unknown>, characterName?: string) => void;
  onLoadGame: (sessionId: string) => void;
  isLoading: boolean;
}

// Интерфейс GPU детектора
interface GPUInfo {
  available: boolean;
  type: "nvidia-tensor" | "nvidia-cuda" | "cuda-cpu" | "none";
  gpuName: string | null;
  cudaVersion: string | null;
  vram: number | null;
  tensorCores: boolean;
  computeCapability: string | null;
  recommendation: string;
}

// Интерфейс сохранения с новой информацией
interface SaveData {
  id: string;
  createdAt: string;
  updatedAt: string;
  worldId: string;
  worldName: string;
  startVariant: number;
  startType: string;
  startTypeLabel: string;
  worldYear: number;
  worldMonth: number;
  worldDay: number;
  worldHour: number;
  worldMinute: number;
  daysSinceStart: number;
  character: {
    id: string;
    name: string;
    age: number;
    cultivationLevel: number;
    cultivationSubLevel: number;
    currentQi: number;
    coreCapacity: number;
    health: number;
    fatigue: number;
    mentalFatigue: number;
  };
}

// Расширенный интерфейс лога с деталями
interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  category: string;
  message: string;
  details?: Record<string, unknown> | null;
  stack?: string | null;
  sessionId?: string | null;
  duration?: number | null;
}

// Интерфейс статуса LLM
interface LLMStatus {
  available: boolean;
  currentProvider: string;
  currentModel: string;
  preferredProvider?: string | null;
  providers: {
    zai: { available: boolean; error?: string; model?: string };
    local: { available: boolean; error?: string; model?: string };
    api: { available: boolean; error?: string; model?: string };
  };
}

// Компонент индикатора статуса LLM с GPU детектором
function LLMStatusIndicator() {
  const [status, setStatus] = useState<LLMStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [gpuInfo, setGpuInfo] = useState<GPUInfo | null>(null);

  // Проверка статуса при загрузке
  useEffect(() => {
    checkStatus();
    checkGPU();
  }, []);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch("/api/llm/status");
      const data = await response.json();
      setStatus(data);
      setSelectedProvider(data.preferredProvider || data.currentProvider || "");
    } catch (error) {
      console.error("Failed to check LLM status:", error);
      setStatus({
        available: false,
        currentProvider: "unknown",
        currentModel: "unknown",
        preferredProvider: null,
        providers: {
          zai: { available: false, error: "Failed to check" },
          local: { available: false, error: "Failed to check" },
          api: { available: false, error: "Failed to check" },
        },
      });
    } finally {
      setIsChecking(false);
    }
  };

  const checkGPU = async () => {
    try {
      const response = await fetch("/api/system/gpu");
      const data = await response.json();
      setGpuInfo(data.gpu);
    } catch (error) {
      console.error("Failed to check GPU:", error);
      setGpuInfo({
        available: false,
        type: "none",
        gpuName: null,
        cudaVersion: null,
        vram: null,
        tensorCores: false,
        computeCapability: null,
        recommendation: "Не удалось определить GPU",
      });
    }
  };

  const handleProviderChange = async (provider: string) => {
    setSelectedProvider(provider);
    setIsSaving(true);
    
    try {
      await fetch("/api/llm/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      // Обновляем статус после выбора
      await checkStatus();
    } catch (error) {
      console.error("Failed to set provider:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleIndicatorClick = () => {
    if (!status?.available) {
      setShowWarning(true);
    } else {
      checkStatus();
    }
  };

  // Определяем имя провайдера для отображения
  const getProviderDisplayName = (provider: string): string => {
    switch (provider) {
      case "z-ai":
        return "Z-AI";
      case "local":
        return "Ollama";
      case "api":
        return "External API";
      default:
        return provider;
    }
  };

  // GPU статус цвет
  const getGPUStatusColor = () => {
    if (!gpuInfo) return "bg-slate-500";
    switch (gpuInfo.type) {
      case "nvidia-tensor":
        return "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
      case "nvidia-cuda":
        return "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]";
      case "cuda-cpu":
        return "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]";
      default:
        return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]";
    }
  };

  // Получаем список доступных провайдеров
  const availableProviders = status ? Object.entries(status.providers)
    .filter(([_, p]) => p.available)
    .map(([key]) => key === "zai" ? "z-ai" : key) : [];

  const hasMultipleProviders = availableProviders.length > 1;

  return (
    <>
      <Card className="bg-slate-800/50 border-slate-700 w-full max-w-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
            🧠 Нейросеть
            {isChecking && (
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                Проверка...
              </Badge>
            )}
            {isSaving && (
              <Badge variant="outline" className="text-xs border-amber-600 text-amber-400">
                Сохранение...
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {/* Индикатор и информация */}
            <div className="flex items-center gap-3">
              {/* Лампочка-индикатор */}
              <button
                onClick={handleIndicatorClick}
                className={`relative w-4 h-4 rounded-full transition-all duration-300 ${
                  status?.available 
                    ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.7)] cursor-pointer hover:shadow-[0_0_15px_rgba(34,197,94,0.9)]" 
                    : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)] cursor-pointer hover:shadow-[0_0_15px_rgba(239,68,68,0.9)] animate-pulse"
                }`}
                title={status?.available ? "Нейросеть доступна" : "Нейросеть недоступна - нажмите для подробностей"}
              />
              
              {/* Информация о провайдере */}
              <div className="flex flex-col">
                <span className="text-sm text-slate-200">
                  {status ? getProviderDisplayName(status.currentProvider) : "Загрузка..."}
                </span>
                <span className="text-xs text-slate-500">
                  {status?.currentModel || "..."}
                </span>
              </div>
            </div>

            {/* Кнопка проверки */}
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300"
              onClick={checkStatus}
              disabled={isChecking}
            >
              {isChecking ? "⏳" : "🔄"}
            </Button>
          </div>

          {/* Выбор провайдера при наличии нескольких */}
          {hasMultipleProviders && (
            <div className="mt-3 space-y-2">
              <Label className="text-xs text-slate-400">Дефолтный маршрут:</Label>
              <Select value={selectedProvider} onValueChange={handleProviderChange} disabled={isSaving}>
                <SelectTrigger className="w-full h-8 bg-slate-700 border-slate-600 text-sm">
                  <SelectValue placeholder="Выберите провайдер" />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {getProviderDisplayName(provider)} {status?.providers[provider === "z-ai" ? "zai" : provider as "local" | "api"]?.model && `(${status.providers[provider === "z-ai" ? "zai" : provider as "local" | "api"]?.model})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                ⚙️ Выбранная сеть будет использоваться по умолчанию
              </p>
            </div>
          )}

          {/* Доступные провайдеры */}
          {status && (
            <div className="mt-3 flex flex-wrap gap-1">
              {status.providers.zai.available && (
                <Badge 
                  variant="outline" 
                  className={`text-xs cursor-pointer transition-all ${
                    selectedProvider === "z-ai" 
                      ? "border-amber-500 text-amber-400 bg-amber-900/20" 
                      : "border-green-600 text-green-400"
                  }`}
                  onClick={() => hasMultipleProviders && handleProviderChange("z-ai")}
                >
                  Z-AI {selectedProvider === "z-ai" ? "★" : "✓"}
                </Badge>
              )}
              {status.providers.local.available && (
                <Badge 
                  variant="outline" 
                  className={`text-xs cursor-pointer transition-all ${
                    selectedProvider === "local" 
                      ? "border-amber-500 text-amber-400 bg-amber-900/20" 
                      : "border-green-600 text-green-400"
                  }`}
                  onClick={() => hasMultipleProviders && handleProviderChange("local")}
                >
                  Ollama {selectedProvider === "local" ? "★" : "✓"}
                </Badge>
              )}
              {status.providers.api.available && (
                <Badge 
                  variant="outline" 
                  className={`text-xs cursor-pointer transition-all ${
                    selectedProvider === "api" 
                      ? "border-amber-500 text-amber-400 bg-amber-900/20" 
                      : "border-green-600 text-green-400"
                  }`}
                  onClick={() => hasMultipleProviders && handleProviderChange("api")}
                >
                  API {selectedProvider === "api" ? "★" : "✓"}
                </Badge>
              )}
              {!status.providers.zai.available && !status.providers.local.available && !status.providers.api.available && (
                <Badge variant="outline" className="text-xs border-red-600 text-red-400">
                  Нет доступных
                </Badge>
              )}
            </div>
          )}

          {/* GPU детектор */}
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={checkGPU}
                  className={`w-3 h-3 rounded-full transition-all cursor-pointer ${getGPUStatusColor()}`}
                  title="GPU для локальной LLM"
                />
                <span className="text-xs text-slate-400">
                  {gpuInfo?.gpuName || "GPU не найден"}
                </span>
              </div>
              {gpuInfo?.vram && (
                <span className="text-xs text-slate-500">
                  {Math.round(gpuInfo.vram / 1024)}GB
                </span>
              )}
            </div>
            {gpuInfo && (
              <div className={`text-xs p-2 rounded ${
                gpuInfo.type === "nvidia-tensor" 
                  ? "bg-green-900/20 text-green-400"
                  : gpuInfo.type === "nvidia-cuda"
                  ? "bg-yellow-900/20 text-yellow-400"
                  : gpuInfo.type === "cuda-cpu"
                  ? "bg-orange-900/20 text-orange-400"
                  : "bg-red-900/20 text-red-400"
              }`}>
                {gpuInfo.recommendation}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Всплывающее окно предупреждения */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <Card className="bg-slate-800 border-slate-600 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                ⚠️ Проверь нейросеть
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300">
                Нейросеть недоступна или работает некорректно. Проверьте настройки:
              </p>
              
              <div className="space-y-2 text-sm">
                {status?.providers && (
                  <>
                    {!status.providers.zai.available && (
                      <div className="text-slate-400">
                        • <span className="text-amber-400">Z-AI:</span> {status.providers.zai.error || "недоступен"}
                      </div>
                    )}
                    {!status.providers.local.available && (
                      <div className="text-slate-400">
                        • <span className="text-amber-400">Ollama:</span> {status.providers.local.error || "не запущен"}
                      </div>
                    )}
                    {!status.providers.api.available && (
                      <div className="text-slate-400">
                        • <span className="text-amber-400">API:</span> {status.providers.api.error || "не настроен"}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="bg-slate-900/50 rounded p-3 text-xs text-slate-400">
                <p className="font-medium text-slate-300 mb-1">Для локального запуска (бесплатно):</p>
                <p>1. Установите Ollama: https://ollama.com</p>
                <p>2. Загрузите модель: ollama pull llama3</p>
                <p>3. Перезапустите проект</p>
                <p className="mt-2 text-amber-400">Или создайте .z-ai-config файл с API ключом</p>
              </div>

              <Button
                className="w-full bg-slate-700 hover:bg-slate-600"
                onClick={() => setShowWarning(false)}
              >
                Закрыть
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

// Интерфейс информации о БД
interface DatabaseStatus {
  version: number;
  schemaVersion: number;
  size: number;
  sizeFormatted: string;
  tables: string[];
  needsMigration: boolean;
  lastBackup: string | null;
  backups: string[];
}

// Компонент панели управления базой данных
function DatabasePanel() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Загрузка статуса БД
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch("/api/database/migrate");
      const data = await response.json();
      if (data.success) {
        setStatus(data.database);
      }
    } catch (error) {
      console.error("Failed to load database status:", error);
    }
  };

  const handleMigrate = async () => {
    if (!confirm("⚠️ Выполнить миграцию базы данных? Будет создана резервная копия.")) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/database/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "migrate" }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage("✅ Миграция выполнена успешно");
        await loadStatus();
      } else {
        setMessage(`❌ Ошибка: ${data.result?.error || data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Ошибка: ${error instanceof Error ? error.message : "Unknown"}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleBackup = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/database/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backup" }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage(`✅ Бэкап создан: ${data.backup?.name}`);
        await loadStatus();
      } else {
        setMessage(`❌ Ошибка: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Ошибка: ${error instanceof Error ? error.message : "Unknown"}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleReset = async () => {
    if (!confirm("⚠️ ВНИМАНИЕ! Это удалит ВСЕ данные игры!\n\nБудет создан бэкап перед удалением.")) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/database/reset", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setMessage(`✅ База сброшена. Бэкап: ${data.backupPath?.split("/").pop()}`);
        await loadStatus();
      } else {
        setMessage(`❌ Ошибка: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Ошибка: ${error instanceof Error ? error.message : "Unknown"}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleRestore = async (backupName: string) => {
    if (!confirm(`⚠️ Восстановить из ${backupName}?\n\nТекущие данные будут потеряны!`)) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/database/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", backupName }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage(`✅ Восстановлено из ${backupName}`);
        await loadStatus();
      } else {
        setMessage(`❌ Ошибка: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Ошибка: ${error instanceof Error ? error.message : "Unknown"}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 w-full max-w-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
          💾 База данных
          {status?.needsMigration && (
            <Badge variant="outline" className="text-xs border-amber-500 text-amber-400">
              Требуется обновление
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Статус */}
        {status && (
          <div className="text-xs text-slate-400 space-y-1 bg-slate-900/50 p-2 rounded">
            <div className="flex justify-between">
              <span>Версия схемы:</span>
              <span className={status.needsMigration ? "text-amber-400" : "text-green-400"}>
                {status.version} / {status.schemaVersion}
                {status.needsMigration && " ⚠️"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Размер:</span>
              <span>{status.sizeFormatted}</span>
            </div>
            <div className="flex justify-between">
              <span>Таблиц:</span>
              <span>{status.tables.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Бэкапов:</span>
              <span>{status.backups.length}</span>
            </div>
          </div>
        )}

        {/* Кнопки действий */}
        <div className="grid grid-cols-2 gap-2">
          {status?.needsMigration && (
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleMigrate}
              disabled={isLoading}
            >
              {isLoading ? "⏳..." : "🔄 Обновить"}
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-300"
            onClick={handleBackup}
            disabled={isLoading}
          >
            📦 Бэкап
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            className="border-red-600 text-red-400 hover:bg-red-900/30"
            onClick={handleReset}
            disabled={isLoading}
          >
            🗑️ Сброс
          </Button>
        </div>

        {/* Список бэкапов */}
        {status && status.backups.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Последние бэкапы:</Label>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {status.backups.slice(0, 5).map((backup) => (
                <div
                  key={backup}
                  className="flex justify-between items-center text-xs bg-slate-900/30 p-1 rounded"
                >
                  <span className="text-slate-400 truncate flex-1">{backup.replace("backup-", "").replace(".db", "")}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-2 text-xs text-slate-500 hover:text-slate-300"
                    onClick={() => handleRestore(backup)}
                  >
                    Восст.
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Сообщение */}
        {message && (
          <div className={`text-sm p-2 rounded ${
            message.startsWith("✅")
              ? "bg-green-900/30 text-green-400"
              : "bg-red-900/30 text-red-400"
          }`}>
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Компонент панели настроек логирования
function LoggingPanel() {
  const [loggingEnabled, setLoggingEnabled] = useState(true);
  const [logLevel, setLogLevel] = useState("INFO");
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Загрузка текущих настроек
  useEffect(() => {
    fetch("/api/logs")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLoggingEnabled(data.settings.enabled);
          setLogLevel(data.settings.level);
        }
      })
      .catch(console.error);
  }, []);

  // Переключение логирования
  const handleToggleLogging = async (enabled: boolean) => {
    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", enabled }),
      });
      setLoggingEnabled(enabled);
    } catch (error) {
      console.error("Failed to toggle logging:", error);
    }
  };

  // Изменение уровня логов
  const handleSetLevel = async (level: string) => {
    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setLevel", level }),
      });
      setLogLevel(level);
    } catch (error) {
      console.error("Failed to set log level:", error);
    }
  };

  // Загрузка логов для просмотра
  const handleShowLogs = async () => {
    try {
      const response = await fetch("/api/logs?limit=50");
      const data = await response.json();
      if (data.success) {
        // Логи приходят из базы данных (или буфера на сервере)
        const logs = data.database?.logs || [];
        setLogs(logs);
        setShowLogs(true);
      }
    } catch (error) {
      console.error("Failed to load logs:", error);
    }
  };

  // Очистка логов
  const handleClearLogs = async () => {
    try {
      await fetch("/api/logs?all=true", { method: "DELETE" });
      setLogs([]);
    } catch (error) {
      console.error("Failed to clear logs:", error);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "ERROR":
        return "bg-red-500";
      case "WARN":
        return "bg-yellow-500";
      case "DEBUG":
        return "bg-blue-500";
      default:
        return "bg-green-500";
    }
  };

  const getLevelBorder = (level: string) => {
    switch (level) {
      case "ERROR":
        return "border-l-red-500";
      case "WARN":
        return "border-l-yellow-500";
      case "DEBUG":
        return "border-l-blue-500";
      default:
        return "border-l-green-500";
    }
  };

  // Форматирование деталей ошибки
  const formatDetails = (details: Record<string, unknown> | null | undefined): string => {
    if (!details) return "";
    return JSON.stringify(details, null, 2);
  };

  return (
    <>
      <Card className="bg-slate-800/50 border-slate-700 w-full max-w-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
            📊 Логирование
            <Badge variant={loggingEnabled ? "default" : "secondary"} className="text-xs">
              {loggingEnabled ? "Вкл" : "Выкл"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-slate-400 text-sm">Запись логов</Label>
            <Switch
              checked={loggingEnabled}
              onCheckedChange={handleToggleLogging}
            />
          </div>

          {loggingEnabled && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-slate-400 text-sm">Уровень</Label>
                <Select value={logLevel} onValueChange={handleSetLevel}>
                  <SelectTrigger className="w-24 h-8 bg-slate-700 border-slate-600 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ERROR">ERROR</SelectItem>
                    <SelectItem value="WARN">WARN</SelectItem>
                    <SelectItem value="INFO">INFO</SelectItem>
                    <SelectItem value="DEBUG">DEBUG</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300"
                  onClick={handleShowLogs}
                >
                  📋 Показать
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300"
                  onClick={handleClearLogs}
                >
                  🗑️ Очистить
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Модальное окно с логами */}
      {showLogs && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <Card className="bg-slate-800 border-slate-600 w-full max-w-4xl max-h-[80vh] flex flex-col">
            <CardHeader className="flex-shrink-0 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-200">📋 Системные логи</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600"
                  onClick={() => setShowLogs(false)}
                >
                  ✕ Закрыть
                </Button>
              </div>
              <div className="flex gap-2 mt-2">
                <Badge className="bg-red-500 text-xs">ERROR</Badge>
                <Badge className="bg-yellow-500 text-xs">WARN</Badge>
                <Badge className="bg-green-500 text-xs">INFO</Badge>
                <Badge className="bg-blue-500 text-xs">DEBUG</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {logs.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Нет логов</p>
              ) : (
                <div className="divide-y divide-slate-700">
                  {logs.map((log, index) => {
                    const isExpanded = expandedLogId === (log.id || index.toString());
                    // Проверяем наличие деталей (объект или строка)
                    const detailsObj = log.details && typeof log.details === 'string' 
                      ? (() => { try { return JSON.parse(log.details); } catch { return null; } })()
                      : log.details;
                    const hasDetails = detailsObj && Object.keys(detailsObj).length > 0;
                    const hasStack = log.stack && log.stack.length > 0;
                    
                    return (
                      <div
                        key={log.id || index}
                        className={`border-l-4 ${getLevelBorder(log.level)} hover:bg-slate-700/50 transition-colors cursor-pointer`}
                        onClick={() => setExpandedLogId(isExpanded ? null : (log.id || index.toString()))}
                      >
                        <div className="p-3">
                          <div className="flex items-start gap-2">
                            <Badge className={`${getLevelColor(log.level)} text-xs flex-shrink-0`}>
                              {log.level}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 flex-shrink-0">
                              {log.category}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-200 break-words">
                                {log.message}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-slate-500">
                                  {new Date(log.timestamp).toLocaleString("ru")}
                                </p>
                                {log.duration && (
                                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                    {log.duration}мс
                                  </Badge>
                                )}
                                {(hasDetails || hasStack) && (
                                  <Badge variant="outline" className="text-xs border-amber-600 text-amber-400">
                                    {isExpanded ? "▼ Детали" : "▶ Детали"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Расширенная информация */}
                          {isExpanded && (hasDetails || hasStack) && (
                            <div className="mt-3 ml-16 space-y-2">
                              {/* Детали ошибки */}
                              {hasDetails && (
                                <div className="bg-slate-900/50 rounded p-2">
                                  <p className="text-xs text-amber-400 mb-1">📝 Детали:</p>
                                  <pre className="text-xs text-slate-300 whitespace-pre-wrap break-all overflow-x-auto">
                                    {JSON.stringify(detailsObj, null, 2)}
                                  </pre>
                                </div>
                              )}
                              
                              {/* Stack trace */}
                              {hasStack && (
                                <div className="bg-red-900/20 rounded p-2">
                                  <p className="text-xs text-red-400 mb-1">🔴 Stack Trace:</p>
                                  <pre className="text-xs text-slate-300 whitespace-pre-wrap break-all overflow-x-auto max-h-40">
                                    {log.stack}
                                  </pre>
                                </div>
                              )}
                              
                              {/* Session ID */}
                              {log.sessionId && (
                                <div className="text-xs text-slate-500">
                                  Session: {log.sessionId}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export function StartScreen({ onStartGame, onLoadGame, isLoading }: StartScreenProps) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showLoadForm, setShowLoadForm] = useState(false);
  const [saves, setSaves] = useState<SaveData[]>([]);

  // Кастомные настройки
  const [customSettings, setCustomSettings] = useState({
    location: "",
    age: 16,
    coreCapacity: 1000,
    knowsAboutSystem: false,
    strength: 10,
    agility: 10,
    intelligence: 10,
    characterName: "", // Добавляем имя персонажа
  });

  const handleLoadSaves = async () => {
    try {
      const response = await fetch("/api/game/save");
      const data = await response.json();
      setSaves(data.saves || []);
      setShowLoadForm(true);
    } catch (error) {
      console.error("Failed to load saves:", error);
    }
  };

  const handleCustomStart = () => {
    onStartGame(3, customSettings, customSettings.characterName || undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4 flex flex-col">
      {/* Заголовок */}
      <div className="text-center mb-6 pt-4">
        <h1 className="text-4xl font-bold mb-2 text-amber-400">
          🌸 Cultivation World Simulator
        </h1>
        <p className="text-slate-400">
          Текстовая RPG-симуляция мира культивации
        </p>
      </div>

      {/* Основной контент */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Выбор варианта старта */}
        {!showCustomForm && !showLoadForm && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl w-full mb-6">
              {/* Вариант 1: Секта */}
              <Card className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-amber-400">🏛️ Секта</CardTitle>
                  <CardDescription className="text-slate-400">
                    Старт в секте культивации
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-slate-300 space-y-2 mb-4">
                    <li>• Пробуждение в теле кандидата</li>
                    <li>• Частичная амнезия</li>
                    <li>• 4 дня испытаний</li>
                    <li>• Не знает о системе</li>
                  </ul>
                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700"
                    onClick={() => onStartGame(1)}
                    disabled={isLoading}
                  >
                    {isLoading ? "Загрузка..." : "Начать в секте"}
                  </Button>
                </CardContent>
              </Card>

              {/* Вариант 2: Случайная область */}
              <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-emerald-400">🌲 Свобода</CardTitle>
                  <CardDescription className="text-slate-400">
                    Старт в случайной области
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-slate-300 space-y-2 mb-4">
                    <li>• Случайная локация</li>
                    <li>• Полная память</li>
                    <li>• Знает о системе</li>
                    <li>• Минимальные ресурсы</li>
                  </ul>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => onStartGame(2)}
                    disabled={isLoading}
                  >
                    {isLoading ? "Загрузка..." : "Начать свободно"}
                  </Button>
                </CardContent>
              </Card>

              {/* Вариант 3: Кастомный */}
              <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-purple-400">⚙️ Кастомный</CardTitle>
                  <CardDescription className="text-slate-400">
                    Настрой свой старт
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-slate-300 space-y-2 mb-4">
                    <li>• Выбери локацию</li>
                    <li>• Настрой характеристики</li>
                    <li>• Задай объём ядра</li>
                    <li>• Полный контроль</li>
                  </ul>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => setShowCustomForm(true)}
                    disabled={isLoading}
                  >
                    Настроить
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Кнопки загрузки и настройки */}
            <div className="flex gap-4 mb-6">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300"
                onClick={handleLoadSaves}
              >
                📂 Загрузить игру
              </Button>
            </div>

            {/* Системные панели в ряд */}
            <div className="flex flex-wrap justify-center gap-4 mb-4 w-full max-w-5xl">
              {/* 1. Нейросеть */}
              <LLMStatusIndicator />
              
              {/* 2. База данных */}
              <DatabasePanel />
              
              {/* 3. Логирование */}
              <LoggingPanel />
            </div>
          </>
        )}

        {/* Форма кастомного старта */}
        {showCustomForm && (
          <Card className="bg-slate-800/50 border-slate-700 max-w-lg w-full">
            <CardHeader>
              <CardTitle className="text-purple-400">⚙️ Кастомный старт</CardTitle>
              <CardDescription className="text-slate-400">
                Настрой параметры начала игры
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="charName" className="text-slate-300">Имя персонажа</Label>
                <Input
                  id="charName"
                  placeholder="Как зовут вашего героя?"
                  value={customSettings.characterName}
                  onChange={(e) =>
                    setCustomSettings({ ...customSettings, characterName: e.target.value })
                  }
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              
              <div>
                <Label htmlFor="location" className="text-slate-300">Локация</Label>
                <Input
                  id="location"
                  placeholder="Например: Горный хребет"
                  value={customSettings.location}
                  onChange={(e) =>
                    setCustomSettings({ ...customSettings, location: e.target.value })
                  }
                  className="bg-slate-700 border-slate-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="age" className="text-slate-300">Возраст</Label>
                  <Input
                    id="age"
                    type="number"
                    value={customSettings.age}
                    onChange={(e) =>
                      setCustomSettings({ ...customSettings, age: parseInt(e.target.value) || 16 })
                    }
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <Label htmlFor="core" className="text-slate-300">Ядро</Label>
                  <Input
                    id="core"
                    type="number"
                    value={customSettings.coreCapacity}
                    onChange={(e) =>
                      setCustomSettings({
                        ...customSettings,
                        coreCapacity: parseInt(e.target.value) || 1000,
                      })
                    }
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              </div>

              <Separator className="bg-slate-700" />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300">Сила</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={customSettings.strength}
                    onChange={(e) =>
                      setCustomSettings({
                        ...customSettings,
                        strength: parseFloat(e.target.value) || 10,
                      })
                    }
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Ловкость</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={customSettings.agility}
                    onChange={(e) =>
                      setCustomSettings({
                        ...customSettings,
                        agility: parseFloat(e.target.value) || 10,
                      })
                    }
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Интеллект</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={customSettings.intelligence}
                    onChange={(e) =>
                      setCustomSettings({
                        ...customSettings,
                        intelligence: parseFloat(e.target.value) || 10,
                      })
                    }
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="system"
                  checked={customSettings.knowsAboutSystem}
                  onCheckedChange={(checked) =>
                    setCustomSettings({ ...customSettings, knowsAboutSystem: checked })
                  }
                />
                <Label htmlFor="system" className="text-slate-300">
                  Знает о системе
                </Label>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-600"
                  onClick={() => setShowCustomForm(false)}
                >
                  Назад
                </Button>
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={handleCustomStart}
                  disabled={isLoading}
                >
                  {isLoading ? "Загрузка..." : "Начать игру"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Форма загрузки */}
        {showLoadForm && (
          <Card className="bg-slate-800/50 border-slate-700 max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="text-blue-400">📂 Загрузить игру</CardTitle>
              <CardDescription className="text-slate-400">
                Выберите сохранение для продолжения
              </CardDescription>
            </CardHeader>
            <CardContent>
              {saves.length === 0 ? (
                <p className="text-slate-400 text-center py-4">Нет сохранений</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {saves.map((save) => (
                    <div
                      key={save.id}
                      className="p-3 bg-slate-700/50 rounded hover:bg-slate-700 cursor-pointer transition-colors border border-transparent hover:border-slate-600"
                      onClick={() => onLoadGame(save.id)}
                    >
                      {/* Верхняя строка: имя и тип старта */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-amber-400">
                            {save.character.name}
                          </span>
                          <Badge variant="outline" className="text-xs border-slate-500 text-slate-300">
                            {save.startTypeLabel}
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(save.updatedAt).toLocaleString("ru")}
                        </span>
                      </div>
                      
                      {/* Информация о мире */}
                      <div className="text-sm text-slate-400 mb-2">
                        <span className="text-slate-500">Мир:</span> {save.worldName}
                        <span className="mx-2 text-slate-600">|</span>
                        <span className="text-slate-500">ID:</span> 
                        <span className="font-mono text-xs">{save.worldId.slice(0, 12)}...</span>
                      </div>
                      
                      {/* Время и культивация */}
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-slate-400">
                            📅 День {save.daysSinceStart}
                          </span>
                          <span className="text-slate-400">
                            🕐 {save.worldHour}:{save.worldMinute.toString().padStart(2, "0")}
                          </span>
                          <span className="text-slate-400">
                            🧘 Lv.{save.character.cultivationLevel}.{save.character.cultivationSubLevel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Qi bar */}
                          <div className="w-16 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-cyan-500" 
                              style={{ width: `${(save.character.currentQi / save.character.coreCapacity) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">
                            {save.character.currentQi}/{save.character.coreCapacity}
                          </span>
                        </div>
                      </div>
                      
                      {/* Усталость */}
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-orange-400">
                          😫 Физ: {save.character.fatigue.toFixed(0)}%
                        </span>
                        <span className="text-purple-400">
                          🧠 Мент: {save.character.mentalFatigue.toFixed(0)}%
                        </span>
                        <span className="text-green-400">
                          ❤️ HP: {save.character.health.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                className="w-full mt-4 border-slate-600"
                onClick={() => setShowLoadForm(false)}
              >
                Назад
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Подсказки */}
      {!showCustomForm && !showLoadForm && (
        <div className="text-center text-sm text-slate-500 pb-4">
          <p>Команды: !! (действие) | -- (запрос мира) | --- (строгий режим) | --ПМ (проверка)</p>
        </div>
      )}
    </div>
  );
}
