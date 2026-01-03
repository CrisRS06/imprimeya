// Tipos de la base de datos generados por Supabase CLI
import type { Tables as TablesType, TablesInsert as TablesInsertType, TablesUpdate as TablesUpdateType } from './database.types'
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from './database.types'

// ============================================
// TIPOS DE PRODUCTO
// ============================================
export type ProductType = 'photo' | 'document' | 'poster'

// Mantener compatibilidad con codigo existente (deprecated)
export type LegacyProductType = 'single_photo' | 'collage' | 'poster'

// ============================================
// TIPOS DE PAPEL (V2 - Reales de la tienda)
// ============================================
export type PaperType = 'bond_normal' | 'opalina' | 'cartulina_lino' | 'sticker_semigloss' | 'fotografico'

// Mantener compatibilidad con codigo existente
export type LegacyPaperType = 'normal' | 'glossy' | 'matte' | 'sticker' | 'opalina' | 'lino'

// ============================================
// ESTADO DE ORDEN (Simplificado)
// ============================================
// pending: Pedido nuevo, esperando ser procesado
// delivered: Pedido impreso, cobrado y entregado
// cancelled: Pedido cancelado
export type OrderStatus = 'pending' | 'delivered' | 'cancelled'

// ============================================
// TIPOS DE FILA PARA USO DIRECTO
// ============================================
export type PrintSize = TablesType<'print_sizes'>
export type PaperOption = TablesType<'paper_options'>
export type CollageTemplate = TablesType<'collage_templates'>
export type Order = TablesType<'orders'>

// Tipos para insert
export type OrderInsert = TablesInsertType<'orders'>
export type OrderUpdate = TablesUpdateType<'orders'>

// ============================================
// TIPOS PARA LAYOUTS DE FOTOS
// ============================================
export interface PhotoLayoutPosition {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

export interface PhotoLayoutData {
  positions: PhotoLayoutPosition[]
}

export interface PhotoLayout {
  id: string
  name: string
  display_name: string
  description?: string
  photo_size: string // '4x6', '5x7', 'wallet', 'carnet'
  photo_width_inches: number
  photo_height_inches: number
  photos_per_sheet: number
  allows_repeat: boolean
  allows_different: boolean
  layout_data: PhotoLayoutData
  compatible_papers: string[]
  is_active: boolean
  sort_order: number
}

// ============================================
// TIPOS PARA PAPELES V2
// ============================================
export interface PaperOptionV2 {
  id: string
  code: PaperType
  display_name: string
  description?: string
  compatible_products: ProductType[]
  icon_name?: string
  is_active: boolean
  sort_order: number
}

// ============================================
// TIPOS PARA DOCUMENTOS
// ============================================
export interface DocumentInfo {
  type: 'pdf' | 'docx' | 'doc'
  pageCount: number
  previewUrl?: string
  fileName: string
  fileSize: number
}

// ============================================
// TIPOS AUXILIARES PARA COLLAGE
// ============================================
export interface CollageLayoutData {
  slots: CollageSlot[]
}

export interface CollageSlot {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

// ============================================
// TIPOS PARA ORDEN EXTENDIDA
// ============================================
export interface OrderExtended extends Partial<Order> {
  // Campos nuevos para fotos
  photo_layout_id?: string
  photos_in_order?: number
  sheets_count?: number

  // Campos nuevos para documentos
  document_pages?: number
  is_color?: boolean
  source_file_type?: 'image' | 'pdf' | 'docx'

  // Papel v2
  paper_type_v2?: PaperType
}
