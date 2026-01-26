-- Agregar columna is_color a la tabla orders
-- true = impresión a color, false = blanco y negro
-- Default: true (la mayoría de órdenes son a color)

ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_color BOOLEAN DEFAULT true;

-- Comentario para documentar
COMMENT ON COLUMN orders.is_color IS 'true = color, false = blanco y negro';
