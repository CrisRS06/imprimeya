import { z } from "zod";

// Valid product types
export const ProductTypeSchema = z.enum([
  "photo",
  "document",
  "single_photo",
  "collage",
  "poster",
]);

// Valid paper types
export const PaperTypeSchema = z.enum([
  "bond_normal",
  "bond",
  "opalina",
  "cartulina_lino",
  "lino",
  "sticker",
  "sticker_semigloss",
  "fotografico",
]);

// Valid order statuses
export const OrderStatusSchema = z.enum([
  "pending",
  "processing",
  "ready",
  "delivered",
  "cancelled",
]);

// Design data schema (flexible but validated)
export const DesignDataSchema = z
  .object({
    // Common fields
    layoutId: z.string().optional(),
    dbPaperType: PaperTypeSchema.optional(),
    // Photo specific
    photos: z.array(z.record(z.string(), z.unknown())).optional(),
    // Document specific
    pageCount: z.number().int().positive().max(500).optional(),
    isColor: z.boolean().optional(),
    // Poster specific
    posterConfig: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough() // Allow additional fields
  .optional();

// Create order request schema
export const CreateOrderSchema = z.object({
  productType: ProductTypeSchema,
  sizeName: z
    .string()
    .min(1, "sizeName requerido")
    .max(20, "sizeName muy largo"),
  paperType: PaperTypeSchema,
  quantity: z
    .number()
    .int("quantity debe ser entero")
    .min(1, "quantity mínimo 1")
    .max(100, "quantity máximo 100"),
  originalImages: z
    .array(z.string().url().or(z.string().regex(/^[a-f0-9-]+\/[a-f0-9-]+\.[a-z]+$/i)))
    .min(1, "Se requiere al menos una imagen"),
  notes: z
    .string()
    .max(500, "notes máximo 500 caracteres")
    .optional()
    .nullable(),
  designData: DesignDataSchema,
  isColor: z.boolean().optional().default(true),
  // Optional fields for specific product types
  collageTemplateId: z.string().uuid().optional().nullable(),
  posterRows: z.number().int().min(1).max(10).optional().nullable(),
  posterCols: z.number().int().min(1).max(10).optional().nullable(),
});

// Update order request schema (for staff)
export const UpdateOrderSchema = z.object({
  status: OrderStatusSchema.optional(),
  staffNotes: z.string().max(1000).optional().nullable(),
  processedBy: z.string().max(100).optional().nullable(),
});

// Query parameters for listing orders
export const ListOrdersQuerySchema = z.object({
  status: OrderStatusSchema.optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val || "50", 10);
      return Math.min(Math.max(num, 1), 100);
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val || "0", 10);
      return Math.max(num, 0);
    }),
});

// File path validation (for uploads)
export const FilePathSchema = z
  .string()
  .regex(
    /^[a-f0-9-]{36}\/[a-f0-9-]{36}\.[a-z]{2,4}$/i,
    "Path debe ser UUID/UUID.ext"
  );

// Type exports
export type ProductType = z.infer<typeof ProductTypeSchema>;
export type PaperType = z.infer<typeof PaperTypeSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>;
export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;
