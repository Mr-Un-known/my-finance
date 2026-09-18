/// Lápidas de borrado.
///
/// Sin esto la sincronización resucita lo borrado: si borras un gasto en el
/// teléfono, el portátil todavía lo tiene, y en el siguiente "subir" lo
/// vuelve a empujar a la nube. Un borrado tiene que viajar igual que una
/// edición, y para viajar tiene que existir como dato.
///
/// Espejo de src/data/sync/tombstones.ts.
library;

enum DeletableEntity {
  transactions,
  categories,
  paymentMethods,
  recurringRules;

  static DeletableEntity desdeJson(String v) =>
      DeletableEntity.values.firstWhere((e) => e.name == v);
  String get json => name;
}

class Tombstone {
  const Tombstone({required this.entity, required this.entityId, required this.deletedAt});

  final DeletableEntity entity;
  final String entityId;
  final String deletedAt;

  /// `entidad:id` — llave primaria, idempotente.
  String get id => tombstoneId(entity, entityId);

  Map<String, Object?> toJson() => {
        'id': id,
        'entity': entity.json,
        'entityId': entityId,
        'deletedAt': deletedAt,
      };

  static Tombstone fromJson(Map<String, Object?> j) => Tombstone(
        entity: DeletableEntity.desdeJson(j['entity']! as String),
        entityId: j['entityId']! as String,
        deletedAt: j['deletedAt']! as String,
      );

  @override
  bool operator ==(Object other) =>
      other is Tombstone && other.id == id && other.deletedAt == deletedAt;

  @override
  int get hashCode => Object.hash(id, deletedAt);
}

String tombstoneId(DeletableEntity entity, String entityId) => '${entity.name}:$entityId';

/// Los ids borrados de una entidad, para filtrar lo que llega de la nube.
Set<String> deletedIdsOf(List<Tombstone> tombstones, DeletableEntity entity) =>
    tombstones.where((t) => t.entity == entity).map((t) => t.entityId).toSet();

/// Une las lápidas locales con las remotas, quedándose con la fecha más
/// vieja de cada una (la del borrado original, no la de la copia).
List<Tombstone> mergeTombstones(List<Tombstone> a, List<Tombstone> b) {
  final byId = <String, Tombstone>{};
  for (final t in [...a, ...b]) {
    final prev = byId[t.id];
    if (prev == null || t.deletedAt.compareTo(prev.deletedAt) < 0) byId[t.id] = t;
  }
  return byId.values.toList();
}
