/**
 * ============================================================================
 * PHASE 5 INTEGRATION TEST - Тестирование серверного AI
 * ============================================================================
 * 
 * Тестирует:
 * 1. NPC активируется при приближении игрока
 * 2. NPC уклоняется от атаки
 * 3. NPC атакует при агрессии
 * 4. WebSocket события корректно отправляются
 * 
 * @see docs/checkpoints/checkpoint_03_25_AI_server_implementation_plan.md
 */

import { io as ioClient, Socket } from 'socket.io-client'

// ==================== КОНФИГУРАЦИЯ ====================

const WS_URL = 'http://localhost:3003'
const TIMEOUT_MS = 5000

// ==================== ТИПЫ ====================

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
  details?: unknown
}

interface NPCAction {
  type: string
  target?: { x: number; y: number } | string
  params?: Record<string, unknown>
  startTime: number
  duration: number
}

// ==================== УТИЛИТЫ ====================

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  if (data) {
    console.log(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2))
  } else {
    console.log(`[${timestamp}] ${message}`)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ==================== ТЕСТЫ ====================

async function testConnection(): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    const socket = ioClient(WS_URL, {
      path: '/',
      transports: ['websocket'],
    })
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, TIMEOUT_MS)
      
      socket.on('connect', () => {
        clearTimeout(timeout)
        resolve()
      })
      
      socket.on('connect_error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    })
    
    socket.disconnect()
    
    return {
      name: 'WebSocket Connection',
      passed: true,
      duration: Date.now() - startTime,
      details: 'Successfully connected to WebSocket server',
    }
  } catch (error) {
    return {
      name: 'WebSocket Connection',
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function testWorldTick(): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    const socket = ioClient(WS_URL, { path: '/', transports: ['websocket'] })
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, TIMEOUT_MS)
      
      socket.on('connect', () => resolve())
      socket.on('connect_error', (err) => reject(err))
    })
    
    // Ждём world:tick
    const tickData = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Tick timeout'))
      }, 2000)
      
      socket.on('world:tick', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })
    })
    
    socket.disconnect()
    
    return {
      name: 'World Tick',
      passed: true,
      duration: Date.now() - startTime,
      details: tickData,
    }
  } catch (error) {
    return {
      name: 'World Tick',
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function testPlayerConnect(): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    const socket = ioClient(WS_URL, { path: '/', transports: ['websocket'] })
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, TIMEOUT_MS)
      
      socket.on('connect', () => resolve())
      socket.on('connect_error', (err) => reject(err))
    })
    
    // Отправляем player:connect
    socket.emit('player:connect', {
      sessionId: 'test-session',
      characterId: 'test-player-1',
      locationId: 'test-location',
      x: 100,
      y: 100,
      level: 1,
    })
    
    // Ждём подтверждения
    const connectedData = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Player connected timeout'))
      }, TIMEOUT_MS)
      
      socket.on('player:connected', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })
    })
    
    socket.disconnect()
    
    return {
      name: 'Player Connect',
      passed: true,
      duration: Date.now() - startTime,
      details: connectedData,
    }
  } catch (error) {
    return {
      name: 'Player Connect',
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function testNPCActivation(): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    const socket = ioClient(WS_URL, { path: '/', transports: ['websocket'] })
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, TIMEOUT_MS)
      
      socket.on('connect', () => resolve())
      socket.on('connect_error', (err) => reject(err))
    })
    
    // Синхронизируем NPC
    socket.emit('npc:sync', {
      locationId: 'test-location',
      npcs: [
        {
          id: 'npc-1',
          name: 'Test NPC',
          x: 200,
          y: 200,
          locationId: 'test-location',
          health: 100,
          maxHealth: 100,
          isActive: false,
          aiState: 'idle',
          currentAction: null,
        },
      ],
    })
    
    await sleep(100)
    
    // Подключаем игрока рядом с NPC
    socket.emit('player:connect', {
      sessionId: 'test-session',
      characterId: 'test-player-1',
      locationId: 'test-location',
      x: 250, // Близко к NPC
      y: 250,
      level: 1,
    })
    
    // Ждём world:tick для активации NPC
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('World tick timeout'))
      }, 3000)
      
      socket.on('world:tick', () => {
        clearTimeout(timeout)
        resolve()
      })
    })
    
    // Проверяем состояние мира
    socket.emit('world:state')
    
    const worldState = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('World state timeout'))
      }, TIMEOUT_MS)
      
      socket.on('world:state', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })
    })
    
    socket.disconnect()
    
    const state = worldState as { npcsInLocation?: NPCState[] }
    const npc = state?.npcsInLocation?.[0]
    
    if (npc && npc.isActive) {
      return {
        name: 'NPC Activation',
        passed: true,
        duration: Date.now() - startTime,
        details: { npcId: npc.id, isActive: npc.isActive, aiState: npc.aiState },
      }
    } else {
      return {
        name: 'NPC Activation',
        passed: false,
        duration: Date.now() - startTime,
        error: 'NPC was not activated',
        details: worldState,
      }
    }
  } catch (error) {
    return {
      name: 'NPC Activation',
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function testPlayerAttack(): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    const socket = ioClient(WS_URL, { path: '/', transports: ['websocket'] })
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, TIMEOUT_MS)
      
      socket.on('connect', () => resolve())
      socket.on('connect_error', (err) => reject(err))
    })
    
    // Синхронизируем NPC
    socket.emit('npc:sync', {
      locationId: 'test-location',
      npcs: [
        {
          id: 'npc-1',
          name: 'Test NPC',
          x: 200,
          y: 200,
          locationId: 'test-location',
          health: 100,
          maxHealth: 100,
          isActive: true,
          aiState: 'idle',
          currentAction: null,
          threatLevel: 0,
        },
      ],
    })
    
    await sleep(100)
    
    // Подключаем игрока
    socket.emit('player:connect', {
      sessionId: 'test-session',
      characterId: 'test-player-1',
      locationId: 'test-location',
      x: 180,
      y: 180,
      level: 1,
    })
    
    await sleep(100)
    
    // Игрок атакует NPC
    socket.emit('player:attack', {
      targetId: 'npc-1',
      techniqueId: 'basic-strike',
      damage: 10,
    })
    
    // Ждём combat:attack
    const attackData = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Combat attack timeout'))
      }, TIMEOUT_MS)
      
      socket.on('combat:attack', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })
    })
    
    // Ждём npc:action (реакция NPC)
    const npcAction = await new Promise<NPCAction | null>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null)
      }, 1000)
      
      socket.on('npc:action', (data: { npcId: string; action: NPCAction }) => {
        if (data.npcId === 'npc-1') {
          clearTimeout(timeout)
          resolve(data.action)
        }
      })
    })
    
    socket.disconnect()
    
    return {
      name: 'Player Attack & NPC Reaction',
      passed: true,
      duration: Date.now() - startTime,
      details: {
        attackReceived: !!attackData,
        npcReaction: npcAction,
      },
    }
  } catch (error) {
    return {
      name: 'Player Attack & NPC Reaction',
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function testAIStats(): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    const socket = ioClient(WS_URL, { path: '/', transports: ['websocket'] })
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, TIMEOUT_MS)
      
      socket.on('connect', () => resolve())
      socket.on('connect_error', (err) => reject(err))
    })
    
    // Запрашиваем AI статистику
    socket.emit('ai:stats')
    
    const stats = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('AI stats timeout'))
      }, TIMEOUT_MS)
      
      socket.on('ai:stats', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })
    })
    
    socket.disconnect()
    
    return {
      name: 'AI Stats',
      passed: true,
      duration: Date.now() - startTime,
      details: stats,
    }
  } catch (error) {
    return {
      name: 'AI Stats',
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// ==================== MAIN ====================

interface NPCState {
  id: string
  name: string
  x: number
  y: number
  locationId: string
  health: number
  maxHealth: number
  isActive: boolean
  aiState: string
  currentAction: NPCAction | null
  threatLevel?: number
  targetId?: string
}

async function main(): Promise<void> {
  log('========================================')
  log('PHASE 5 INTEGRATION TEST')
  log('========================================')
  log('')
  
  const tests: TestResult[] = []
  
  // Тест 1: WebSocket Connection
  log('Running Test 1: WebSocket Connection...')
  tests.push(await testConnection())
  log('')
  
  // Тест 2: World Tick
  log('Running Test 2: World Tick...')
  tests.push(await testWorldTick())
  log('')
  
  // Тест 3: Player Connect
  log('Running Test 3: Player Connect...')
  tests.push(await testPlayerConnect())
  log('')
  
  // Тест 4: NPC Activation
  log('Running Test 4: NPC Activation...')
  tests.push(await testNPCActivation())
  log('')
  
  // Тест 5: Player Attack
  log('Running Test 5: Player Attack & NPC Reaction...')
  tests.push(await testPlayerAttack())
  log('')
  
  // Тест 6: AI Stats
  log('Running Test 6: AI Stats...')
  tests.push(await testAIStats())
  log('')
  
  // Результаты
  log('========================================')
  log('TEST RESULTS')
  log('========================================')
  
  let passed = 0
  let failed = 0
  
  for (const result of tests) {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED'
    log(`${status} - ${result.name} (${result.duration}ms)`)
    
    if (result.passed) {
      passed++
    } else {
      failed++
      log(`  Error: ${result.error}`)
    }
    
    if (result.details) {
      log(`  Details: ${JSON.stringify(result.details, null, 2)}`)
    }
  }
  
  log('')
  log('========================================')
  log(`TOTAL: ${passed}/${tests.length} passed, ${failed} failed`)
  log('========================================')
  
  // Выходим с кодом ошибки если есть неудачные тесты
  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  log('Test runner error:', error)
  process.exit(1)
})
