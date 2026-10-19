# Catálogos PDF — fase 1

## Uso

Entra a `/studio` con tu cuenta de Sanity y abre **Vista interactiva → Catálogos PDF**. Crea el catálogo, revisa el enlace sugerido, sube un PDF y una portada opcional. Completa descripción, etiqueta, orden, caducidad y colección si corresponde.

**Guardar borrador** conserva cambios pendientes sin modificar una versión pública existente; permite guardar sin PDF. **Publicar** valida el archivo y los campos, actualiza el documento publicado y elimina el borrador en una transacción. Para reemplazar el archivo, abre **Editar / reemplazar PDF**, sube el nuevo documento y pulsa **Publicar**: la URL permanece igual.

El slug se bloquea después de la primera publicación, incluso tras ocultar. **Ocultar** quita la página pública y excluye el catálogo del listado y sitemap. El PDF en el CDN público de Sanity puede seguir accesible por su URL directa; ocultar no revoca el acceso al archivo. Eliminar requiere confirmación y borra documento y borrador, conservando los assets compartidos.

La fecha usa la zona horaria del dispositivo administrador y se guarda en UTC. El orden admite enteros desde cero, con desempate por ID. El enlace a una colección aparece solo si está visible y tiene productos visibles. La interfaz permite buscar, filtrar por estado, copiar y compartir por WhatsApp.

## Datos, permisos y archivos

- `catalogoPdf` es independiente de `album`; usa `_createdAt` y `_updatedAt` de Sanity. `publicadoSlug` conserva el primer enlace publicado.
- Los documentos internos `catalogoPdfSlug.{slug}` reservan enlaces de manera atómica para impedir publicaciones simultáneas con el mismo slug. Se conservan tras eliminar para que enlaces antiguos nunca se reasignen a otra campaña.
- Todas las escrituras y subidas utilizan la sesión autenticada de Studio mediante `useClient`. No se añadieron rutas públicas de escritura ni tokens cliente. Si hay roles personalizados por tipo, permite a administradores gestionar `catalogoPdf`, `catalogoPdfSlug` y assets.
- Las revisiones de Sanity detectan cambios simultáneos. Si aparece un conflicto, actualiza la lista antes de volver a editar.
- Antes de subir se valida extensión, MIME, firma `%PDF-` y tamaño. Al guardar/publicar se consulta el asset de Sanity para revalidar MIME, nombre y tamaño. La acción de publicación de Studio aplica las mismas reglas. No se aceptan URLs externas como archivos.
- El límite de PDF es **50 MB**, configurable con `NEXT_PUBLIC_CATALOGO_PDF_MAX_MB` y un nuevo despliegue. Las portadas admiten JPG, PNG y WebP hasta 10 MB.

## Lecturas y caché

`src/lib/catalogosPdfQueries.ts` contiene consultas reutilizables y tipadas para listado, detalle, slugs de sitemap y editor. Las públicas exigen visibilidad explícita, PDF resuelto y vigencia, y excluyen `drafts.*` y `versions.*`. El editor consulta perspectiva `raw` y agrupa versiones públicas y borradores.

`/catalogos`, `/catalogos/[slug]` y el sitemap son dinámicos. Las lecturas de catálogos usan la API de Sanity sin CDN y `cache: no-store`. Publicar, reemplazar, ocultar o eliminar se refleja en la próxima petición sin depender del webhook; la caducidad se evalúa en cada lectura. Una página ya abierta requiere recarga. Los otros datos del sitemap conservan su caché existente.

Las portadas sociales usan URLs públicas del CDN de Sanity a 1200×630; sin portada se reutiliza la imagen social de marca. WhatsApp y otras plataformas pueden conservar su propia caché de previews.

## Configurar el webhook

Mantén `SANITY_REVALIDATE_SECRET` solo en el servidor. En **Sanity Manage → API → Webhooks** configura:

- URL: `https://TU_DOMINIO/api/revalidate?secret=TU_SECRETO`.
- Dataset: el de `NEXT_PUBLIC_SANITY_DATASET`.
- Método POST; eventos Create, Update y Delete; desactivar eventos de borradores.
- Filtro: `_type in ["siteSettings", "hero", "featuredGallery", "categoria", "subcategoria", "producto", "album", "catalogoPdf"] && !(_id in path("drafts.**")) && !(_id in path("versions.**"))`.
- Proyección: `{ "_type": coalesce(after()._type, before()._type), "_id": coalesce(after()._id, before()._id) }`.

El endpoint verifica el secreto y revalida la etiqueta documental, `/catalogos`, `/catalogos/[slug]`, `/sitemap.xml` y las rutas existentes. Las reservas internas de slug no necesitan webhook.

## Verificar después de desplegar

1. Guarda un borrador sin PDF. Debe quedar fuera del listado y sitemap, y su URL debe devolver 404.
2. Sube un PDF y publica. En una ventana privada verifica listado, detalle, visor, descarga, WhatsApp, `canonical`, Open Graph y Twitter en el HTML.
3. Reemplaza el PDF y publica: la misma URL debe abrir el nuevo asset sin duplicar el catálogo.
4. Oculta y recarga: listado y sitemap deben excluirlo y el detalle devolver 404. Publica con caducidad cercana y repite al llegar la hora.
5. Elimina con confirmación: la página devuelve 404 y los assets siguen presentes.
6. Comprueba en los logs de Sanity y del despliegue `POST /api/revalidate` con respuesta 200; sin secreto debe devolver 401. Repite con un producto/colección para verificar el flujo existente.
7. En móvil verifica compartir y copiar. Si no incrusta PDFs, utiliza **Ver catálogo**, el enlace alternativo junto al visor o **Descargar PDF**.

Estas comprobaciones de producción requieren desplegar y una sesión real de administrador; no se presuponen realizadas mediante las pruebas locales.

## Pruebas locales

```powershell
npx.cmd tsc --noEmit
node --test tests/catalogos-pdf.test.cjs
npm.cmd run build
```

Las pruebas ejecutan GROQ con datos controlados y verifican expiración exacta, orden estable, assets, archivos falsos, slugs, WhatsApp, borradores, reemplazos, ocultación, eliminación y concurrencia. Las escrituras usan un cliente simulado para no modificar el dataset de producción.
