import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface GPUInfo {
  available: boolean;
  type: "nvidia-tensor" | "nvidia-cuda" | "cuda-cpu" | "none";
  gpuName: string | null;
  cudaVersion: string | null;
  vram: number | null; // MB
  tensorCores: boolean;
  computeCapability: string | null;
  recommendation: string;
  debug?: string; // Для отладки
}

async function detectNvidiaGPU(): Promise<GPUInfo> {
  const defaultResult: GPUInfo = {
    available: false,
    type: "none",
    gpuName: null,
    cudaVersion: null,
    vram: null,
    tensorCores: false,
    computeCapability: null,
    recommendation: "Локальная нейросеть будет работать на CPU (медленно)",
  };

  const debugLogs: string[] = [];

  // Метод 1: Пробуем nvidia-smi (Linux/Mac/Windows с PATH)
  try {
    debugLogs.push("Trying nvidia-smi...");
    const { stdout, stderr } = await execAsync("nvidia-smi --query-gpu=name,memory.total,compute_cap --format=csv,noheader", {
      timeout: 8000,
    });
    
    debugLogs.push(`nvidia-smi stdout: ${stdout?.substring(0, 200)}`);
    
    if (stdout && stdout.trim()) {
      const lines = stdout.trim().split("\n");
      const firstGpu = lines[0].split(",").map(s => s.trim());
      
      const gpuName = firstGpu[0] || "Unknown NVIDIA GPU";
      const vramStr = firstGpu[1] || "";
      const computeCap = firstGpu[2] || "";

      // Извлекаем VRAM в MB
      const vramMatch = vramStr.match(/(\d+)/);
      const vram = vramMatch ? parseInt(vramMatch[1]) : null;

      // Проверяем compute capability для тензорных ядер
      const capMatch = computeCap.match(/(\d+)\.(\d+)/);
      let tensorCores = false;
      let computeCapability: string | null = null;
      
      if (capMatch) {
        const major = parseInt(capMatch[1]);
        const minor = parseInt(capMatch[2]);
        computeCapability = `${major}.${minor}`;
        tensorCores = major >= 7;
      }

      // RTX 50xx серия (Blackwell) имеет compute capability 10.x
      if (gpuName.includes("RTX 50") || gpuName.includes("RTX 5070")) {
        tensorCores = true; // Blackwell имеет тензорные ядра
        if (!computeCapability) {
          computeCapability = "10.0"; // Примерно для Blackwell
        }
      }

      let type: GPUInfo["type"] = tensorCores ? "nvidia-tensor" : "nvidia-cuda";

      // Получаем версию CUDA через nvidia-smi
      let cudaVersion: string | null = null;
      try {
        const { stdout: cudaOut } = await execAsync("nvidia-smi --query-gpu=driver_version --format=csv,noheader", { timeout: 3000 });
        if (cudaOut) {
          cudaVersion = cudaOut.trim().split("\n")[0];
        }
      } catch {
        // Ignore
      }

      const recommendation = tensorCores
        ? `🚀 Оптимально! ${gpuName} с тензорными ядрами`
        : `✅ Хорошо. ${gpuName}${vram ? ` (${Math.round(vram/1024)}GB)` : ""}`;

      return {
        available: true,
        type,
        gpuName,
        cudaVersion,
        vram,
        tensorCores,
        computeCapability,
        recommendation,
        debug: debugLogs.join(" | "),
      };
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    debugLogs.push(`nvidia-smi failed: ${errMsg}`);
  }

  // Метод 2: Windows - пробуем полный путь к nvidia-smi
  try {
    debugLogs.push("Trying Windows nvidia-smi path...");
    const nvidiaSmiPaths = [
      "C:\\Windows\\System32\\nvidia-smi.exe",
      "C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe",
      '"C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe"',
    ];

    for (const nvidiaSmiPath of nvidiaSmiPaths) {
      try {
        const { stdout } = await execAsync(`"${nvidiaSmiPath}" --query-gpu=name,memory.total --format=csv,noheader`, {
          timeout: 8000,
        });
        
        if (stdout && stdout.trim()) {
          debugLogs.push(`Windows nvidia-smi found: ${stdout.substring(0, 100)}`);
          const lines = stdout.trim().split("\n");
          const firstGpu = lines[0].split(",").map(s => s.trim());
          
          const gpuName = firstGpu[0] || "Unknown NVIDIA GPU";
          const vramStr = firstGpu[1] || "";
          const vramMatch = vramStr.match(/(\d+)/);
          const vram = vramMatch ? parseInt(vramMatch[1]) : null;

          // RTX 50xx серия
          const tensorCores = gpuName.includes("RTX 50") || gpuName.includes("RTX 40") || gpuName.includes("RTX 30");

          return {
            available: true,
            type: tensorCores ? "nvidia-tensor" : "nvidia-cuda",
            gpuName,
            cudaVersion: null,
            vram,
            tensorCores,
            computeCapability: tensorCores ? "7.0+" : null,
            recommendation: tensorCores
              ? `🚀 Оптимально! ${gpuName} с тензорными ядрами`
              : `✅ ${gpuName}${vram ? ` (${Math.round(vram/1024)}GB)` : ""}`,
            debug: debugLogs.join(" | "),
          };
        }
      } catch {
        continue;
      }
    }
  } catch (error) {
    debugLogs.push(`Windows paths failed: ${error}`);
  }

  // Метод 3: Windows WMIC для определения GPU
  try {
    debugLogs.push("Trying WMIC for GPU detection...");
    const { stdout } = await execAsync("wmic path win32_VideoController get name", {
      timeout: 5000,
    });
    
    if (stdout) {
      debugLogs.push(`WMIC output: ${stdout.substring(0, 200)}`);
      const lines = stdout.split("\n").filter(l => l.trim() && !l.includes("Name"));
      
      for (const line of lines) {
        const gpuName = line.trim();
        if (gpuName.toLowerCase().includes("nvidia") || gpuName.toLowerCase().includes("rtx") || gpuName.toLowerCase().includes("gtx")) {
          const tensorCores = gpuName.includes("RTX 50") || gpuName.includes("RTX 40") || gpuName.includes("RTX 30") || gpuName.includes("RTX 20");
          
          return {
            available: true,
            type: tensorCores ? "nvidia-tensor" : "nvidia-cuda",
            gpuName,
            cudaVersion: null,
            vram: null,
            tensorCores,
            computeCapability: null,
            recommendation: tensorCores
              ? `🚀 Оптимально! ${gpuName} обнаружен`
              : `✅ ${gpuName} обнаружен`,
            debug: debugLogs.join(" | "),
          };
        }
      }
    }
  } catch (error) {
    debugLogs.push(`WMIC failed: ${error}`);
  }

  // Метод 4: Проверяем Ollama через его API
  try {
    debugLogs.push("Trying Ollama API...");
    const { stdout } = await execAsync("ollama list", { timeout: 5000 });
    if (stdout) {
      // Ollama установлен, значит CUDA вероятно работает
      return {
        available: true,
        type: "cuda-cpu",
        gpuName: "Ollama detected",
        cudaVersion: null,
        vram: null,
        tensorCores: false,
        computeCapability: null,
        recommendation: "⚠️ Ollama установлен. GPU определится при запуске модели",
        debug: debugLogs.join(" | "),
      };
    }
  } catch {
    debugLogs.push("Ollama not found");
  }

  return {
    ...defaultResult,
    debug: debugLogs.join(" | "),
  };
}

export async function GET() {
  const gpuInfo = await detectNvidiaGPU();

  return NextResponse.json({
    success: true,
    gpu: gpuInfo,
    timestamp: new Date().toISOString(),
    platform: process.platform,
  });
}
