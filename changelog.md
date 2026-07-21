> Cambios del **frontend** (`symbiocreation-ui`). Los cambios del **backend** están en `symbiocreation-res/CHANGELOG.md`.

# 31/07/24 mramirez
✔ Se ha cambiado la extensión de varios archivos css por scss para hacer uso de sass en distintas secciones de la web
✔ Se han agregado los módulos MatSidenavModule, MatGridListModule y CdkAccordionModule
✔ Para los nodos se ha reordenado como se pintan
✔ Para el svg del área de trabajo se ha deshabilitado el click derecho
✔ Para los controles se han agregado variables y limites para que el usuario pueda controlar estas opciones desde la interfaz
✔ Para los diseños mobile, se ha agregado un "media only screen" con max-width: 768px para usar estilos que solo aplicaran para mobile
✔ Se ha dejado código comentado para una V2 del popup de ideas para una futura versión
✔ Se ha dejado una función comentada para mostrar una cuadricula en el área de trabajo de simbiocreación

# 12/08/24 mramirez
✔ Se ha agregado la funcionalidad de agregar ideas al hacer doble click
✔ Se ha agregado menor límite para la fuerza y el orden para los graficos
✔ Se ha agregado un diseño básico para la información del perfil
✔ Se ha corregido el error que solo se podia ver el detalle al hacer click en los lugares donde no estan los nombres en los nodos
✔ Corregido redireccionamiento al ingresar al link /dashboard
✔ Agregado opción "Sin Grupo" para los nodos

# 23/08/24 mramirez
✔ Se ha rediseñado la plataforma con el nuevo diseño del figma
⚠ Pendiente refactorizar código luego de la migración a una versión actual, el código agregado es html css y js, no se han creado nuevos módulos

# 26/08/24 mramirez
✔ Quitado puntos en el área de trabajo de las symbiocreaciones
✔ Agregado sombras para los nodos de las symbiocreaciones

# 27/08/24 mramirez
✔ Cambiado diseño del contenedor de Mi(s) Ideas de las symbiocreaciones
✔ Agregado Carousel desktop y mobile para mostrar las imagenes adjuntas de cada idea

# 28/08/24 mramirez
✔ Agregado Menu nuevo para versión mobile
✔ Corregido colores de los bordes de explora y mis symbiocreaciones
✔ Cambiado el modo default de la lista de mis simbiocreaciones, del modo lista al modo tarjetas
✔ Corregido diseño del Carousel

# 31/07/25 mramirez
✔ Corregido el problema de que no se mostraban los participantes en la lista de mis simbiocreaciones

# 01/08/25 mramirez
✔ Agregado iterado de participantes a la lista de simbiocreaciones

# 02/08/25 mramirez
✔ Corregido problema de paginación en la lista de simbiocreaciones

# 14/12/24
✔ Movidas las credenciales de Auth0 a los archivos de environment (environment.ts y environment.prod.ts)
✔ Corregido problema de redirección cuando el usuario tiene sesión activa y entra a la web
✔ Actualizado README.md con instrucciones de instalación y comandos de build

# 26/03/26
✔ Cambiado mensaje generado por chatgpt
✔ Agregado buscador de vista Explore

# 27/03/26
✔ Agregada librerias de traduccion @ngx-translate/core y @ngx-translate/http-loader

# 28/06/26
✔ Migración Angular 17 → 22 (Material, RxJS 7, TypeScript 6, zone.js 0.15)
✔ Migración ngx-translate v15 → v18 (nueva API con provideTranslateService)
✔ Optimización de rendimiento D3

# 11/07/26 mramirez
✔ [Ideas IA] Los mensajes informativos ("se necesitan más ideas") se muestran como aviso no accionable; ya no se pueden guardar como idea real del nodo 
✔ [Ideas IA] Manejo de error: ante un fallo ya no gira el spinner indefinidamente; se muestra mensaje de error. Sin resultados muestra un aviso claro en vez de un encabezado vacío
✔ [Busco inspiración] Nuevo botón bajo el aviso de "sin ideas" que genera 3 ideas basadas en el tema de la sesión (consume el nuevo endpoint del backend)
✔ [Ideas IA] El botón "Generar ideas con IA" ahora regenera al re-presionarlo (respetando si eran sugerencias o inspiración); botón "Reintentar" en error/sin-resultados; feedback de hover sobre cada idea
✔ [Generar imagen IA] Corregido: ante un fallo el botón ya no queda deshabilitado ni con spinner infinito; se re-habilita y sirve de reintento
✔ [Generar imagen IA] Mensaje de error específico según la causa que informa el backend (sin cuota / políticas de contenido / genérico)
✔ i18n: nuevas claves para los mensajes de sugerencias, inspiración e imagen (es/en)
✔ [Manejo de errores de arranque] Ante fallos de autenticación (Auth0) o de API al ingresar a la web, se muestra un snackbar de error por 10s en vez de dejar la pantalla en blanco o el spinner infinito. El error crudo sigue visible en Network y consola (`console.error`) para poder depurarlo luego. Puntos cubiertos: `AuthGuard` (catchError), `AuthService` (localAuthSetup y callback de login), `AppComponent` y `MySymbiocreations` (además corta el spinner global)
✔ Nuevo `NotificationService` (`showError`) con snackbar de 10s y dedupe para no mostrar snackbars duplicados cuando una misma falla dispara varias suscripciones; claves i18n `COMMON.ERROR_GENERIC` y `COMMON.ERROR_AUTH`
✔ [Simbiocreación] Agregado buscador para filtrar el listado de participantes (Grupos > Participantes), entre el título y la lista. La lógica de filtrado (`listFilter1`/`performFilter1`) ya existía en el componente pero faltaba el input; además el filtro ahora se re-aplica tras actualizaciones en vivo (RSocket). Clave i18n `SYMBIO.SEARCH_PARTICIPANTS`
✔ [Simbiocreación] Al presionar el nombre de un participante, su idea ahora se **centra** (pan/zoom con animación) en el grafo además de abrir el detalle. Si el participante tiene varias ideas, cada click **cicla** a la siguiente (reemplaza el antiguo diálogo selector). Nuevo canal `SharedService.centerNode$` + método `centerNode` en el grafo (conserva el zoom actual)
✔ [Simbiocreación] Agregado buscador de grupos (Grupos > Grupos), análogo al de participantes, usando la lógica existente `listFilter2`/`performFilter2`. En ambos buscadores el ícono de lupa se movió a la derecha (se muestra la lupa cuando está vacío y la "×" para limpiar cuando hay texto). Clave i18n `SYMBIO.SEARCH_GROUPS`
✔ [Simbiocreación] El centrado en el grafo se centralizó en `openIdeaDetailSidenav`: ahora al abrir el detalle de cualquier idea desde el listado (grupos, participantes, "mis ideas", menú "ver idea") el nodo se centra. En particular, hacer click en un grupo también lo centra
✔ [Explore] Quitados los botones Todas / Próximas / Pasadas. La vista funciona por defecto como "Todas" (públicas), pero ahora ordenadas por **fecha de creación descendente** (el orden lo aplica el backend). Se simplificó el componente (helpers `refresh`/`loadPage`) y se removieron las claves i18n `EXPLORE.FILTER_*`
✔ [Explore] Agregados dos filtros de fecha (Desde / Hasta) al lado del buscador por texto, que filtran por **fecha de creación**. Ambos opcionales: solo Desde → de esa fecha en adelante; solo Hasta → hasta esa fecha; ambos → rango. Se aplican al cambiar la fecha (y con "Buscar"), con botón "×" para limpiar cada uno. Se envían al backend como epoch millis (inicio/fin del día). Claves i18n `EXPLORE.DATE_FROM` / `EXPLORE.DATE_TO`
✔ [Explore] Corregida la alineación de la barra de búsqueda: los campos de fecha ocultaban distinto el subscript de Material y quedaban más altos que el buscador. Ahora todos alinean (misma altura) y la barra es responsive: en desktop va en una fila (con wrap si no cabe) y en mobile el buscador queda full-width, las dos fechas 50/50 y el botón full-width
✔ [Explore] Corregido el título "Explora" + paginador (`.title-container`): el `<h2>` conservaba su `margin-top` por defecto del navegador (solo se ponía `margin-bottom: 0`), lo que lo descentraba respecto al paginador en desktop; ahora `h2 { margin: 0 }`. Se movió el margin-top/bottom hardcodeado del inline al CSS y se redujo el top (40→20px). En mobile el título y el paginador se apilan (en vez del hueco enorme del `space-between` a 100% de ancho)
✔ [Simbiocreación] Corregido bug: en el listado de Participantes algunos usuarios aparecían sin nombre. El nombre estaba envuelto en `@if (firstName && lastName)`, así que los usuarios con `name` pero sin firstName/lastName (típico de logins que no devuelven given_name/family_name) salían en blanco, aunque la burbuja del grafo sí mostraba texto (usa `node.name` con fallback). Se quitó el gating y ahora usa el fallback a `user.name` (misma lógica que la burbuja), con navegación segura `?.`
