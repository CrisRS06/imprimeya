/**
 * Configuracion de papeles disponibles en la tienda
 * Todos en tamano carta (8.5" x 11")
 */

import type { PaperType, ProductType, PaperOptionV2 } from '@/lib/supabase/types'

export interface PaperConfig {
  code: PaperType
  displayName: string
  description: string
  compatibleProducts: ProductType[]
  iconName: string
  recommended?: boolean
}

export const PAPERS: Record<PaperType, PaperConfig> = {
  bond_normal: {
    code: 'bond_normal',
    displayName: 'Bond Normal',
    description: 'Papel estandar para documentos e impresiones',
    compatibleProducts: ['document', 'photo'],
    iconName: 'file-text',
  },
  opalina: {
    code: 'opalina',
    displayName: 'Opalina',
    description: 'Papel grueso premium para invitaciones y tarjetas',
    compatibleProducts: ['document', 'photo'],
    iconName: 'award',
  },
  cartulina_lino: {
    code: 'cartulina_lino',
    displayName: 'Cartulina Lino',
    description: 'Textura elegante tipo lino para tarjetas',
    compatibleProducts: ['document'],
    iconName: 'layers',
  },
  sticker_semigloss: {
    code: 'sticker_semigloss',
    displayName: 'Sticker Semi-gloss',
    description: 'Papel adhesivo con acabado semi-brillante',
    compatibleProducts: ['photo'],
    iconName: 'sticky-note',
  },
  fotografico: {
    code: 'fotografico',
    displayName: 'Fotografico',
    description: 'Papel fotografico profesional brillante',
    compatibleProducts: ['photo'],
    iconName: 'image',
    recommended: true,
  },
}

/**
 * Obtener papeles compatibles con un tipo de producto
 */
export function getPapersForProduct(productType: ProductType): PaperConfig[] {
  return Object.values(PAPERS).filter((paper) =>
    paper.compatibleProducts.includes(productType)
  )
}

/**
 * Obtener papel por codigo
 */
export function getPaperByCode(code: PaperType): PaperConfig | undefined {
  return PAPERS[code]
}

/**
 * Obtener el papel recomendado para un tipo de producto
 */
export function getRecommendedPaper(productType: ProductType): PaperConfig | undefined {
  const compatible = getPapersForProduct(productType)
  return compatible.find((p) => p.recommended) || compatible[0]
}

/**
 * Nombres de display para UI
 */
export const PAPER_DISPLAY_NAMES: Record<PaperType, string> = {
  bond_normal: 'Bond Normal',
  opalina: 'Opalina',
  cartulina_lino: 'Cartulina Lino',
  sticker_semigloss: 'Sticker Semi-gloss',
  fotografico: 'Fotografico',
}

/**
 * Lista ordenada de todos los papeles
 */
export const PAPER_LIST: PaperType[] = [
  'bond_normal',
  'opalina',
  'cartulina_lino',
  'sticker_semigloss',
  'fotografico',
]

/**
 * Papeles para fotos (ordenados por recomendacion)
 */
export const PHOTO_PAPERS: PaperType[] = [
  'fotografico',
  'sticker_semigloss',
  'opalina',
  'bond_normal',
]

/**
 * Papeles para documentos (ordenados por uso comun)
 */
export const DOCUMENT_PAPERS: PaperType[] = [
  'bond_normal',
  'opalina',
  'cartulina_lino',
]
