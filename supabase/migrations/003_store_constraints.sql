-- Migracion: Adaptar a limitaciones reales de tienda
-- Solo imprime en CARTA, papeles especificos, soporte para documentos

-- Nota: Usamos gen_random_uuid() nativo de PostgreSQL 13+

-- ============================================
-- 1. NUEVOS TIPOS ENUM
-- ============================================

-- Agregar 'document' al enum de productos existente
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'document';

-- Nuevo enum para tipos de papel REALES de la tienda
DO $$ BEGIN
    CREATE TYPE paper_type_v2 AS ENUM (
        'bond_normal',
        'opalina',
        'cartulina_lino',
        'sticker_semigloss',
        'fotografico'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. TABLA: LAYOUTS DE FOTOS EN CARTA
-- ============================================

CREATE TABLE IF NOT EXISTS photo_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,              -- '1x-4x6', '2x-4x6', etc.
    display_name TEXT NOT NULL,             -- 'Una foto 4x6'
    description TEXT,                       -- Descripcion breve
    photo_size TEXT NOT NULL,               -- '4x6', '5x7', 'wallet', '3x5'
    photo_width_inches DECIMAL(4,2) NOT NULL,
    photo_height_inches DECIMAL(4,2) NOT NULL,
    photos_per_sheet INT NOT NULL DEFAULT 1,-- 1, 2, 4, 6, 9, 12
    allows_repeat BOOLEAN DEFAULT true,     -- Puede repetir misma foto
    allows_different BOOLEAN DEFAULT true,  -- Puede usar diferentes fotos
    layout_data JSONB NOT NULL,             -- Posiciones en carta
    compatible_papers TEXT[] DEFAULT ARRAY['fotografico', 'bond_normal', 'opalina'],
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. TABLA: PAPELES DISPONIBLES V2
-- ============================================

CREATE TABLE IF NOT EXISTS paper_options_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,              -- 'bond_normal', 'opalina', etc.
    display_name TEXT NOT NULL,             -- 'Bond Normal'
    description TEXT,                       -- 'Papel estandar para documentos'
    compatible_products TEXT[] DEFAULT ARRAY['photo', 'document'],
    icon_name TEXT,                         -- Nombre del icono para UI
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. DATOS INICIALES: LAYOUTS
-- ============================================

INSERT INTO photo_layouts (name, display_name, description, photo_size, photo_width_inches, photo_height_inches, photos_per_sheet, layout_data, sort_order) VALUES
-- Fotos 4x6
('1x-4x6', '1 Foto 4x6', 'Una foto 4x6 centrada en carta', '4x6', 4, 6, 1,
 '{"positions": [{"x": 2.25, "y": 2.5, "width": 4, "height": 6, "rotation": 0}]}', 1),

('2x-4x6', '2 Fotos 4x6', 'Dos fotos 4x6 lado a lado', '4x6', 4, 6, 2,
 '{"positions": [{"x": 0.25, "y": 2.5, "width": 4, "height": 6, "rotation": 0}, {"x": 4.25, "y": 2.5, "width": 4, "height": 6, "rotation": 0}]}', 2),

-- Fotos 5x7
('1x-5x7', '1 Foto 5x7', 'Una foto 5x7 centrada en carta', '5x7', 5, 7, 1,
 '{"positions": [{"x": 1.75, "y": 2, "width": 5, "height": 7, "rotation": 0}]}', 3),

-- Fotos 3x5
('2x-3x5', '2 Fotos 3x5', 'Dos fotos 3x5 verticales', '3x5', 3, 5, 2,
 '{"positions": [{"x": 1.25, "y": 0.5, "width": 3, "height": 5, "rotation": 0}, {"x": 4.75, "y": 0.5, "width": 3, "height": 5, "rotation": 0}]}', 4),

('4x-3x5', '4 Fotos 3x5', 'Cuatro fotos 3x5 en cuadricula', '3x5', 3, 5, 4,
 '{"positions": [{"x": 0.25, "y": 0.5, "width": 3, "height": 5, "rotation": 0}, {"x": 4.25, "y": 0.5, "width": 3, "height": 5, "rotation": 0}, {"x": 0.25, "y": 5.75, "width": 3, "height": 5, "rotation": 0}, {"x": 4.25, "y": 5.75, "width": 3, "height": 5, "rotation": 0}]}', 5),

-- Fotos Wallet (2x3)
('4x-wallet', '4 Wallet', 'Cuatro fotos tamano cartera', 'wallet', 2, 3, 4,
 '{"positions": [{"x": 0.25, "y": 1, "width": 2, "height": 3, "rotation": 0}, {"x": 2.25, "y": 1, "width": 2, "height": 3, "rotation": 0}, {"x": 4.25, "y": 1, "width": 2, "height": 3, "rotation": 0}, {"x": 6.25, "y": 1, "width": 2, "height": 3, "rotation": 0}]}', 6),

('6x-wallet', '6 Wallet', 'Seis fotos tamano cartera', 'wallet', 2, 3, 6,
 '{"positions": [{"x": 0.25, "y": 0.5, "width": 2, "height": 3, "rotation": 0}, {"x": 2.25, "y": 0.5, "width": 2, "height": 3, "rotation": 0}, {"x": 4.25, "y": 0.5, "width": 2, "height": 3, "rotation": 0}, {"x": 0.25, "y": 3.75, "width": 2, "height": 3, "rotation": 0}, {"x": 2.25, "y": 3.75, "width": 2, "height": 3, "rotation": 0}, {"x": 4.25, "y": 3.75, "width": 2, "height": 3, "rotation": 0}]}', 7),

('8x-wallet', '8 Wallet', 'Ocho fotos tamano cartera', 'wallet', 2, 3, 8,
 '{"positions": [{"x": 0.25, "y": 0.5, "width": 2, "height": 3, "rotation": 0}, {"x": 2.25, "y": 0.5, "width": 2, "height": 3, "rotation": 0}, {"x": 4.25, "y": 0.5, "width": 2, "height": 3, "rotation": 0}, {"x": 6.25, "y": 0.5, "width": 2, "height": 3, "rotation": 0}, {"x": 0.25, "y": 3.75, "width": 2, "height": 3, "rotation": 0}, {"x": 2.25, "y": 3.75, "width": 2, "height": 3, "rotation": 0}, {"x": 4.25, "y": 3.75, "width": 2, "height": 3, "rotation": 0}, {"x": 6.25, "y": 3.75, "width": 2, "height": 3, "rotation": 0}]}', 8),

-- Fotos tipo carnet/pasaporte (1.5x2)
('9x-carnet', '9 Carnet', 'Nueve fotos tipo carnet', 'carnet', 1.5, 2, 9,
 '{"positions": [{"x": 0.75, "y": 0.5, "width": 1.5, "height": 2, "rotation": 0}, {"x": 2.5, "y": 0.5, "width": 1.5, "height": 2, "rotation": 0}, {"x": 4.25, "y": 0.5, "width": 1.5, "height": 2, "rotation": 0}, {"x": 0.75, "y": 2.75, "width": 1.5, "height": 2, "rotation": 0}, {"x": 2.5, "y": 2.75, "width": 1.5, "height": 2, "rotation": 0}, {"x": 4.25, "y": 2.75, "width": 1.5, "height": 2, "rotation": 0}, {"x": 0.75, "y": 5, "width": 1.5, "height": 2, "rotation": 0}, {"x": 2.5, "y": 5, "width": 1.5, "height": 2, "rotation": 0}, {"x": 4.25, "y": 5, "width": 1.5, "height": 2, "rotation": 0}]}', 9),

('12x-carnet', '12 Carnet', 'Doce fotos tipo carnet', 'carnet', 1.5, 2, 12,
 '{"positions": [{"x": 0.5, "y": 0.5, "width": 1.5, "height": 2, "rotation": 0}, {"x": 2.25, "y": 0.5, "width": 1.5, "height": 2, "rotation": 0}, {"x": 4, "y": 0.5, "width": 1.5, "height": 2, "rotation": 0}, {"x": 5.75, "y": 0.5, "width": 1.5, "height": 2, "rotation": 0}, {"x": 0.5, "y": 2.75, "width": 1.5, "height": 2, "rotation": 0}, {"x": 2.25, "y": 2.75, "width": 1.5, "height": 2, "rotation": 0}, {"x": 4, "y": 2.75, "width": 1.5, "height": 2, "rotation": 0}, {"x": 5.75, "y": 2.75, "width": 1.5, "height": 2, "rotation": 0}, {"x": 0.5, "y": 5, "width": 1.5, "height": 2, "rotation": 0}, {"x": 2.25, "y": 5, "width": 1.5, "height": 2, "rotation": 0}, {"x": 4, "y": 5, "width": 1.5, "height": 2, "rotation": 0}, {"x": 5.75, "y": 5, "width": 1.5, "height": 2, "rotation": 0}]}', 10)

ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 5. DATOS INICIALES: PAPELES
-- ============================================

INSERT INTO paper_options_v2 (code, display_name, description, compatible_products, icon_name, sort_order) VALUES
('bond_normal', 'Bond Normal', 'Papel estandar para documentos e impresiones', ARRAY['document', 'photo'], 'file-text', 1),
('opalina', 'Opalina', 'Papel grueso premium para invitaciones y tarjetas', ARRAY['document', 'photo'], 'award', 2),
('cartulina_lino', 'Cartulina Lino', 'Textura elegante tipo lino para tarjetas', ARRAY['document'], 'layers', 3),
('sticker_semigloss', 'Sticker Semi-gloss', 'Papel adhesivo con acabado semi-brillante', ARRAY['photo'], 'sticky-note', 4),
('fotografico', 'Fotografico', 'Papel fotografico profesional brillante', ARRAY['photo'], 'image', 5)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 6. ACTUALIZAR TABLA ORDERS
-- ============================================

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS photo_layout_id UUID REFERENCES photo_layouts(id),
    ADD COLUMN IF NOT EXISTS photos_in_order INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS sheets_count INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS document_pages INT,
    ADD COLUMN IF NOT EXISTS is_color BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS paper_type_v2 paper_type_v2,
    ADD COLUMN IF NOT EXISTS source_file_type TEXT; -- 'image', 'pdf', 'docx'

-- ============================================
-- 7. INDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_photo_layouts_active ON photo_layouts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_paper_options_v2_active ON paper_options_v2(is_active) WHERE is_active = true;

-- ============================================
-- 8. RLS (Row Level Security)
-- ============================================

ALTER TABLE photo_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_options_v2 ENABLE ROW LEVEL SECURITY;

-- Politicas de lectura publica para configuraciones
CREATE POLICY "photo_layouts_read_public" ON photo_layouts
    FOR SELECT USING (is_active = true);

CREATE POLICY "paper_options_v2_read_public" ON paper_options_v2
    FOR SELECT USING (is_active = true);
