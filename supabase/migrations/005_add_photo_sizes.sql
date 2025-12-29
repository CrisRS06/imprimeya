-- Agregar nuevos tamanos de impresion para fotos
-- Estos tamanos se usan en el flujo de fotos con layouts multiples

INSERT INTO print_sizes (name, width_inches, height_inches, width_px_optimal, height_px_optimal, width_px_min, height_px_min, base_price, sort_order)
VALUES
    ('3x5', 3, 5, 900, 1500, 450, 750, 400, 5),
    ('wallet', 2, 3, 600, 900, 300, 450, 200, 6),
    ('carnet', 1.5, 2, 450, 600, 225, 300, 150, 7)
ON CONFLICT (name) DO NOTHING;
