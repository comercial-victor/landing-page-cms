# Corrección logo/loader/social

Cambios aplicados:

- `getSiteSettings()` ahora prioriza el singleton `_id == "siteSettings"` para evitar que distintas páginas lean otro documento de configuración si existiera más de uno.
- Navbar y Footer usan el mismo helper `brandLogoImage()`.
- El loader de navegación recibe el logo de Sanity desde `RootLayout`, con fallback a `/logo-comercial-victor.png`.
- La imagen social/Open Graph general usa el logo de Sanity mediante `brandShareImage()`.
- Productos mantienen su propia imagen como `og:image`; si un producto no tiene imagen, cae al logo del sitio.
- Se retiró el campo `SEO: Imagen social` del schema para evitar confusión: ahora la imagen social general se toma del logo en Configuración del Sitio.

Nota: el favicon de pestaña/Google sigue siendo independiente (`favicon.ico`, `favicon.svg`, etc.).
