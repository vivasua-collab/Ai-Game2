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

// Проверка, является ли GPU RTX 50xx серией (Blackwell)
function isBlackwellGPU(gpuName: string): boolean {
  return gpuName.includes("RTX 50") || 
         gpuName.includes("RTX 5070") || 
         gpuName.includes("RTX 5080") || 
         gpuName.includes("RTX 5090");
}

// Проверка тензорных ядер по имени GPU
function hasTensorCores(gpuName: string): boolean {
  // RTX 20xx и новее имеют тензорные ядра
  if (gpuName.includes("RTX 20") || gpuName.includes("RTX 30") || 
      gpuName.includes("RTX 40") || gpuName.includes("RTX 50")) {
    return true;
  }
  // Quadro RTX и новее
  if (gpuName.includes("Quadro RTX") || gpuName.includes("RTX A")) {
    return true;
  }
  return false;
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
  debugLogs.push(`Platform: ${process.platform}`);

  // Метод 1: Пробуем nvidia-smi (Linux/Mac/Windows с PATH)
  try {
    debugLogs.push("Method 1: nvidia-smi direct...");
    const { stdout, stderr } = await execAsync(
      "nvidia-smi --query-gpu=name,memory.total,compute_cap --format=csv,noheader",
      { timeout: 10000, windowsHide: true }
    );
    
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
      let tensorCores = hasTensorCores(gpuName);
      let computeCapability: string | null = null;
      
      if (capMatch) {
        const major = parseInt(capMatch[1]);
        const minor = parseInt(capMatch[2]);
        computeCapability = `${major}.${minor}`;
        tensorCores = major >= 7 || tensorCores;
      }

      // RTX 50xx серия (Blackwell) имеет compute capability 10.x
      if (isBlackwellGPU(gpuName)) {
        tensorCores = true; // Blackwell имеет тензорные ядра
        if (!computeCapability) {
          computeCapability = "10.0"; // Blackwell
        }
      }

      let type: GPUInfo["type"] = tensorCores ? "nvidia-tensor" : "nvidia-cuda";

      // Получаем версию драйвера через nvidia-smi
      let cudaVersion: string | null = null;
      try {
        const { stdout: cudaOut } = await execAsync(
          "nvidia-smi --query-gpu=driver_version --format=csv,noheader",
          { timeout: 5000, windowsHide: true }
        );
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
    debugLogs.push(`nvidia-smi direct failed: ${errMsg.substring(0, 100)}`);
  }

  // Метод 2: Windows - пробуем полный путь к nvidia-smi
  if (process.platform === "win32") {
    try {
      debugLogs.push("Method 2: Windows nvidia-smi paths...");
      const nvidiaSmiPaths = [
        "C:\\Windows\\System32\\nvidia-smi.exe",
        "C:\\Windows\\System32\\nvidia-smi",
        "C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe",
      ];

      for (const nvidiaSmiPath of nvidiaSmiPaths) {
        try {
          debugLogs.push(`Trying: ${nvidiaSmiPath}`);
          const { stdout } = await execAsync(
            `"${nvidiaSmiPath}" --query-gpu=name,memory.total --format=csv,noheader`,
            { timeout: 10000, windowsHide: true }
          );
          
          if (stdout && stdout.trim()) {
            debugLogs.push(`Found: ${stdout.substring(0, 100)}`);
            const lines = stdout.trim().split("\n");
            const firstGpu = lines[0].split(",").map(s => s.trim());
            
            const gpuName = firstGpu[0] || "Unknown NVIDIA GPU";
            const vramStr = firstGpu[1] || "";
            const vramMatch = vramStr.match(/(\d+)/);
            const vram = vramMatch ? parseInt(vramMatch[1]) : null;

            const tensorCores = hasTensorCores(gpuName);

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
        } catch (e) {
          debugLogs.push(`Path failed: ${nvidiaSmiPath}`);
          continue;
        }
      }
    } catch (error) {
      debugLogs.push(`Windows paths failed: ${error}`);
    }

    // Метод 3: Windows WMIC для определения GPU
    try {
      debugLogs.push("Method 3: WMIC GPU detection...");
      const { stdout } = await execAsync(
        "wmic path win32_VideoController get name",
        { timeout: 8000, windowsHide: true }
      );
      
      if (stdout) {
        debugLogs.push(`WMIC output: ${stdout.substring(0, 200)}`);
        const lines = stdout.split("\n").filter(l => l.trim() && !l.includes("Name"));
        
        for (const line of lines) {
          const gpuName = line.trim();
          if (gpuName.toLowerCase().includes("nvidia") || 
              gpuName.toLowerCase().includes("rtx") || 
              gpuName.toLowerCase().includes("gtx")) {
            const tensorCores = hasTensorCores(gpuName);
            
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

    // Метод 4: PowerShell для определения GPU
    try {
      debugLogs.push("Method 4: PowerShell GPU detection...");
      const { stdout } = await execAsync(
        'powershell -Command "Get-WmiObject Win32_VideoController | Select-Object Name"',
        { timeout: 10000, windowsHide: true }
      );
      
      if (stdout) {
        debugLogs.push(`PowerShell output: ${stdout.substring(0, 200)}`);
        const lines = stdout.split("\n").filter(l => l.trim() && !l.includes("Name") && !l.includes("---"));
        
        for (const line of lines) {
          const gpuName = line.trim();
          if (gpuName && (
              gpuName.toLowerCase().includes("nvidia") || 
              gpuName.toLowerCase().includes("rtx") || 
              gpuName.toLowerCase().includes("gtx"))) {
            const tensorCores = hasTensorCores(gpuName);
            
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
      debugLogs.push(`PowerShell failed: ${error}`);
    }
  }

  // Метод 5: Проверяем Ollama через его API
  try {
    debugLogs.push("Method 5: Ollama detection...");
    const { stdout } = await execAsync("ollama list", { timeout: 5000, windowsHide: true });
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
