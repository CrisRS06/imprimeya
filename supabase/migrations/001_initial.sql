-- ImprimeYA - Schema Inicial
-- Sistema de auto-servicio de impresion fotografica

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tipos enumerados
CREATE TYPE product_type AS ENUM ('single_photo', 'collage', 'poster');
CREATE TYPE paper_type AS ENUM ('normal', 'glossy', 'matte', 'sticker', 'opalina', 'lino');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'ready', 'delivered', 'cancelled');

-- Tabla: Tamanos de impresion disponibles
CREATE TABLE print_sizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,                    -- "4x6", "5x7", "8x10", "Carta"
    width_inches DECIMAL(4,2) NOT NULL,
    height_inches DECIMAL(4,2) NOT NULL,
    width_px_optimal INT NOT NULL,                -- Resolucion optima 300 DPI
    height_px_optimal INT NOT NULL,
    width_px_min INT NOT NULL,                    -- Resolucion minima 150 DPI
    height_px_min INT NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,            -- Precio en colones
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: Opciones de papel
CREATE TABLE paper_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type paper_type NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    price_multiplier DECIMAL(3,2) DEFAULT 1.0,    -- 1.0 = precio base
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: Plantillas de collage
CREATE TABLE collage_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    slots INT NOT NULL,                           -- Numero de fotos
    layout_data JSONB NOT NULL,                   -- Posiciones/tamanos de cada slot
    preview_url TEXT,
    thumbnail_url TEXT,
    compatible_sizes UUID[] DEFAULT ARRAY[]::UUID[], -- IDs de tamanos compatibles
    is_premium BOOLEAN DEFAULT FALSE,
    premium_price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: Pedidos
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code CHAR(6) UNIQUE NOT NULL,                 -- Codigo para cliente (ej: H7KM3P)
    product_type product_type NOT NULL,
    status order_status DEFAULT 'pending',

    -- Datos del diseno (estado serializado de Fabric.js)
    design_data JSONB NOT NULL,

    -- Opciones seleccionadas
    print_size_id UUID REFERENCES print_sizes(id),
    paper_option_id UUID REFERENCES paper_options(id),
    collage_template_id UUID REFERENCES collage_templates(id),
    quantity INT DEFAULT 1 CHECK (quantity > 0 AND quantity <= 100),

    -- Poster multi-hoja
    poster_rows INT CHECK (poster_rows IS NULL OR (poster_rows >= 1 AND poster_rows <= 10)),
    poster_cols INT CHECK (poster_cols IS NULL OR (poster_cols >= 1 AND poster_cols <= 10)),

    -- Archivos en storage
    original_images TEXT[] DEFAULT ARRAY[]::TEXT[],
    processed_image_path TEXT,
    pdf_path TEXT,

    -- Precios (en colones)
    subtotal DECIMAL(10,2),
    total DECIMAL(10,2),

    -- Metadatos cliente
    client_session_id TEXT,                       -- Para tracking sin auth
    client_name TEXT,
    client_phone TEXT,
    notes TEXT,                                   -- Notas del cliente

    -- Metadatos staff
    staff_notes TEXT,
    processed_by UUID REFERENCES auth.users(id),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processing_started_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

-- Indices para busquedas frecuentes
CREATE INDEX idx_orders_code ON orders(code);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_client_session ON orders(client_session_id);

-- Trigger para actualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE collage_templates ENABLE ROW LEVEL SECURITY;

-- Politicas para print_sizes (lectura publica)
CREATE POLICY "Lectura publica de tamanos" ON print_sizes
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

CREATE POLICY "Staff puede gestionar tamanos" ON print_sizes
    FOR ALL TO authenticated
    USING (true);

-- Politicas para paper_options (lectura publica)
CREATE POLICY "Lectura publica de papeles" ON paper_options
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

CREATE POLICY "Staff puede gestionar papeles" ON paper_options
    FOR ALL TO authenticated
    USING (true);

-- Politicas para collage_templates (lectura publica)
CREATE POLICY "Lectura publica de plantillas" ON collage_templates
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

CREATE POLICY "Staff puede gestionar plantillas" ON collage_templates
    FOR ALL TO authenticated
    USING (true);

-- Politicas para orders
CREATE POLICY "Clientes pueden crear pedidos" ON orders
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Clientes pueden ver sus pedidos por codigo" ON orders
    FOR SELECT TO anon
    USING (true);  -- El filtro se hace en la app por codigo

CREATE POLICY "Staff acceso completo a pedidos" ON orders
    FOR ALL TO authenticated
    USING (true);

-- Datos iniciales: Tamanos de impresion
INSERT INTO print_sizes (name, width_inches, height_inches, width_px_optimal, height_px_optimal, width_px_min, height_px_min, base_price, sort_order) VALUES
    ('4x6', 4, 6, 1200, 1800, 600, 900, 500, 1),
    ('5x7', 5, 7, 1500, 2100, 750, 1050, 800, 2),
    ('8x10', 8, 10, 2400, 3000, 1200, 1500, 1500, 3),
    ('Carta', 8.5, 11, 2550, 3300, 1275, 1650, 1200, 4);

-- Datos iniciales: Tipos de papel
INSERT INTO paper_options (type, display_name, price_multiplier, description, sort_order) VALUES
    ('normal', 'Normal', 1.0, 'Papel fotografico estandar', 1),
    ('glossy', 'Brillante', 1.2, 'Acabado brillante profesional', 2),
    ('matte', 'Mate', 1.2, 'Acabado mate sin reflejos', 3),
    ('sticker', 'Sticker', 1.6, 'Papel adhesivo para pegatinas', 4),
    ('opalina', 'Opalina', 2.0, 'Papel grueso premium', 5),
    ('lino', 'Lino', 2.5, 'Textura de lino elegante', 6);

-- Datos iniciales: Plantillas de collage basicas
INSERT INTO collage_templates (name, description, slots, layout_data, sort_order) VALUES
    ('2 Fotos Horizontal', 'Dos fotos lado a lado', 2,
     '{"slots": [{"id": "1", "x": 0, "y": 0, "width": 50, "height": 100}, {"id": "2", "x": 50, "y": 0, "width": 50, "height": 100}]}', 1),
    ('2 Fotos Vertical', 'Dos fotos una arriba de otra', 2,
     '{"slots": [{"id": "1", "x": 0, "y": 0, "width": 100, "height": 50}, {"id": "2", "x": 0, "y": 50, "width": 100, "height": 50}]}', 2),
    ('3 Fotos Grid', 'Una grande arriba, dos pequenas abajo', 3,
     '{"slots": [{"id": "1", "x": 0, "y": 0, "width": 100, "height": 60}, {"id": "2", "x": 0, "y": 60, "width": 50, "height": 40}, {"id": "3", "x": 50, "y": 60, "width": 50, "height": 40}]}', 3),
    ('4 Fotos Cuadrado', 'Grid 2x2 de cuatro fotos', 4,
     '{"slots": [{"id": "1", "x": 0, "y": 0, "width": 50, "height": 50}, {"id": "2", "x": 50, "y": 0, "width": 50, "height": 50}, {"id": "3", "x": 0, "y": 50, "width": 50, "height": 50}, {"id": "4", "x": 50, "y": 50, "width": 50, "height": 50}]}', 4),
    ('6 Fotos Grid', 'Grid 3x2 de seis fotos', 6,
     '{"slots": [{"id": "1", "x": 0, "y": 0, "width": 33.33, "height": 50}, {"id": "2", "x": 33.33, "y": 0, "width": 33.33, "height": 50}, {"id": "3", "x": 66.66, "y": 0, "width": 33.34, "height": 50}, {"id": "4", "x": 0, "y": 50, "width": 33.33, "height": 50}, {"id": "5", "x": 33.33, "y": 50, "width": 33.33, "height": 50}, {"id": "6", "x": 66.66, "y": 50, "width": 33.34, "height": 50}]}', 5);

-- Funcion para crear buckets de storage
-- NOTA: Ejecutar manualmente en Supabase Dashboard > Storage
-- Crear buckets:
--   1. 'originals' - Para imagenes originales subidas
--   2. 'processed' - Para imagenes procesadas
--   3. 'pdfs' - Para PDFs generados
--   4. 'templates' - Para previews de plantillas

COMMENT ON TABLE orders IS 'Pedidos de impresion de clientes';
COMMENT ON TABLE print_sizes IS 'Tamanos de impresion disponibles con precios';
COMMENT ON TABLE paper_options IS 'Tipos de papel disponibles con multiplicadores de precio';
COMMENT ON TABLE collage_templates IS 'Plantillas predefinidas para collages';
