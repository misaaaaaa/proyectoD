# proyectoD
Ensayo web para proyecto sobre práctica diagramática

## encabezado mediano

blabla 

### encabezado chico

blublu

para poner **negrita** y también *cursiva*

pero ah! para links [noticia](https://www.mascotadictos.com/blog/perros-conocen-a-pluto-en-persona-videos-20160209/)

![perrito](./imagenes/perri.webp)

esta linea la agregué desde la web

y esta linea la cambio desde vscode

para hacer git push:

``` 
git add .
git commit -m "mensaje"
git push
``` 


---

## Cómo construir los diagramas del sitio

Los diagramas de `index.html` y `marcoteorico.html` están hechos con [React Flow](https://reactflow.dev). El código fuente está en `diagrama/` y se compila a `assets/diagrama.js` y `assets/diagrama.css`, que son los archivos que cargan las páginas.

### Preparación (una sola vez)

Necesitas Node.js 18 o superior. En la carpeta del proyecto:

```
npm install
```

### Compilar

Cada vez que cambies algo dentro de `diagrama/`:

```
npm run build
```

Cambiar solo `marcoteorico.md` **no** requiere compilar: basta recargar la página.

### Ver el sitio

La página de marco teórico carga el `.md` con `fetch`, así que no funciona abriendo el archivo con doble click. Usa un servidor local:

```
python3 -m http.server 8000
```

y abre `http://localhost:8000`.

### Estructura

| Archivo | Qué hace |
|---|---|
| `diagrama/src/datos.js` | Nodos y conexiones del diagrama del inicio |
| `diagrama/src/marco.jsx` | Lee `marcoteorico.md` y arma el diagrama con su overlay |
| `diagrama/src/Diagrama.jsx` | Componente base (burbujas y React Flow) |
| `diagrama/src/Arista.jsx` | Línea de conexión: termina en el borde del círculo y admite texto |
| `diagrama/src/diagrama.css` | Estilo de burbujas, líneas y overlay |
| `style.css` | Estilo general del sitio y tipografías |

### Diagrama del inicio

Se edita en `diagrama/src/datos.js`: la lista `secciones` define las burbujas que rodean al centro (nombre y página a la que enlazan). Luego, compilar.

### Diagrama del marco teórico

Se construye desde `marcoteorico.md`:

- Cada `## Título` es una burbuja. El texto de abajo aparece en un overlay al hacer click (se cierra con ×, con Esc o haciendo click fuera).
- El contenido del overlay se escribe en markdown.
- Un `## Conexiones` especial no es una burbuja: define las líneas entre burbujas.

```
## Conexiones

- Desorientación -> Práctica diagramática : se orienta mediante
- Práctica diagramática <-> Contagio : se alimentan
- Desorientación -- Elemento 4
```

| Sintaxis | Resultado |
|---|---|
| `A -> B` | flecha hacia B |
| `A <- B` | flecha hacia A |
| `A <-> B` | flecha en ambos extremos |
| `A -- B` | línea sin flechas |
| `A -> B : texto` | agrega un texto al centro de la línea (opcional) |

Los nombres deben coincidir con el título de un `##`; no importan mayúsculas ni tildes. Una burbuja puede tener tantas conexiones como se quiera. Si un nombre no existe, la línea se ignora y el aviso aparece en la consola del navegador.

### Tipografías

- **Moe** (`typos/moe.otf`): títulos, menú y burbujas.
- **Courier New**: párrafos y textos corridos.
