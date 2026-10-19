import { cache } from "react";
import { sanityClient } from "./sanity";
import type { CatalogoPdf } from "./catalogosPdf";

export const publicCatalogFilter = `_type == "catalogoPdf" && !(_id in path("drafts.**")) && !(_id in path("versions.**")) && visible == true && defined(slug.current) && defined(archivo.asset->url) && archivo.asset->mimeType == "application/pdf" && (!defined(fechaCaducidad) || dateTime(fechaCaducidad) > dateTime(now()))`;
export const catalogProjection = `{_id,_rev,_type,_createdAt,_updatedAt,titulo,slug,descripcion,archivo,portada,visible,orden,etiqueta,fechaCaducidad,publicadoSlug,coleccionRelacionada,
 "pdf": archivo.asset->{_id,url,originalFilename,size,mimeType},
 "coleccion": coleccionRelacionada-> {titulo,"slug":slug.current,"visible":visible,"items":count(items[visible != false && producto->visible != false && defined(producto->_id)])}
}`;
export const publicCatalogQuery = `*[${publicCatalogFilter}] | order(coalesce(orden,0) asc, _id asc) ${catalogProjection}`;
export const catalogBySlugQuery = `*[${publicCatalogFilter} && slug.current == $slug][0] ${catalogProjection}`;
export const catalogSitemapQuery = `*[${publicCatalogFilter}] | order(_id asc){"slug":slug.current,"updatedAt":_updatedAt}`;
// Raw perspective is essential to expose both drafts and published documents in Studio.
export const editorCatalogQuery = `*[_type == "catalogoPdf" && !(_id in path("versions.**"))] | order(coalesce(orden,0) asc, _id asc) ${catalogProjection}`;
// Uncached reads enforce visibility and exact expiration on every request, even without a webhook.
const options = { perspective: "published" as const, cache: "no-store" as const, next: { tags: ["catalogoPdf"] } };
export const getCatalogosPdf = cache(() => sanityClient.fetch<CatalogoPdf[]>(publicCatalogQuery, {}, options));
export const getCatalogoPdfPorSlug = cache((slug: string) => sanityClient.fetch<CatalogoPdf | null>(catalogBySlugQuery, { slug }, options));
export function getCatalogoPdfSlugs() { return sanityClient.fetch<{slug: string; updatedAt: string}[]>(catalogSitemapQuery, {}, options); }
