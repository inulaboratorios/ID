# Inu ID — Front

Panel del dueño + página pública del collar NFC. Sitio estático (HTML/CSS/JS), listo para Vercel.

## Estructura

```
ID/
├── index.html        Panel del dueño (login, registro, onboarding, mascotas, editar)
├── m.html            Página pública del collar (la que abre el NFC)
├── vercel.json       Rewrite de /m/:code → m.html + cleanUrls
├── css/
│   ├── base.css      Tokens de marca + componentes compartidos
│   ├── app.css       Estilos del panel
│   └── public.css    Estilos de la página pública
└── js/
    ├── config.js     DEMO on/off + URL base de la API
    ├── store.js      Guardado del token (localStorage con respaldo)
    ├── api.js        Todas las llamadas al backend (+ datos demo)
    ├── app.js        Lógica del panel
    └── public.js     Lógica de la página pública
```

## Cómo activarlo con el servidor real

En `js/config.js`:

```js
window.INUID_CONFIG = {
  DEMO: false,                                   // ← cambiar a false en producción
  API_BASE: "https://api.inulaboratorios.com/api"
};
```

- `DEMO: true`  → funciona sin servidor, con datos de mentira. Sirve para ver el front localmente.
- `DEMO: false` → habla con la API real de Jose. **Este es el valor para Vercel.**

## Endpoints que consume (backend de Jose)

| Acción | Método y ruta |
|---|---|
| Registro | `POST /Auth/v2/register` |
| Login | `POST /Auth/v2/login` |
| Onboarding Inu ID | `POST /Auth/v2/onboarding-inuid` |
| Listar mascotas | `GET /InuidPets` |
| Crear mascota | `POST /InuidPets` |
| Editar mascota | `PUT /InuidPets/{id}` |
| Modo perdido | `PATCH /InuidPets/{id}/lost` |
| Página pública (sin login) | `GET /InuidPets/public/{code}` |

El login enruta según `hasInuidProfile`: si es `false` → onboarding; si es `true` → panel.
El token JWT se guarda y se manda como `Authorization: Bearer <token>` en todas las llamadas privadas.

## Desplegar en Vercel

1. Subir esta carpeta al repo `inulaboratorios/ID`.
2. En Vercel: **New Project** → importar el repo. No hay build: es estático (framework preset "Other").
3. Poner `DEMO: false` en `js/config.js` antes o después de subir (commit).
4. Deploy.

## La URL del collar (NFC)

El chip NFC guarda **una sola URL fija** por mascota, con el código del collar:

```
https://TU-DOMINIO/m/qgl4hjdb
```

Gracias a `vercel.json`, esa ruta sirve `m.html`, que lee el código, llama a
`GET /InuidPets/public/qgl4hjdb` y arma la página. Si la mascota está en modo
perdido (`isLost: true`), se muestra el aviso de perdido automáticamente.

El código del collar (`publicCode`) lo genera y asigna el backend/laboratorio; el panel
del dueño muestra un botón **"Ver"** en cada mascota que ya tenga collar, para ver su página pública.

## Nota

El backend permite CORS desde el front para que estas llamadas funcionen. Si en producción
aparece un error de CORS, hay que habilitar el dominio de Vercel en la API (tema del backend).
