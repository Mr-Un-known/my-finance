import 'package:flutter/material.dart';

import '../../data/local_repository.dart';
import '../../domain/dates.dart';
import '../../domain/money/format.dart';
import '../../domain/quincena/balance.dart';
import '../../domain/quincena/quincena.dart';
import '../../domain/totals/month_flow.dart';
import '../../domain/types.dart';
import '../../ui/tokens.dart';

/// Inicio: cómo termina el mes y qué falta que pase.
///
/// Es la misma jerarquía que la app web después de los arreglos: el número
/// grande es lo que queda al final del mes, y debajo los cuatro números que
/// lo componen — ninguno de los cuatro puede ser negativo, que era el
/// problema del viejo "Disponible ahora".
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, required this.repo});

  final LocalRepository repo;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late final IsoDate _hoy = todayIso();
  late int _year = parseIso(_hoy).y;
  late int _month = parseIso(_hoy).m;

  Settings _settings = settingsPorDefecto;
  List<Transaction> _todas = const [];
  Map<String, Category> _categorias = const {};
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final settings = await widget.repo.getSettings();
    final txs = await widget.repo.listTransactions();
    final cats = await widget.repo.listCategories();
    if (!mounted) return;
    setMoneyLocale(settings.locale, settings.currency);
    setState(() {
      _settings = settings;
      _todas = txs;
      _categorias = {for (final c in cats) c.id: c};
      _cargando = false;
    });
  }

  void _moverMes(int delta) {
    final sig = shiftMonth(_year, _month, delta);
    setState(() {
      _year = sig.y;
      _month = sig.m;
    });
  }

  bool get _esMesActual {
    final h = parseIso(_hoy);
    return h.y == _year && h.m == _month;
  }

  /// Las transacciones del mes visible, por quincena (no por mes calendario):
  /// el arriendo del 1 de octubre pertenece a la quincena del 25 de septiembre.
  List<Transaction> get _delMes {
    final claves = quincenasOfMonth(_year, _month).toSet();
    return withResolvedQuincena(_todas, _settings.quincenaStartDays)
        .where((r) => claves.contains(r.key))
        .map((r) => r.tx)
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    if (_cargando) {
      return const Scaffold(
        backgroundColor: T.paper,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final resueltas = withResolvedQuincena(_todas, _settings.quincenaStartDays);
    final balance = calculateMonthBalance(resueltas, _year, _month);
    final delMes = _delMes;
    final flujo = calculateMonthFlow(delMes);
    final proximos = selectUpcoming(delMes);

    final diaHoy = parseIso(_hoy).d;
    final quincenaActiva = !_esMesActual
        ? -1
        : (diaHoy < _settings.quincenaStartDays[1] ? 0 : 1);
    final acento = quincenaActiva == 1 ? T.q25 : T.q10;
    final tinte = quincenaActiva == 1 ? T.q25Soft : T.q10Soft;

    return Scaffold(
      backgroundColor: T.paper,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _cargar,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
            children: [
              _Encabezado(
                titulo: _settings.displayName.isEmpty ? 'Inicio' : 'Hola, ${_settings.displayName}',
                mes: '${nombreMes(_month)} $_year',
                puedeVolverHoy: !_esMesActual,
                onAnterior: () => _moverMes(-1),
                onSiguiente: () => _moverMes(1),
                onHoy: () {
                  final h = parseIso(_hoy);
                  setState(() {
                    _year = h.y;
                    _month = h.m;
                  });
                },
              ),
              const SizedBox(height: 16),
              _Hero(balance: balance, flujo: flujo, acento: acento, tinte: tinte),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _QuincenaCard(
                      dia: _settings.quincenaStartDays[0],
                      restante: balance.quincenas[0].restante,
                      color: T.q10,
                      suave: T.q10Soft,
                      activa: quincenaActiva == 0,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _QuincenaCard(
                      dia: _settings.quincenaStartDays[1],
                      restante: balance.quincenas[1].restante,
                      color: T.q25,
                      suave: T.q25Soft,
                      activa: quincenaActiva == 1,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              const _TituloSeccion('Falta este mes'),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _Espera(
                      etiqueta: 'Esperas recibir',
                      valor: flujo.porRecibir,
                      color: T.positive,
                      signo: '+',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _Espera(
                      etiqueta: 'Esperas gastar',
                      valor: flujo.porPagar,
                      color: T.danger,
                      signo: '−',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              if (proximos.isEmpty)
                Text(
                  'Nada pendiente en ${nombreMes(_month).toLowerCase()}. 🎉',
                  style: const TextStyle(color: T.textFaint, fontSize: 14),
                )
              else
                _ListaProximos(
                  items: proximos,
                  categorias: _categorias,
                  hoy: _hoy,
                  esMesActual: _esMesActual,
                  onToggle: (tx) async {
                    await widget.repo.saveTransaction(tx.copyWith(
                      status: tx.isPaid ? TransactionStatus.pending : TransactionStatus.paid,
                      updatedAt: nowIso(),
                    ));
                    await _cargar();
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Encabezado extends StatelessWidget {
  const _Encabezado({
    required this.titulo,
    required this.mes,
    required this.puedeVolverHoy,
    required this.onAnterior,
    required this.onSiguiente,
    required this.onHoy,
  });

  final String titulo;
  final String mes;
  final bool puedeVolverHoy;
  final VoidCallback onAnterior;
  final VoidCallback onSiguiente;
  final VoidCallback onHoy;

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Text(
              titulo,
              style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w700, letterSpacing: -0.7),
            ),
          ),
          IconButton(
            onPressed: onAnterior,
            icon: const Icon(Icons.chevron_left, color: T.q10),
            tooltip: 'Mes anterior',
          ),
          GestureDetector(
            onTap: puedeVolverHoy ? onHoy : null,
            child: Text(
              mes,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: puedeVolverHoy ? T.q10 : T.textMuted,
              ),
            ),
          ),
          IconButton(
            onPressed: onSiguiente,
            icon: const Icon(Icons.chevron_right, color: T.q10),
            tooltip: 'Mes siguiente',
          ),
        ],
      );
}

class _Hero extends StatelessWidget {
  const _Hero({required this.balance, required this.flujo, required this.acento, required this.tinte});

  final MonthBalance balance;
  final MonthFlow flujo;
  final Color acento;
  final Color tinte;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
        decoration: BoxDecoration(
          color: Color.alphaBlend(tinte.withValues(alpha: 0.65), T.surface),
          borderRadius: BorderRadius.circular(T.radiusL),
          border: Border.all(color: acento.withValues(alpha: 0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'TE QUEDA ESTE MES',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: acento,
                letterSpacing: 0.4,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              formatMoney(balance.sobrante),
              style: TextStyle(
                fontSize: 40,
                fontWeight: FontWeight.w700,
                letterSpacing: -1,
                color: balance.sobrante >= 0 ? T.text : T.danger,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Ingresos menos gastos del mes, contando lo pagado y lo que falta.',
              style: TextStyle(fontSize: 13, color: T.textMuted, height: 1.35),
            ),
            const SizedBox(height: 14),
            ClipRRect(
              borderRadius: BorderRadius.circular(T.radiusS),
              child: Column(
                children: [
                  Row(children: [
                    _Celda('Ya recibiste', flujo.recibido, T.positive),
                    _Celda('Falta recibir', flujo.porRecibir, T.positive.withValues(alpha: 0.75)),
                  ]),
                  const SizedBox(height: 1),
                  Row(children: [
                    _Celda('Ya pagaste', flujo.pagado, T.text),
                    _Celda('Falta pagar', flujo.porPagar, T.danger.withValues(alpha: 0.85)),
                  ]),
                ],
              ),
            ),
          ],
        ),
      );
}

class _Celda extends StatelessWidget {
  const _Celda(this.etiqueta, this.valor, this.color);

  final String etiqueta;
  final int valor;
  final Color color;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Container(
          color: T.surface,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          margin: const EdgeInsets.only(right: 1),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(etiqueta, style: const TextStyle(fontSize: 12, color: T.textMuted)),
              const SizedBox(height: 2),
              Text(
                formatMoney(valor),
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: color),
              ),
            ],
          ),
        ),
      );
}

class _QuincenaCard extends StatelessWidget {
  const _QuincenaCard({
    required this.dia,
    required this.restante,
    required this.color,
    required this.suave,
    required this.activa,
  });

  final int dia;
  final int restante;
  final Color color;
  final Color suave;
  final bool activa;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: suave,
          borderRadius: BorderRadius.circular(T.radiusM),
          border: Border.all(color: activa ? color : Colors.transparent, width: 2),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'QUINCENA DEL $dia',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color),
            ),
            const SizedBox(height: 6),
            Text(
              formatMoney(restante),
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w700,
                color: restante >= 0 ? T.text : T.danger,
              ),
            ),
          ],
        ),
      );
}

class _TituloSeccion extends StatelessWidget {
  const _TituloSeccion(this.texto);
  final String texto;

  @override
  Widget build(BuildContext context) => Text(
        texto.toUpperCase(),
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: T.textMuted,
          letterSpacing: 0.4,
        ),
      );
}

class _Espera extends StatelessWidget {
  const _Espera({required this.etiqueta, required this.valor, required this.color, required this.signo});

  final String etiqueta;
  final int valor;
  final Color color;
  final String signo;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: T.surface,
          borderRadius: BorderRadius.circular(T.radiusM),
          border: Border.all(color: T.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(etiqueta, style: const TextStyle(fontSize: 12, color: T.textMuted)),
            const SizedBox(height: 3),
            Text(
              valor > 0 ? '$signo ${formatMoney(valor)}' : formatMoney(valor),
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w700,
                color: valor > 0 ? color : T.textFaint,
              ),
            ),
          ],
        ),
      );
}

class _ListaProximos extends StatelessWidget {
  const _ListaProximos({
    required this.items,
    required this.categorias,
    required this.hoy,
    required this.esMesActual,
    required this.onToggle,
  });

  final List<Transaction> items;
  final Map<String, Category> categorias;
  final IsoDate hoy;
  final bool esMesActual;
  final Future<void> Function(Transaction) onToggle;

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
          color: T.surface,
          borderRadius: BorderRadius.circular(T.radiusM),
          border: Border.all(color: T.line),
        ),
        child: Column(
          children: [
            for (var i = 0; i < items.length; i++)
              _Fila(
                tx: items[i],
                categoria: categorias[items[i].categoryId],
                vencido: esMesActual && items[i].relevantDate.compareTo(hoy) < 0,
                ultima: i == items.length - 1,
                onToggle: () => onToggle(items[i]),
              ),
          ],
        ),
      );
}

class _Fila extends StatelessWidget {
  const _Fila({
    required this.tx,
    required this.categoria,
    required this.vencido,
    required this.ultima,
    required this.onToggle,
  });

  final Transaction tx;
  final Category? categoria;
  final bool vencido;
  final bool ultima;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final ymd = parseIso(tx.relevantDate);
    final fecha = '${ymd.d} ${nombreMes(ymd.m).substring(0, 3).toLowerCase()}';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        border: ultima ? null : const Border(bottom: BorderSide(color: T.line)),
      ),
      child: Row(
        children: [
          Semantics(
            button: true,
            label: tx.isIncome ? 'Marcar como recibido' : 'Marcar como pagado',
            child: InkWell(
              onTap: onToggle,
              customBorder: const CircleBorder(),
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: tx.isPaid ? T.positive : Colors.transparent,
                  border: Border.all(color: tx.isPaid ? T.positive : T.lineStrong, width: 1.5),
                ),
                child: tx.isPaid
                    ? const Icon(Icons.check, size: 16, color: Colors.white)
                    : null,
              ),
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 28,
            child: Text(
              categoria?.icon ?? (tx.isIncome ? '💰' : '✳️'),
              style: const TextStyle(fontSize: 20),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tx.concept,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 16),
                ),
                Text(
                  vencido ? 'venció $fecha' : fecha,
                  style: TextStyle(fontSize: 12, color: vencido ? T.danger : T.textMuted),
                ),
              ],
            ),
          ),
          Text(
            '${tx.isIncome ? '+ ' : ''}${formatMoney(tx.amount)}',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: tx.isIncome ? T.positive : T.text,
            ),
          ),
        ],
      ),
    );
  }
}
