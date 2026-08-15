> Cambios del **frontend** (`symbiocreation-ui`). Los cambios del **backend** están en `symbiocreation-res/CHANGELOG.md`.

# 29/07/26 mramirez
✔ [Simbiocreación] Título del header centrado independientemente del botón "Participar"
✔ [Simbiocreación] Agregado "Ver perfil" en menú de participantes (abre perfil público en pestaña nueva)
✔ [Ranking] Clic en nombre de usuario navega a su perfil público
✔ [Frontpage] Corregido nav: "Inicio" → `/`, "Explora" → `/explore`; enlaces externos abren en pestaña nueva
✔ [Migración] Dashboard reemplazado por Mi Perfil conservando URLs originales (`/dashboard/*`)
✔ [Menú intranet] Extraído menú superior compartido (`IntranetMenuComponent`) para Mi Perfil, SymbioGames y Stats
✔ [SymbioGames / Stats] Salieron del shell del dashboard, restilizadas con línea gráfica de Mi Perfil
✔ [i18n] Paginadores traducidos al español (CustomMatPaginatorIntl)
✔ [Perfil público] Nueva vista `/perfil/:userId` (sin AuthGuard) con KPIs y simbios públicas del usuario
✔ [Perfil público] Clic en avatares de participantes (cards) navega al perfil público

# 28/07/26 mramirez
✔ [Mi Perfil] (Migración Dashboard → Mi Perfil, paso 1) Las tarjetas de "Mis Simbios" ahora usan el nuevo diseño de la vista inicial (imagen de portada por defecto `Symbio_background4.jpg`, avatares pequeños de 24px separados abajo a la izquierda, badge "+" con el conteo de participantes restantes en el tooltip, título y descripción truncados con ellipsis); todo el card es enlace a la simbiocreación
✔ [Mi Perfil] Los KPIs pasaron de 2 (Ideas creadas / Colaboraciones) a los 4 de "Mis Stats" del Dashboard: **Puntaje**, **Total Simbiocreaciones**, **Total Ideas** y **Grupos como Embajador** (todos de `getCountsSummaryUser`). Reutiliza las claves i18n `MY_SYMBIOS.*` existentes
✔ [Mi Perfil] (Migración Dashboard → Mi Perfil, paso 2) Agregado el **menú lateral** con la línea gráfica nueva (columna izquierda, ítem activo resaltado en rosa): **Mis Simbios** (→ /mi-perfil, activa), **Mis SymbioGames** e (solo `SUPER_ADMIN`) **Stats Generales**. Replica los ítems del `app-navlist` del Dashboard con las claves `NAV.*` existentes. En mobile el menú pasa arriba como barra horizontal. Nota: por ahora "Mis SymbioGames" y "Stats Generales" enlazan temporalmente a las rutas `/dashboard/*` (que aún existen); se re-apuntarán a Mi Perfil cuando esas secciones se migren en los siguientes pasos
✔ [Mi Perfil] Debajo de "Mis Simbios" se agregó la sección **"Explora Simbios"** (descubrir públicas): buscador por texto + tabs de orden **Destacados** (ideas DESC) / **Nuevos** (creación DESC) / **Más colaborados** (colaboradores DESC) + slider de tarjetas con el nuevo diseño. Reutiliza el endpoint `getPublicRankedSymbiocreations` y las claves i18n `FRONTPAGE.TAB_*`/`SEARCH_*`/`LOADING`/`NO_RESULTS`; nueva clave `MYPROFILE.DISCOVER_TITLE`
✔ [Mi Perfil] A la sección "Explora Simbios" se le agregaron los **filtros de fecha Desde / Hasta** (los mismos de Explora): `matDatepicker` con moment, ambos opcionales, se aplican al cambiar la fecha (con botón "×" para limpiar) y se combinan con el buscador y el tab de orden activo. Se envían al backend como epoch millis (inicio/fin del día). Requirió extender `getPublicRankedSymbiocreations(sort, name, limit, from, to)` en el service y el endpoint `getPublicRanked` del backend (ver su CHANGELOG). Reutiliza las claves i18n `EXPLORE.DATE_FROM` / `EXPLORE.DATE_TO`
✔ [Mi Perfil] El **"Ver todos"** de "Mis Simbios" y de "Explora Simbios" ya no navega afuera: ahora es un toggle que **expande la sección en vertical** (de slider horizontal a grilla de varias filas) y cambia a "Ver menos" (ícono chevron). En estado expandido se ocultan las flechas del slider. Nueva clave i18n `MYPROFILE.SEE_LESS`
✔ [Mi Perfil] Se agregó **paginación** en el estado expandido (aparece solo si hay más de una página): "Mis Simbios" pagina con `getMySymbiocreations(userId, page)` (12/pág, total del KPI `totalSymbiocreations`, misma lógica que el Dashboard); "Explora Simbios" pagina con `getPublicRankedSymbiocreations(..., page)` (20/pág, total de `countPublicSymbiocreations`). Cambiar orden/búsqueda/fechas resetea a la primera página
✔ [Mi Perfil] Se **fusionaron** "Mis Simbios" y "Explora Simbios" en una sola sección con pestañas, donde **"Mis Simbios" es la pestaña por defecto**, seguida de **Destacados / Nuevos / Más colaborados**. Un único slider/grilla + paginador se alimenta de un solo arreglo `displayed` según `activeTab` (`mine` → `getMySymbiocreations` 12/pág con total del KPI; públicas → ranking `getPublicRanked` 20/pág con total de `countPublic`). El buscador y los filtros de fecha solo se muestran en las pestañas públicas (el endpoint `getMine` no filtra). Al cambiar de pestaña se vuelve a la primera página. Se eliminó el estado duplicado (un solo `expanded`/`page`/track); sin cambios de backend
✔ [Mi Perfil] La pestaña "Mis Simbios" ahora se muestra ordenada por **fecha de creación descendente** (del último al primero). El orden lo aplica el backend a través de todas las páginas (ver CHANGELOG de `symbiocreation-res`), no en el front, para que la paginación sea coherente entre páginas
✔ [Mi Perfil] El **menú** (Mis Simbios / Mis SymbioGames / Stats Generales) pasó de sidebar izquierdo a **barra horizontal arriba del saludo** ("Hola {nombre}"), en todos los tamaños. Layout de la vista cambiado a columna (menú arriba, contenido debajo); la barra es desplazable horizontalmente si no caben los ítems
✔ [Mi Perfil] Las tarjetas de simbios ahora muestran **siempre 4 elementos completos** tanto en "Ver todos" (grilla expandida) como en "Ver menos" (slider colapsado): se quitó el `min-width: 200px` que en anchos intermedios desbordaba y cortaba la 4ª tarjeta, se agregó `box-sizing: border-box` (el borde no desborda) y se removió el breakpoint de 1100px que bajaba a 3 (ya no hace falta porque el contenido es full-width con el menú arriba). En mobile (≤768px) siguen 2 por fila para legibilidad
✔ [Mi Perfil] El paginador de la **cuadrícula** ahora se muestra también en el estado colapsado (slider), no solo al expandir con "Ver todos" (se quitó el `expanded &&` de la condición). Así **ambos modos paginan siempre** (cuando hay más de una página): en el slider se navegan los 12/20 de la página con las flechas y se cambia de página con el paginador de abajo
✔ [Explore] Las tarjetas se cambiaron al **nuevo diseño** (el mismo de Mi Perfil / Frontpage): imagen de portada por defecto (`Symbio_background4.jpg`), avatares de 24px separados abajo a la izquierda con badge "+" (conteo en tooltip), título y descripción truncados con ellipsis, y toda la tarjeta es enlace a la simbiocreación (se quitaron la fecha, el "última modificación" y el botón de info del diseño viejo). Grilla de 4 por fila (3 en ≤1100px, 2 en ≤768px). Se agregó `truncate` al componente; `getParticipantsToDisplay`/`getThumbnailFromUrl` ya existían
✔ [Mi Perfil] Solo en la pestaña **"Mis Simbios"** se agregó el toggle **Cuadrícula / Lista** (como el Dashboard). Cuadrícula = las tarjetas nuevas (slider + "Ver todos" + paginador); Lista = se reutiliza el componente `app-list-symbios-user` del Dashboard (nombre, badge Moderador, visibilidad, link para compartir, participantes, última modificación, menú de acciones) con su propio paginador (12/pág). En la vista de lista se ocultan el "Ver todos" y el slider. La preferencia se persiste en el usuario (`isGridViewOn`, misma que el Dashboard) vía `updateUser`. `isModeratorList` se calcula en el front comparando el email del usuario con los participantes. El toggle no aparece en las pestañas públicas

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
✔ [Mi Perfil] Nueva vista personalizada (`MiPerfilComponent`, ruta `/mi-perfil` con `AuthGuard`), accesible desde el botón "Mi Perfil" del menú de usuario del frontpage (solo con sesión activa). Incluye: saludo "Hola {nombre} 👋" + "¿Qué quieres crear hoy?", dos acciones rápidas ("Crear una idea" → /create, "Unirme a un Simbio" → /explore), un placeholder de imagen a la derecha (para reemplazar luego), dos KPIs (Ideas creadas y Colaboraciones, de `getCountsSummaryUser`) y "Mis Simbios" en slider (sin filtros). Se omitieron a propósito el buscador, las otras acciones/KPIs, los tabs de filtro y la sección de inspiración. Nuevas claves i18n `MYPROFILE.*` (es/en).
✔ [Frontpage] Rediseño del card (solo del frontpage, no Explora ni Mi Perfil): loader + "Cargando" mientras carga cada lista (Destacados/Nuevos/Más colaborados); imagen de portada por defecto (`Symbio_background4.jpg`); título y descripción debajo, truncados por cantidad de caracteres (título 45, descripción 90) + ellipsis/line-clamp para uniformar el tamaño; avatares de participantes más pequeños (24px), separados y en la parte inferior izquierda de la imagen; todo el card es enlace a la simbiocreación. Nueva clave i18n `FRONTPAGE.LOADING`.
✔ [Frontpage] Tabs de ordenamiento al lado de "Simbios destacados": **Destacados** (cantidad de ideas DESC), **Nuevos** (fecha de creación DESC) y **Más colaborados** (cantidad de participantes DESC). Consumen el nuevo endpoint `getPublicRanked` del backend. Default: Destacados. El buscador por texto se combina con el orden activo. Claves i18n `FRONTPAGE.TAB_*`.
✔ [Frontpage] Nueva página inicial pública (`FrontpageComponent`) en la ruta `/`, reemplazando el redirect a login. Flujo: **FrontPage → Login → Intranet** (el botón "Iniciar sesión" redirige al panel tras autenticarse). Incluye: header propio (logo + nav "Explorar" + botón login / círculo con iniciales que abre menú con el nombre, dashboard y logout), hero con textos y botones ("Crear nueva idea" → /create, "Conoce la metodología" → scroll a features), banner de búsqueda (buscador por texto que filtra las simbios públicas), slider horizontal de tarjetas de simbios (reutiliza el diseño de Explore, 5 visibles a la vez) y sección de 4 features con íconos. La toolbar global (`app.component`) se oculta en `/` para no duplicar header. Consume `getAllPublicSymbiocreations`. Nuevas claves i18n `FRONTPAGE.*` (es/en). Pendiente: imagen de fondo real del hero (placeholder con gradiente) y la página de Metodología.
