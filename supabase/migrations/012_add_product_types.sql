-- Agregar nuevos valores al enum product_type
-- NOTA: ALTER TYPE ... ADD VALUE no puede ejecutarse dentro de una transacción
-- por lo que este archivo debe ejecutarse directamente en el SQL Editor de Supabase

ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'photo';
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'document';

-- Comentario para documentar los tipos
COMMENT ON TYPE product_type IS 'Tipos de producto: photo (fotos), document (documentos), single_photo (legacy), collage, poster';
