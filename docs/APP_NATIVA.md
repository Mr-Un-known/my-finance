# App nativa (Flutter) y emulador de iPhone — estado y decisión

Pedido: *"crear una app directamente que pueda instalar en mi celular […]
descarga emulador para verlo directamente aquí […] creo que la mejor
opción es Flutter"*.

Esto es lo que se hizo, lo que no, y por qué.

## Lo que se hizo

**Instalar en el iPhone: ya funciona, sin Flutter.** El proyecto es una
PWA completa (`vite-plugin-pwa`, manifest, service worker, íconos,
`apple-mobile-web-app-*`). En el iPhone: abrir la URL en Safari →
**Compartir** → **Agregar a inicio**. Queda como app: ícono propio,
pantalla completa sin barra de Safari, funciona sin internet (todo vive en
IndexedDB), y las URLs de Atajos (`docs/ATAJOS_IOS.md`) la abren a ella y
no al navegador.

**Verlo en un iPhone desde acá:**

```bash
npm run dev -- --port 5199        # en una terminal
npm run preview:iphone            # en otra: ventana WebKit, iPhone 14 Pro
npm run preview:iphone -- --shots # solo capturas en preview-shots/
```

WebKit es el mismo motor que Safari de iOS, con viewport, user-agent y
safe-area de iPhone. Para una app web, ver esto es ver la app.

**Verlo en tu iPhone real**, que es mejor que cualquier emulador:
`npm run dev -- --host` imprime una URL de red; ábrela desde el teléfono
estando en el mismo WiFi.

## Lo que NO se hizo, y por qué

**El emulador de iOS está bloqueado por algo que no puedo hacer yo.**
Requiere Xcode completo (~17 GB) desde la Mac App Store, con tu Apple ID.
En este Mac solo están las Command Line Tools:

```
$ xcode-select -p
/Library/Developer/CommandLineTools
$ xcrun simctl list devices
xcrun: error: unable to find utility "simctl", not a developer tool
```

Sin Xcode no hay Simulator, con o sin Flutter. Y aunque estuviera
instalado, un Simulator es una app de macOS: no se puede meter dentro de
esta terminal para que lo toques acá.

**El port a Flutter no se empezó.** No es pereza con el toolchain
(`brew install --cask flutter` son ~10 minutos): es que el port reescribe
lo único que en este proyecto ya está probado. Hoy hay 123 tests unitarios
y 20 E2E sobre quincenas, ciclos de tarjeta, recurrentes, presupuestos,
inferencia de conceptos y sincronización con Supabase. Nada de eso cruza a
Dart: se reescribe desde cero, sin tests, y el resultado inicial es
estrictamente peor que lo que ya corre.

Flutter se justifica cuando hace falta algo que la web en iOS no da:
widgets de pantalla de inicio, Face ID, notificaciones push locales
fiables, lectura de SMS. De esa lista, lo único que pediste —**meter
ingresos sin abrir la app**— ya está resuelto con Atajos, que además puede
leer el SMS del banco, cosa que una app de terceros en iOS no puede.

## Si aun así quieres el port

Es tu decisión y no hace falta discutirla de nuevo; solo que se empiece
sabiendo el tamaño:

```bash
brew install --cask flutter
# Xcode: instalarlo tú desde la Mac App Store (~17 GB, pide tu Apple ID)
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
flutter doctor            # debe quedar todo en verde
flutter create --org com.anfe --platforms=ios,android my_finance_app
```

Orden de port que conserva el valor: primero `lib/domain/` (fechas,
quincena, tarjeta, recurrentes, totales) **con sus tests portados uno a
uno** — son funciones puras, se traducen casi literales y son el corazón
de la app. Recién después las pantallas. La capa de datos (Dexie →
`sqflite` o `drift`) y la sync con Supabase son lo último y lo más caro.
