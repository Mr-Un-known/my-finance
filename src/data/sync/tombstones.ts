/**
 * Lapidas de borrado.
 *
 * Sin esto la sincronizacion resucita lo borrado: si borras un gasto en el
 * telefono, el portatil todavia lo tiene, y en el siguiente "subir" lo
 * vuelve a empujar a la nube. Un borrado tiene que viajar igual que una
 * edicion, y para viajar tiene que existir como dato.
 *
 * Se guardan por (entidad, id) y se limpian cuando ya se aplicaron en
 * ambos lados.
 */
export type DeletableEntity = 'transactions' | 'categories' | 'paymentMethods' | 'recurringRules';

export interface Tombstone {
  /** `${entity}:${entityId}` — llave primaria, idempotente. */
  id: string;
  entity: DeletableEntity;
  entityId: string;
  deletedAt: string;
}

export function tombstoneId(entity: DeletableEntity, entityId: string): string {
  return `${entity}:${entityId}`;
}

export function makeTombstone(entity: DeletableEntity, entityId: string, deletedAt: string): Tombstone {
  return { id: tombstoneId(entity, entityId), entity, entityId, deletedAt };
}

/** Los ids borrados de una entidad, para filtrar lo que llega de la nube. */
export function deletedIdsOf(tombstones: Tombstone[], entity: DeletableEntity): Set<string> {
  const out = new Set<string>();
  for (const t of tombstones) if (t.entity === entity) out.add(t.entityId);
  return out;
}

/**
 * Une las lapidas locales con las remotas, quedandose con la fecha mas
 * vieja de cada una (la del borrado original, no la de la copia).
 */
export function mergeTombstones(a: Tombstone[], b: Tombstone[]): Tombstone[] {
  const byId = new Map<string, Tombstone>();
  for (const t of [...a, ...b]) {
    const prev = byId.get(t.id);
    if (!prev || t.deletedAt < prev.deletedAt) byId.set(t.id, t);
  }
  return Array.from(byId.values());
}
