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

  try {
    // Проверяем наличие nvidia-smi
    const { stdout: nvidiaSmi } = await execAsync("nvidia-smi --query-gpu=name,memory.total,compute_cap --format=csv,noheader 2>/dev/null", {
      timeout: 5000,
    });

    if (nvidiaSmi && nvidiaSmi.trim()) {
      const lines = nvidiaSmi.trim().split("\n");
      const firstGpu = lines[0].split(",").map(s => s.trim());
      
      const gpuName = firstGpu[0] || "Unknown NVIDIA GPU";
      const vramStr = firstGpu[1] || "";
      const computeCap = firstGpu[2] || "";

      // Извлекаем VRAM в MB
      const vramMatch = vramStr.match(/(\d+)/);
      const vram = vramMatch ? parseInt(vramMatch[1]) : null;

      // Проверяем compute capability для тензорных ядер
      // Tensor cores доступны с compute capability 7.0+ (Volta, Turing, Ampere, Hopper)
      const capMatch = computeCap.match(/(\d+)\.(\d+)/);
      let tensorCores = false;
      let computeCapability: string | null = null;
      
      if (capMatch) {
        const major = parseInt(capMatch[1]);
        const minor = parseInt(capMatch[2]);
        computeCapability = `${major}.${minor}`;
        tensorCores = major >= 7;
      }

      // Определяем тип GPU
      let type: GPUInfo["type"] = "nvidia-cuda";
      if (tensorCores) {
        type = "nvidia-tensor";
      }

      // Получаем версию CUDA
      let cudaVersion: string | null = null;
      try {
        const { stdout: nvccOut } = await execAsync("nvcc --version 2>/dev/null | grep release");
        const cudaMatch = nvccOut.match(/release (\d+\.\d+)/);
        if (cudaMatch) {
          cudaVersion = cudaMatch[1];
        }
      } catch {
        // nvcc не установлен, но драйвер работает
      }

      // Формируем рекомендацию
      let recommendation = "";
      if (tensorCores) {
        recommendation = `🚀 Оптимально! ${gpuName} с тензорными ядрами для быстрой работы`;
      } else if (vram && vram >= 6000) {
        recommendation = `✅ Хорошо. ${gpuName} с ${Math.round(vram/1024)}GB VRAM`;
      } else if (vram && vram >= 4000) {
        recommendation = `⚠️ Приемлемо. ${gpuName} для малых моделей`;
      } else {
        recommendation = `⚠️ Ограничено. ${gpuName} только для малых моделей (7B)`;
      }

      return {
        available: true,
        type,
        gpuName,
        cudaVersion,
        vram,
        tensorCores,
        computeCapability,
        recommendation,
      };
    }
  } catch {
    // nvidia-smi не найден или не работает
  }

  // Проверяем CUDA на CPU (например, Intel MKL или AMD ROCm)
  try {
    const { stdout: rocmSmi } = await execAsync("rocm-smi --showname 2>/dev/null", {
      timeout: 5000,
    });
    
    if (rocmSmi && rocmSmi.trim()) {
      return {
        available: true,
        type: "cuda-cpu",
        gpuName: "AMD GPU (ROCm)",
        cudaVersion: "ROCm",
        vram: null,
        tensorCores: false,
        computeCapability: null,
        recommendation: "AMD GPU через ROCm поддерживается",
      };
    }
  } catch {
    // ROCm не найден
  }

  // Проверяем наличие CUDA toolkit без GPU
  try {
    const { stdout: nvccOut } = await execAsync("nvcc --version 2>/dev/null | grep release");
    if (nvccOut) {
      const cudaMatch = nvccOut.match(/release (\d+\.\d+)/);
      return {
        available: true,
        type: "cuda-cpu",
        gpuName: null,
        cudaVersion: cudaMatch ? cudaMatch[1] : "unknown",
        vram: null,
        tensorCores: false,
        computeCapability: null,
        recommendation: "CUDA есть, но GPU не найден. Будет CPU",
      };
    }
  } catch {
    // CUDA не найден
  }

  return defaultResult;
}

export async function GET() {
  const gpuInfo = await detectNvidiaGPU();

  return NextResponse.json({
    success: true,
    gpu: gpuInfo,
    timestamp: new Date().toISOString(),
  });
}
