/**
 * Configuracion de layouts de fotos para hoja carta
 * Todos los layouts asumen papel carta (8.5" x 11")
 */

import type { PhotoLayout, PhotoLayoutData } from '@/lib/supabase/types'

// Constantes de hoja carta
export const LETTER_WIDTH = 8.5 // pulgadas
export const LETTER_HEIGHT = 11 // pulgadas

// ==============================================
// SAFE PRINTING ZONE CONSTANTS
// ==============================================
// Margenes seguros para area no imprimible de impresoras
// La mayoria de impresoras tienen 0.1" - 0.25" de area no imprimible
// El borde inferior suele necesitar mas espacio por el mecanismo de alimentacion
export const SAFE_MARGIN = {
  TOP: 0.25,
  BOTTOM: 0.5,
  LEFT: 0.25,
  RIGHT: 0.25,
} as const

// Area imprimible segura despues de aplicar margenes
export const PRINTABLE_AREA = {
  WIDTH: LETTER_WIDTH - SAFE_MARGIN.LEFT - SAFE_MARGIN.RIGHT, // 8.0"
  HEIGHT: LETTER_HEIGHT - SAFE_MARGIN.TOP - SAFE_MARGIN.BOTTOM, // 10.25"
  START_X: SAFE_MARGIN.LEFT, // 0.25"
  START_Y: SAFE_MARGIN.TOP, // 0.25"
  END_X: LETTER_WIDTH - SAFE_MARGIN.RIGHT, // 8.25"
  END_Y: LETTER_HEIGHT - SAFE_MARGIN.BOTTOM, // 10.5"
} as const

// Gap minimo entre fotos
export const PHOTO_GAP = 0.125 // pulgadas

// Tipos de tamano de foto disponibles
export type PhotoSizeType = '4x6' | '5x7' | '3x5' | 'wallet' | 'carnet' | 'full'

export interface PhotoSizeInfo {
  name: string
  displayName: string
  width: number
  height: number
  maxPerSheet: number
}

export const PHOTO_SIZES: Record<PhotoSizeType, PhotoSizeInfo> = {
  '4x6': {
    name: '4x6',
    displayName: '4x6 pulgadas',
    width: 4,
    height: 6,
    maxPerSheet: 2,
  },
  '5x7': {
    name: '5x7',
    displayName: '5x7 pulgadas',
    width: 5,
    height: 7,
    maxPerSheet: 1,
  },
  '3x5': {
    name: '3x5',
    displayName: '3x5 pulgadas',
    width: 3,
    height: 5,
    maxPerSheet: 4,
  },
  'wallet': {
    name: 'wallet',
    displayName: 'Wallet (2x3)',
    width: 2,
    height: 3,
    maxPerSheet: 12,
  },
  'carnet': {
    name: 'carnet',
    displayName: 'Carnet (1.5x2)',
    width: 1.5,
    height: 2,
    maxPerSheet: 16,
  },
  'full': {
    name: 'full',
    displayName: 'Hoja Completa (8x10.5)',
    width: 8,
    height: 10.5,
    maxPerSheet: 1,
  },
}

// Layouts predefinidos (espejo de la BD para uso offline)
// Pagina carta: 8.5" x 11", margen minimo 0.25"
// Las posiciones estan calculadas para centrar y distribuir bien las fotos
export const PHOTO_LAYOUTS: PhotoLayout[] = [
  // Hoja Completa - Una imagen que ocupa toda la hoja
  {
    id: '1x-full',
    name: '1x-full',
    display_name: 'Hoja Completa',
    description: 'Una imagen que ocupa toda la hoja',
    photo_size: 'full',
    photo_width_inches: 8,
    photo_height_inches: 10.5,
    photos_per_sheet: 1,
    allows_repeat: true,
    allows_different: false,
    layout_data: {
      // Centrado con margenes minimos de 0.25" en todos los lados
      // x = 0.25 (margen izquierdo)
      // y = 0.25 (margen superior)
      // width = 8" (deja 0.25" a cada lado)
      // height = 10.5" (deja 0.25" arriba y 0.25" abajo)
      positions: [{ x: 0.25, y: 0.25, width: 8, height: 10.5, rotation: 0 }],
    },
    compatible_papers: ['fotografico', 'bond_normal', 'opalina', 'sticker_semigloss'],
    is_active: true,
    sort_order: 0,
  },
  // 4x6 - Una foto centrada
  {
    id: '1x-4x6',
    name: '1x-4x6',
    display_name: '1 Foto 4x6',
    description: 'Una foto 4x6 centrada en carta',
    photo_size: '4x6',
    photo_width_inches: 4,
    photo_height_inches: 6,
    photos_per_sheet: 1,
    allows_repeat: true,
    allows_different: false,
    layout_data: {
      // Centrado en area imprimible: x = 0.25 + (8.0-4)/2 = 2.25
      // y = 0.25 + (10.25-6)/2 = 2.375
      positions: [{ x: 2.25, y: 2.375, width: 4, height: 6, rotation: 0 }],
    },
    compatible_papers: ['fotografico', 'bond_normal', 'opalina'],
    is_active: true,
    sort_order: 1,
  },
  // 4x6 - Dos fotos lado a lado, centradas verticalmente
  {
    id: '2x-4x6',
    name: '2x-4x6',
    display_name: '2 Fotos 4x6',
    description: 'Dos fotos 4x6 lado a lado',
    photo_size: '4x6',
    photo_width_inches: 4,
    photo_height_inches: 6,
    photos_per_sheet: 2,
    allows_repeat: true,
    allows_different: true,
    layout_data: {
      // 2 fotos de 4" = 8.0" (llena el area imprimible exactamente)
      // x1 = 0.25 (margen izquierdo), x2 = 4.25
      // y = 0.25 + (10.25-6)/2 = 2.375
      positions: [
        { x: 0.25, y: 2.375, width: 4, height: 6, rotation: 0 },
        { x: 4.25, y: 2.375, width: 4, height: 6, rotation: 0 },
      ],
    },
    compatible_papers: ['fotografico', 'bond_normal', 'opalina'],
    is_active: true,
    sort_order: 2,
  },
  // 5x7 - Una foto centrada
  {
    id: '1x-5x7',
    name: '1x-5x7',
    display_name: '1 Foto 5x7',
    description: 'Una foto 5x7 centrada en carta',
    photo_size: '5x7',
    photo_width_inches: 5,
    photo_height_inches: 7,
    photos_per_sheet: 1,
    allows_repeat: true,
    allows_different: false,
    layout_data: {
      // Centrado en area imprimible: x = 0.25 + (8.0-5)/2 = 1.75
      // y = 0.25 + (10.25-7)/2 = 1.875
      positions: [{ x: 1.75, y: 1.875, width: 5, height: 7, rotation: 0 }],
    },
    compatible_papers: ['fotografico', 'bond_normal', 'opalina'],
    is_active: true,
    sort_order: 3,
  },
  // 3x5 - Dos fotos, distribuidas verticalmente
  {
    id: '2x-3x5',
    name: '2x-3x5',
    display_name: '2 Fotos 3x5',
    description: 'Dos fotos 3x5',
    photo_size: '3x5',
    photo_width_inches: 3,
    photo_height_inches: 5,
    photos_per_sheet: 2,
    allows_repeat: true,
    allows_different: true,
    layout_data: {
      // 2 fotos verticales: 2x5" + 0.25" gap = 10.25" (llena area imprimible)
      // Centrado horizontal: x = 0.25 + (8.0-3)/2 = 2.75
      // y1 = 0.25 (margen superior), y2 = 5.5 (0.25 + 5 + 0.25 gap)
      positions: [
        { x: 2.75, y: 0.25, width: 3, height: 5, rotation: 0 },
        { x: 2.75, y: 5.5, width: 3, height: 5, rotation: 0 },
      ],
    },
    compatible_papers: ['fotografico', 'bond_normal', 'opalina'],
    is_active: true,
    sort_order: 4,
  },
  // 3x5 - Cuatro fotos en grid 2x2
  {
    id: '4x-3x5',
    name: '4x-3x5',
    display_name: '4 Fotos 3x5',
    description: 'Cuatro fotos 3x5',
    photo_size: '3x5',
    photo_width_inches: 3,
    photo_height_inches: 5,
    photos_per_sheet: 4,
    allows_repeat: true,
    allows_different: true,
    layout_data: {
      // 2x2 grid: ancho 6" + 0.5" gap = 6.5", margen horizontal (8.0-6.5)/2 + 0.25 = 1.0
      // Alto: 2x5" + 0.25" gap = 10.25" (llena area imprimible)
      // y1 = 0.25 (margen superior), y2 = 5.5
      positions: [
        { x: 1.0, y: 0.25, width: 3, height: 5, rotation: 0 },
        { x: 4.5, y: 0.25, width: 3, height: 5, rotation: 0 },
        { x: 1.0, y: 5.5, width: 3, height: 5, rotation: 0 },
        { x: 4.5, y: 5.5, width: 3, height: 5, rotation: 0 },
      ],
    },
    compatible_papers: ['fotografico', 'bond_normal', 'opalina'],
    is_active: true,
    sort_order: 5,
  },
  // Wallet 2x3 - Cuatro fotos en una fila, centradas
  // NOTA: Fotos escaladas a 1.875x2.8125 para respetar margenes seguros
  {
    id: '4x-wallet',
    name: '4x-wallet',
    display_name: '4 Wallet',
    description: 'Cuatro fotos tamano cartera',
    photo_size: 'wallet',
    photo_width_inches: 1.875,
    photo_height_inches: 2.8125,
    photos_per_sheet: 4,
    allows_repeat: true,
    allows_different: true,
    layout_data: {
      // 4 fotos de 1.875" + 3 gaps de 0.125" = 7.875"
      // Margen horizontal: (8.0 - 7.875)/2 + 0.25 = 0.3125
      // Centrado vertical: 0.25 + (10.25-2.8125)/2 = 3.96875
      positions: [
        { x: 0.3125, y: 3.96875, width: 1.875, height: 2.8125, rotation: 0 },
        { x: 2.3125, y: 3.96875, width: 1.875, height: 2.8125, rotation: 0 },
        { x: 4.3125, y: 3.96875, width: 1.875, height: 2.8125, rotation: 0 },
        { x: 6.3125, y: 3.96875, width: 1.875, height: 2.8125, rotation: 0 },
      ],
    },
    compatible_papers: ['fotografico', 'bond_normal'],
    is_active: true,
    sort_order: 6,
  },
  // Wallet - Seis fotos 3x2 grid
  {
    id: '6x-wallet',
    name: '6x-wallet',
    display_name: '6 Wallet',
    description: 'Seis fotos tamano cartera',
    photo_size: 'wallet',
    photo_width_inches: 2,
    photo_height_inches: 3,
    photos_per_sheet: 6,
    allows_repeat: true,
    allows_different: true,
    layout_data: {
      // 3 columnas x 2 filas: ancho 6" + 2 gaps de 0.25" = 6.5"
      // Margen horizontal: (8.0 - 6.5)/2 + 0.25 = 1.0
      // Alto 6" + 1 gap de 0.25" = 6.25", centrado: 0.25 + (10.25-6.25)/2 = 2.25
      positions: [
        { x: 1.0, y: 2.25, width: 2, height: 3, rotation: 0 },
        { x: 3.25, y: 2.25, width: 2, height: 3, rotation: 0 },
        { x: 5.5, y: 2.25, width: 2, height: 3, rotation: 0 },
        { x: 1.0, y: 5.5, width: 2, height: 3, rotation: 0 },
        { x: 3.25, y: 5.5, width: 2, height: 3, rotation: 0 },
        { x: 5.5, y: 5.5, width: 2, height: 3, rotation: 0 },
      ],
    },
    compatible_papers: ['fotografico', 'bond_normal'],
    is_active: true,
    sort_order: 7,
  },
  // Wallet - Doce fotos 4x3 grid (LLENA LA HOJA)
  // NOTA: Fotos escaladas a 1.875x2.8125 para respetar margenes seguros
  {
    id: '12x-wallet',
    name: '12x-wallet',
    display_name: '12 Wallet',
    description: 'Doce fotos tamano cartera',
    photo_size: 'wallet',
    photo_width_inches: 1.875,
    photo_height_inches: 2.8125,
    photos_per_sheet: 12,
    allows_repeat: true,
    allows_different: true,
    layout_data: {
      // 4 columnas x 3 filas: 4x1.875" + 3 gaps de 0.125" = 7.875"
      // Margen horizontal: (8.0 - 7.875)/2 + 0.25 = 0.3125
      // Alto: 3x2.8125" + 2 gaps de 0.25" = 8.9375", centrado: 0.25 + (10.25-8.9375)/2 = 0.90625
      positions: [
        // Fila 1
        { x: 0.3125, y: 0.90625, width: 1.875, height: 2.8125, rotation: 0 },
        { x: 2.3125, y: 0.90625, width: 1.875, height: 2.8125, rotation: 0 },
        { x: 4.3125, y: 0.90625, width: 1.875, height: 2.8125, rotation: 0 },
        { x: 6.3125, y: 0.90625, width: 1.875, height: 2.8125, rotation: 0 },
        // Fila 2
        { x: 0.3125, y: 3.96875, width: 1.875, height: 2.8125, rotation: 0 },
        { x: 2.3125, y: 3.96875, width: 1.875, height: 2.8125, rotation: 0 },
        { x: 4.3125, y: 3.96875, width: 1.875, height: 2.8125, rotation: 0 },
        { x: 6.3125, y: 3.96875, width: 1.875, height: 2.8125, rotation: 0 },
        // Fila 3
        { x: 0.3125, y: 7.03125, width: 1.875, height: 2.8125, rotation: 0 },
        { x: 2.3125, y: 7.03125, width: 1.875, height: 2.8125, rotation: 0 },
        { x: 4.3125, y: 7.03125, width: 1.875, height: 2.8125, rotation: 0 },
        { x: 6.3125, y: 7.03125, width: 1.875, height: 2.8125, rotation: 0 },
      ],
    },
    compatible_papers: ['fotografico', 'bond_normal'],
    is_active: true,
    sort_order: 8,
  },
  // Carnet 1.5x2 - Nueve fotos 3x3 grid
  {
    id: '9x-carnet',
    name: '9x-carnet',
    display_name: '9 Carnet',
    description: 'Nueve fotos tipo carnet',
    photo_size: 'carnet',
    photo_width_inches: 1.5,
    photo_height_inches: 2,
    photos_per_sheet: 9,
    allows_repeat: true,
    allows_different: true,
    layout_data: {
      // 3x3 grid: ancho 4.5" + 2 gaps de 0.5" = 5.5"
      // Margen horizontal: (8.0 - 5.5)/2 + 0.25 = 1.5
      // Alto 6" + 2 gaps de 0.75" = 7.5", centrado: 0.25 + (10.25-7.5)/2 = 1.625
      positions: [
        { x: 1.5, y: 1.625, width: 1.5, height: 2, rotation: 0 },
        { x: 3.5, y: 1.625, width: 1.5, height: 2, rotation: 0 },
        { x: 5.5, y: 1.625, width: 1.5, height: 2, rotation: 0 },
        { x: 1.5, y: 4.375, width: 1.5, height: 2, rotation: 0 },
        { x: 3.5, y: 4.375, width: 1.5, height: 2, rotation: 0 },
        { x: 5.5, y: 4.375, width: 1.5, height: 2, rotation: 0 },
        { x: 1.5, y: 7.125, width: 1.5, height: 2, rotation: 0 },
        { x: 3.5, y: 7.125, width: 1.5, height: 2, rotation: 0 },
        { x: 5.5, y: 7.125, width: 1.5, height: 2, rotation: 0 },
      ],
    },
    compatible_papers: ['fotografico', 'bond_normal'],
    is_active: true,
    sort_order: 9,
  },
  // Carnet - Dieciseis fotos 4x4 grid (LLENA LA HOJA)
  {
    id: '16x-carnet',
    name: '16x-carnet',
    display_name: '16 Carnet',
    description: 'Dieciseis fotos tipo carnet',
    photo_size: 'carnet',
    photo_width_inches: 1.5,
    photo_height_inches: 2,
    photos_per_sheet: 16,
    allows_repeat: true,
    allows_different: true,
    layout_data: {
      // 4x4 grid: ancho 6" + 3 gaps de 0.25" = 6.75"
      // Margen horizontal: (8.0 - 6.75)/2 + 0.25 = 0.875
      // Alto 8" + 3 gaps de 0.25" = 8.75", centrado: 0.25 + (10.25-8.75)/2 = 1.0
      positions: [
        // Fila 1
        { x: 0.875, y: 1.0, width: 1.5, height: 2, rotation: 0 },
        { x: 2.625, y: 1.0, width: 1.5, height: 2, rotation: 0 },
        { x: 4.375, y: 1.0, width: 1.5, height: 2, rotation: 0 },
        { x: 6.125, y: 1.0, width: 1.5, height: 2, rotation: 0 },
        // Fila 2
        { x: 0.875, y: 3.25, width: 1.5, height: 2, rotation: 0 },
        { x: 2.625, y: 3.25, width: 1.5, height: 2, rotation: 0 },
        { x: 4.375, y: 3.25, width: 1.5, height: 2, rotation: 0 },
        { x: 6.125, y: 3.25, width: 1.5, height: 2, rotation: 0 },
        // Fila 3
        { x: 0.875, y: 5.5, width: 1.5, height: 2, rotation: 0 },
        { x: 2.625, y: 5.5, width: 1.5, height: 2, rotation: 0 },
        { x: 4.375, y: 5.5, width: 1.5, height: 2, rotation: 0 },
        { x: 6.125, y: 5.5, width: 1.5, height: 2, rotation: 0 },
        // Fila 4
        { x: 0.875, y: 7.75, width: 1.5, height: 2, rotation: 0 },
        { x: 2.625, y: 7.75, width: 1.5, height: 2, rotation: 0 },
        { x: 4.375, y: 7.75, width: 1.5, height: 2, rotation: 0 },
        { x: 6.125, y: 7.75, width: 1.5, height: 2, rotation: 0 },
      ],
    },
    compatible_papers: ['fotografico', 'bond_normal'],
    is_active: true,
    sort_order: 10,
  },
]

/**
 * Obtener layouts por tamano de foto
 */
export function getLayoutsByPhotoSize(photoSize: PhotoSizeType): PhotoLayout[] {
  return PHOTO_LAYOUTS.filter((l) => l.photo_size === photoSize && l.is_active)
}

/**
 * Obtener layout por ID
 */
export function getLayoutById(id: string): PhotoLayout | undefined {
  return PHOTO_LAYOUTS.find((l) => l.id === id)
}

/**
 * Calcular cuantas hojas se necesitan para N fotos con un layout
 */
export function calculateSheetsNeeded(
  photosCount: number,
  photosPerSheet: number
): number {
  return Math.ceil(photosCount / photosPerSheet)
}

/**
 * Obtener todos los tamanos de foto disponibles
 */
export function getAvailablePhotoSizes(): PhotoSizeType[] {
  const sizes = new Set(PHOTO_LAYOUTS.filter((l) => l.is_active).map((l) => l.photo_size))
  return Array.from(sizes) as PhotoSizeType[]
}
