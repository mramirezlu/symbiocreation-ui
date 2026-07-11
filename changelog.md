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
