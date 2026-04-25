# Comercial Victor — Next.js + Sanity CMS

Landing de catálogo para artículos de fiesta, migrada del sitio HTML/React original a **Next.js 15 + Sanity CMS**.

Todo el contenido es editable desde Sanity Studio sin tocar código.

---

## Stack

- **Next.js 15** — App Router, Server Components
- **Sanity CMS** — Studio embebido en `/studio`
- **TypeScript** — tipos completos
- **Revalidación por webhook** — cambios en Sanity actualizan el sitio en segundos sin redeploy

---

## Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx              ← Home principal (server component)
│   ├── layout.tsx            ← Layout raíz con metadata SEO
│   ├── globals.css           ← Diseño original preservado
│   ├── studio/[[...tool]]/   ← Sanity Studio embebido
│   └── api/revalidate/       ← Webhook de revalidación
├── components/
│   ├── BackgroundDecor.tsx   ← Blobs, confetti, click burst
│   ├── Navbar.tsx            ← Nav con búsqueda en tiempo real
│   ├── Hero.tsx              ← Sección hero principal
│   ├── Showcase.tsx          ← Novedades / productos destacados
│   ├── Catalogo.tsx          ← Catálogo con sidebar de categorías
│   ├── HorariosUbicacion.tsx ← Horarios + mapa
│   ├── Footer.tsx            ← Footer con CTA + redes sociales
│   ├── FabWhatsApp.tsx       ← Botón flotante de WhatsApp
│   ├── ProductHelpers.tsx    ← ProductImage, Badges, PriceDisplay
│   └── ProductModal.tsx      ← Modal de detalle de producto
├── lib/
│   ├── sanity.ts             ← Cliente Sanity (useCdn: false)
│   ├── queries.ts            ← Queries GROQ organizadas
│   └── utils.ts              ← waLink, fmtSoles
└── types/index.ts            ← Tipos TypeScript completos

sanity/schemas/
├── index.ts                  ← Registro de schemas
├── siteSettings.ts           ← Config global del negocio
└── schemas.ts                ← hero, categoria, subcategoria, producto

sanity.config.ts              ← Config Studio con estructura personalizada
```

---

## Qué es editable desde Sanity

| Sección | Schema |
|---|---|
| Nombre, WhatsApp, dirección, horarios, redes | `siteSettings` |
| Hero: título, subtítulo, CTAs, trust badges | `hero` |
| Categorías (nombre, color) | `categoria` |
| Subcategorías | `subcategoria` |
| Productos: nombre, precio, descripción, imágenes, tags, WhatsApp | `producto` |

---

## Instalación local

### 1. Clonar e instalar dependencias

```bash
npm install
```

### 2. Crear proyecto en Sanity

Si no tienes proyecto aún:

```bash
npx sanity init
```

O crea uno en [sanity.io/manage](https://sanity.io/manage) → New Project → elige dataset `production`.

### 3. Configurar variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=tu_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2026-04-24
SANITY_REVALIDATE_SECRET=comercial_victor_revalidate_2026_pon_algo_largo_aqui
NEXT_PUBLIC_SITE_URL=https://tu-dominio-estable.vercel.app
```

Tu `NEXT_PUBLIC_SANITY_PROJECT_ID` lo encuentras en:
→ [sanity.io/manage](https://sanity.io/manage) → tu proyecto → Settings → API

### 4. Correr localmente

```bash
npm run dev
```

- Web: [http://localhost:3000](http://localhost:3000)
- Studio: [http://localhost:3000/studio](http://localhost:3000/studio)

---

## Configurar CORS en Sanity

Ve a [sanity.io/manage](https://sanity.io/manage) → tu proyecto → **API** → **CORS Origins**.

Agrega estos dos origins (con **Credentials: Allowed**):

```
http://localhost:3000          ✅ Credentials: Allowed
https://TU-DOMINIO.vercel.app  ✅ Credentials: Allowed
```

⚠️ **Importante:** Agrega el **origin base**, NO rutas completas.
- ✅ Correcto: `https://fe-landing-lemon.vercel.app`
- ❌ Incorrecto: `https://fe-landing-lemon.vercel.app/studio`

---

## Cargar contenido inicial en Sanity

Una vez que el Studio funcione en `localhost:3000/studio`:

### 1. `siteSettings` (una sola vez)

- Nombre: Comercial Victor
- WhatsApp: 51987654321
- WhatsApp display: +51 987 654 321
- Dirección: Av. Los Globos 245, Miraflores, Lima
- Horarios: (agregar días/horas)
- Redes sociales: (links opcionales)

### 2. Categorías

Crear en orden (con colores hex):

| Nombre | Color |
|---|---|
| Globos con helio | #FF6B7A |
| Piñatas | #F5B841 |
| Descartables y menaje | #FF6B4A |
| Packs de cumpleaños | #8B5CF6 |
| Útiles escolares | #2B8AFF |
| Alquiler de decoración | #3B82F6 |

### 3. Subcategorías

Para cada categoría, crear sus subcategorías asignando la categoría padre.

### 4. Productos

Para cada producto completar:
- Nombre, tipo (simple/pack/alquiler)
- Subcategoría (referencia)
- Precio, unidad de venta
- Descripción y detalles
- Tags (popular/nuevo)
- Mensaje de WhatsApp específico
- Marcar como **Destacado** los que van en Novedades

---

## Desplegar en Vercel

### 1. Subir a GitHub/GitLab/Bitbucket

### 2. Importar en Vercel

[vercel.com/new](https://vercel.com/new) → Import Git Repository

### 3. Configurar variables de entorno en Vercel

Ve a tu proyecto → **Settings → Environment Variables** y agrega:

```
NEXT_PUBLIC_SANITY_PROJECT_ID    → tu project id
NEXT_PUBLIC_SANITY_DATASET       → production
NEXT_PUBLIC_SANITY_API_VERSION   → 2026-04-24
SANITY_REVALIDATE_SECRET         → tu secret largo
NEXT_PUBLIC_SITE_URL             → https://tu-dominio-estable.vercel.app
```

### 4. Hacer redeploy

Después de agregar las variables, ve a **Deployments → Redeploy** (el último deployment).

### 5. Obtener la URL estable de tu proyecto

En Vercel → tu proyecto → **Settings → Domains**.

Ejemplo: `https://comercial-victor-landing.vercel.app`

Esta es la URL **estable**. No uses las URLs temporales de deployment (las que tienen hash en el nombre).

---

## Configurar webhook de Sanity → Vercel

### URL del webhook:

```
https://TU-DOMINIO-ESTABLE.vercel.app/api/revalidate?secret=TU_SECRET_REAL
```

### En Sanity

[sanity.io/manage](https://sanity.io/manage) → tu proyecto → **API → Webhooks → Add Webhook**

| Campo | Valor |
|---|---|
| Name | Revalidate Vercel Site |
| Dataset | production |
| URL | `https://tu-dominio.vercel.app/api/revalidate?secret=TU_SECRET` |
| HTTP Method | POST |
| Trigger on | ✅ Create ✅ Update ✅ Delete |
| Drafts | ❌ Disabled |
| Versions | ❌ Disabled |
| Filter | (vacío) |
| Projection | (vacío) |
| Secret header | (vacío — el secret va en el query param) |

---

## Flujo de actualización de contenido

```
1. Editar contenido en /studio
2. Publicar cambios
3. Sanity dispara el webhook POST → /api/revalidate?secret=...
4. Next.js revalida las páginas
5. La web se actualiza en segundos sin redeploy
```

Para verificar que funciona, revisa en **Vercel → tu proyecto → Deployments → Functions** que aparezca:
```
POST /api/revalidate 200
```

---

## Notas técnicas importantes

### `useCdn: false`

El cliente Sanity está configurado con `useCdn: false`. Esto es obligatorio para este proyecto.

Con `useCdn: true`, Sanity puede devolver datos del CDN aunque Next.js revalide, haciendo que los cambios de **texto** no se reflejen. Cambios de imágenes pueden aparecer por casualidad porque las URLs de imagen cambian. Cambios de texto no tienen esa ventaja.

### Revalidación con doble respaldo

El endpoint `/api/revalidate` usa tanto `revalidateTag()` (para granularidad por tipo de documento) como `revalidatePath("/")` (como respaldo global). Esto garantiza que los cambios se reflejen incluso si los tags no se propagan correctamente.

---

## Errores comunes a evitar

| Error | Solución |
|---|---|
| CORS con `/studio` en la URL | Agrega solo el origen base sin ruta |
| URL de deployment temporal en webhook | Usa siempre la URL estable del proyecto |
| Webhook a `localhost` | Sanity no puede llamar a tu localhost — solo usar en Vercel |
| `useCdn: true` | Cambia a `false` para que revalidación funcione |
| Variables de entorno en Vercel sin redeploy | Hacer redeploy después de cambiarlas |
| Webhook sin Create/Update/Delete | Activa los tres triggers |

---

## Importación masiva de catálogo

### Cómo acceder

1. Entrá a `https://tu-dominio.vercel.app/studio`
2. En la barra lateral izquierda del Studio, buscá el ícono de flecha hacia arriba — **"Importar catálogo"**
3. Solo usuarios autenticados en Sanity pueden usarla. No hay endpoint público.

---

### Formatos soportados

- `.xlsx` — Excel (primera hoja)
- `.csv` — CSV con headers en la primera fila
- `.json` — Formato estructurado o plano

---

### Columnas del Excel / CSV

| Columna | Obligatorio | Descripción |
|---|---|---|
| `categoria` | ✅ | Nombre de la categoría |
| `categoria_slug` | No | Se genera automáticamente si está vacío |
| `categoria_color` | No | Color hex, ej: `#FF6B7A` |
| `categoria_descripcion` | No | Descripción corta |
| `categoria_orden` | No | Número de orden |
| `subcategoria` | ✅ | Nombre de la subcategoría |
| `subcategoria_slug` | No | Se genera automáticamente |
| `subcategoria_orden` | No | Número de orden |
| `producto` | No* | Si está vacío, la fila solo crea cat/subcat |
| `producto_slug` | No | Se genera desde `producto` |
| `tipo` | No | `simple` / `pack` / `alquiler` (default: simple) |
| `descripcion` | No | Descripción del producto |
| `detalles` | No | Separados por punto y coma: `Dato 1; Dato 2` |
| `precio` | No | Número, vacío = consultar |
| `mostrar_desde` | No | `sí` / `no` |
| `unidad_venta` | No | Ej: `por unidad`, `alquiler 24h` |
| `tags` | No | `popular,nuevo` (separados por coma) |
| `mensaje_whatsapp` | No | Mensaje específico para WhatsApp |
| `stock` | No | `disponible` / `bajo` / `consultar` |
| `destacado` | No | `sí` / `no` (aparece en Novedades) |
| `activo` | No | `sí` / `no` (default: sí) |
| `orden` | No | Número de orden |
| `mostrar_ahorro_pack` | No | `sí` / `no` |

**Valores aceptados para booleanos:** `sí`, `si`, `true`, `1`, `yes`

---

### Formato JSON

```json
{
  "categories": [
    {
      "name": "Globos con helio",
      "slug": "globos-con-helio",
      "color": "#FF6B7A",
      "shortDescription": "Globos para fiestas",
      "order": 1,
      "active": true
    }
  ],
  "subcategories": [
    {
      "name": "Números gigantes",
      "slug": "numeros-gigantes",
      "categorySlug": "globos-con-helio",
      "order": 1,
      "active": true
    }
  ],
  "products": [
    {
      "name": "Número metálico 40\"",
      "slug": "numero-metalico-40",
      "type": "simple",
      "subcategorySlug": "numeros-gigantes",
      "description": "Globo número metálico inflado con helio.",
      "details": ["Color: dorado", "Duración: 5 días"],
      "images": ["https://ejemplo.com/img.jpg"],
      "price": 35,
      "showFromPrice": false,
      "unit": "por unidad",
      "tags": ["popular"],
      "whatsappMessage": "Hola! Quiero el número metálico.",
      "inStock": true,
      "featured": true,
      "active": true,
      "order": 1,
      "showPackSavings": false
    }
  ]
}
```

---

### Reglas de actualización (idempotente)

El importador usa IDs estables basados en el slug:

- `categoria-{slug}` → ej: `categoria-globos-con-helio`
- `subcategoria-{slug}` → ej: `subcategoria-numeros-gigantes`
- `producto-{slug}` → ej: `producto-numero-metalico-40`

Si el documento **ya existe**, se actualiza (`createOrReplace`).
Si **no existe**, se crea.

Podés importar el mismo archivo varias veces sin duplicar datos.

---

### Imágenes

Si el archivo trae URLs de imágenes:

1. El importador intenta descargar cada imagen y subirla a Sanity Assets.
2. Si una imagen falla (URL inválida, CORS bloqueado), el producto se importa **sin imagen** y se muestra una advertencia.
3. La importación **nunca se cancela** por errores de imágenes.
4. Podés agregar las imágenes manualmente desde Studio después.

---

### Errores posibles

| Error | Causa | Solución |
|---|---|---|
| Categoría vacía | Columna `categoria` sin valor | Completar en el archivo |
| Subcategoría vacía | Columna `subcategoria` sin valor | Completar en el archivo |
| Formato no soportado | Extensión distinta a .xlsx/.csv/.json | Usar el formato correcto |
| Precio inválido | Texto en columna de precio | Usar solo números |
| URL de imagen inválida | URL malformada | Verificar la URL |

Los **errores críticos** bloquean la importación. Las **advertencias** permiten continuar.

---

### Verificar que la web se actualizó

Después de una importación exitosa:

1. Si tenés el webhook de Sanity configurado, la web se actualiza sola en 5-10 segundos.
2. Para verificar: abrí Vercel → tu proyecto → **Deployments → Functions** → buscá `POST /api/revalidate 200`.
3. Si no tenés webhook, hacé un redeploy manual en Vercel.
4. En la web pública, recargá con **Ctrl+Shift+R** para limpiar caché del navegador.

---

### Plantilla de ejemplo

Encontrás una plantilla CSV de ejemplo en:

```
sanity/tools/importCatalog/plantilla-catalogo.csv
```

Descargala, completala con tus datos y subila al importador.
