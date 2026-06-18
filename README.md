# Inventario Barriles Kross

Aplicación React + TypeScript + Tailwind para toma de inventario de barriles por sucursal, con panel administrador para SKU y sucursales.

## Ejecutar local

```bash
npm install
npm run dev
```

## Modo 100% gratuito recomendado

La forma sin costos asociados es usar la app como sitio estático:

- Hosting gratuito: GitHub Pages u otro hosting estático gratis.
- Persistencia: `localStorage` del navegador.
- Respaldo: exportación/importación JSON desde el dashboard admin.
- Consolidación: CSV por inventario o respaldo JSON completo.
- Backend: ninguno obligatorio.

Para generar los archivos publicables:

```bash
npm run build
```

El resultado queda en `dist/`.

## Rutas principales

- `/` ingreso manual de inventario.
- `/ingreso/{slug}?token={access_token}` ingreso público por link de sucursal.
- `/admin/login` login administrador.
- `/admin/dashboard` resumen admin.
- `/admin/skus` mantención de SKU.
- `/admin/sucursales` mantención de sucursales y links.
- `/admin/demanda` importación de ventas y cálculo de cobertura.

## Ventas desde Google Sheets

Para analizar demanda sin costos:

1. En Google Sheets, puedes usar columnas simples: `fecha`, `sucursal`, `sku`, `litros_vendidos`.
2. También acepta la hoja Kross actual con columnas: `Fecha`, `Tipo salida`, `Descripción`, `Tipo`, `Formato`, `Litros`, `Destino` y `Destino Corregido`.
3. La app filtra `Tipo salida = Venta`, `Tipo = CERVEZA` y `Formato = BARRIL`.
4. También puedes usar `barriles_vendidos`; la app lo convierte a litros con barriles de 30 L.
5. Comparte o publica la hoja como CSV.
6. En la app, entra a **Admin > Demanda** y pega la URL normal de Google Sheets o importa un archivo `.csv`.

Si el enlace de Google pide iniciar sesión, la app no podrá leerlo. Debe estar publicado o compartido como lector.

Política de reposición:

- Reposición de barriles: semanal.
- Inventario mínimo recomendado: 10 días.
- Inventario máximo recomendado: 15 días.
- La app marca `Falta` bajo 10 días y `Sobrestock` sobre 15 días.
- Los barriles sugeridos reponen hasta el objetivo de 15 días de cobertura.

## Supabase opcional

La app funciona gratis en modo local si no hay variables Supabase. En ese modo usa `localStorage` y no requiere cuentas, servidores ni servicios externos.

Para activar Supabase en un proyecto Free:

1. Copia `.env.example` a `.env`.
2. Completa:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

3. Ejecuta el SQL de `supabase/schema.sql` en el SQL Editor de Supabase.
4. Crea usuarios administradores desde Supabase Auth.

La app usa solo Supabase Auth, tablas Postgres, RLS y una función RPC para validar links por token. No usa Edge Functions, Storage, servicios pagos ni backend propio.

Si Supabase no está configurado o falla, el modo local sigue disponible para operar sin costos.
