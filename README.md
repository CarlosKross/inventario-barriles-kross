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
