# cleanSolid — Bitácora de Refactorización SRP

## Contexto

Este proyecto aplica el **Principio de Responsabilidad Única (SRP)** del acrónimo SOLID sobre un caso de código inicial que concentraba múltiples responsabilidades en una sola clase. La bitácora documenta el estado original, cada decisión de extracción tomada y el análisis crítico de los problemas resueltos e impactos generados.

---

## Estado Original — El Problema

**Archivo:** `src/solid/01-srp.ts` (commit `5841fcd`)

```typescript
interface User {
    id: number;
    name: string;
}

// Esta clase viola el Principio de Responsabilidad Única (SRP)
class UserBloc {

    loadUser( id: number ) {
        console.log('Cargando usuario con id:', id);
    }

    saveUser( user: User ) {
        console.log('Guardando en base de datos:', user );
    }

    notifyUser() {
        console.log('Enviando correo a los usuarios');
    }

    onAddSubscription( subscriptionId: number ) {
        console.log('Agregando suscripción:', subscriptionId );
    }
}

const userBloc = new UserBloc();

userBloc.loadUser(10);
userBloc.saveUser({ id: 10, name: 'Fernando' });
userBloc.notifyUser();
userBloc.onAddSubscription(1234);
```

### Diagnóstico crítico del estado inicial

`UserBloc` tenía **cuatro responsabilidades entrelazadas** bajo un mismo nombre de clase:

| Método | Responsabilidad real | Capa lógica |
|---|---|---|
| `loadUser` | Acceso a datos — lectura | Persistencia / Repositorio |
| `saveUser` | Acceso a datos — escritura | Persistencia / Repositorio |
| `notifyUser` | Comunicación externa — correo | Infraestructura / Mensajería |
| `onAddSubscription` | Lógica de negocio de suscripciones | Dominio de suscripciones |

**¿Por qué esto es un problema real y no solo estético?**

1. **Razones de cambio múltiples.** Si el motor de base de datos cambia, toca modificar `UserBloc`. Si el proveedor de correo cambia (SendGrid → Mailgun), toca modificar `UserBloc`. Si la lógica de suscripciones cambia, toca modificar `UserBloc`. Cada uno de estos cambios es independiente pero todos colisionan en la misma clase, lo que aumenta el riesgo de romper funcionalidades no relacionadas.

2. **Imposible testear de forma aislada.** Para probar únicamente `onAddSubscription` había que instanciar una clase que también carga usuarios y envía correos. Eso hace los tests más frágiles, más costosos de mantener y propensos a efectos colaterales.

3. **El nombre miente.** `UserBloc` sugiere que gestiona el estado del usuario (patrón BLoC — Business Logic Component), pero realmente es un dios que lo hace todo. Un nombre que no describe con precisión la responsabilidad de una clase es una deuda de legibilidad.

4. **Alta acoplación implícita.** Cualquier colaborador del equipo que necesite solo suscripciones debe depender de toda la clase, con todo lo que arrastra: acceso a BD, correo, usuarios. Eso viola también el **Principio de Segregación de Interfaces (ISP)**.

---

## Evolución del Refactor — Paso a Paso

### Paso 1 — Extraer `SubscriptionBloc`

**Commit:** `e848e00`

**Razonamiento:** `onAddSubscription` no opera sobre ningún dato de `User`, no llama a ningún otro método de la clase y su razón de cambio es completamente ajena a los usuarios. Es un método huérfano que vive en la clase equivocada.

```typescript
class SubscriptionBloc {
    onAddSubscription( subscriptionId: number ) {
        console.log('Agregando suscripción:', subscriptionId );
    }
}

const subscriptionBloc = new SubscriptionBloc();
subscriptionBloc.onAddSubscription(1234);
```

**Impacto:** `UserBloc` deja de tener conocimiento del modelo de suscripciones. `SubscriptionBloc` puede crecer de forma independiente (cancelar, listar, renovar suscripciones) sin tocar nunca la lógica de usuarios.

**Crítica aplicada:** Este es el caso más claro de violación de SRP: la evidencia de que un método no pertenece a una clase es que *no comparte datos ni colaboradores* con ninguno de los otros métodos. `onAddSubscription` solo recibía un `subscriptionId` y no usaba `User` para nada.

---

### Paso 2 — Extraer `UserService`

**Commit:** `17bf0f5`

**Razonamiento:** `loadUser` y `saveUser` son operaciones de **persistencia**, no de lógica de presentación o coordinación. Su razón de cambio es la capa de acceso a datos (ORM, query, schema). Esa preocupación no debe vivir en un Bloc, que por convención coordina estado y flujos, no accede directamente a la base de datos.

```typescript
class UserService {
    loadUser( id: number ) {
        console.log('Cargando usuario con id:', id);
    }

    saveUser( user: User ) {
        console.log('Guardando en base de datos:', user );
    }
}
```

**Impacto:** La capa de datos queda aislada. Si mañana se migra de REST a GraphQL, o de SQL a NoSQL, solo `UserService` cambia.

**Crítica aplicada:** En el código original, `loadUser` y `saveUser` eran métodos de *acceso a datos* disfrazados como lógica de negocio. Esto es un error de **capas mezcladas** (layering violation) que además dificulta aplicar patrones como Repository o DAO en el futuro.

---

### Paso 3 — Extraer `Mailer`

**Commit:** `c75b457`

**Razonamiento:** `notifyUser` contiene lógica de **infraestructura de comunicación**: sabe *cómo* se envía un correo. Eso es responsabilidad de una capa de mensajería, no del Bloc de usuario. El Bloc solo debería saber *que* hay que notificar, no *cómo* funciona el canal.

```typescript
class Mailer {
    sendEmail() {
        console.log('Enviando correo a los usuarios');
    }
}
```

**Impacto:** La lógica de envío de correo queda encapsulada. `Mailer` puede evolucionar independientemente: agregar templates, reintentos, múltiples destinatarios, integración con SendGrid, etc., sin modificar `UserBloc`.

**Crítica aplicada:** El nombre original `notifyUser` era ambiguo. ¿Notifica por correo? ¿Por push? ¿Por SMS? Al extraerlo a `Mailer.sendEmail()` se hace explícito el canal. Esta claridad de nombres es un principio fundamental de **Clean Code**: el código debe revelar intención sin necesidad de comentarios.

---

### Paso 4 — Inyección de dependencias en `UserBloc`

**Commit:** `6116c8a`

**Razonamiento:** `UserBloc` aún necesita coordinarse con `UserService` y `Mailer`. En lugar de instanciarlos internamente (lo que crearía acoplamiento duro), se reciben por constructor. Esto materializa el **Principio de Inversión de Dependencias (DIP)**.

```typescript
class UserBloc {
    constructor(
        private userService: UserService,
        private mailer: Mailer
    ) {}

    getUser( id: number ) {
        this.userService.loadUser( id );
    }

    notifyUser() {
        this.mailer.sendEmail();
    }
}

const userService = new UserService();
const userBloc = new UserBloc( userService, new Mailer() );
```

**Impacto:** `UserBloc` ahora depende de abstracciones (sus colaboradores podrían ser interfaces). Es posible pasar un `MockMailer` en tests sin modificar la clase. La composición ocurre en el punto de entrada, no dentro de la clase.

**Crítica aplicada:** Sin inyección de dependencias, aunque las clases estén separadas, el acoplamiento persiste porque `UserBloc` crea sus propias dependencias (`new Mailer()` interno). La DI es lo que convierte la separación física de clases en una separación real de responsabilidades testeable.

---

## Estado Final

```typescript
interface User {
    id: number;
    name: string;
}

class Mailer {
    sendEmail() {
        console.log('Enviando correo a los usuarios');
    }
}

class UserBloc {
    constructor(
        private userService: UserService,
        private mailer: Mailer
    ) {}

    getUser( id: number ) {
        this.userService.loadUser( id );
    }

    notifyUser() {
        this.mailer.sendEmail();
    }
}

class SubscriptionBloc {
    onAddSubscription( subscriptionId: number ) {
        console.log('Agregando suscripción:', subscriptionId );
    }
}

class UserService {
    loadUser( id: number ) {
        console.log('Cargando usuario con id:', id);
    }

    saveUser( user: User ) {
        console.log('Guardando en base de datos:', user );
    }
}

const userService = new UserService();
const userBloc = new UserBloc( userService, new Mailer() );
const subscriptionBloc = new SubscriptionBloc();

userService.loadUser(10);
userService.saveUser({ id: 10, name: 'Fernando' });
userBloc.notifyUser();
subscriptionBloc.onAddSubscription(1234);
```

### Mapa de responsabilidades final

| Clase | Responsabilidad única | Razón de cambio |
|---|---|---|
| `UserService` | Persistencia del usuario | Cambio de base de datos / esquema |
| `UserBloc` | Coordinación de flujos del usuario | Cambio en lógica de negocio del usuario |
| `SubscriptionBloc` | Lógica de suscripciones | Cambio en reglas de negocio de suscripciones |
| `Mailer` | Envío de correos | Cambio de proveedor o template de email |

---

## Análisis Crítico Global de Principios Aplicados

### SRP — Principio de Responsabilidad Única ✅

**Antes:** Una sola clase con cuatro razones de cambio independientes.  
**Después:** Cuatro clases, cada una con exactamente una razón para cambiar.

El SRP no dice que una clase deba tener un solo método, sino que debe tener **un solo actor** que la motive a cambiar. En el estado original, el equipo de base de datos, el equipo de infraestructura de correo y el equipo de producto de suscripciones modificaban la misma clase, generando conflictos de merge y riesgo de regresiones cruzadas.

### DIP — Principio de Inversión de Dependencias ✅

`UserBloc` recibe sus colaboradores desde fuera. Esto permite sustituirlos sin modificar la clase, que es la esencia del DIP. El siguiente paso natural sería definir interfaces (`IMailer`, `IUserService`) para que `UserBloc` dependa de abstracciones, no de implementaciones concretas.

### ISP — Principio de Segregación de Interfaces (parcialmente abordado) ⚠️

Al separar las clases, los consumidores ya no están obligados a depender de toda la funcionalidad de `UserBloc` original. Sin embargo, aún no se han definido interfaces explícitas. Si `UserBloc` creciera con más métodos, los consumidores que solo necesitan `notifyUser` seguirían viendo `getUser` en la interfaz pública. Definir interfaces segregadas es el paso siguiente.

### OCP — Principio de Abierto/Cerrado (oportunidad futura) ⚠️

El código actual está abierto a extensión solo parcialmente. Para cumplir OCP completamente, `Mailer` debería implementar una interfaz `IMailer`, de modo que agregar un canal nuevo (SMS, push) no requiera modificar `UserBloc`, sino simplemente inyectar una implementación diferente.

### Clean Code — Nomenclatura

- `notifyUser` → renombrado implícitamente a `Mailer.sendEmail()`: más específico, revela el canal.
- `loadUser` → movido a `UserService.loadUser()`: el contexto de clase ahora refuerza la capa (servicio de datos).
- `getUser` en `UserBloc`: coordina la obtención delegando, lo que es coherente con el rol de un Bloc.

---

## Deuda técnica identificada

1. **Ausencia de interfaces.** `UserBloc` depende de clases concretas (`UserService`, `Mailer`). Definir `IUserService` e `IMailer` completaría la inversión de dependencias y habilitaría mocks limpios en tests.

2. **`Mailer.sendEmail()` sin parámetros.** El método actual no recibe destinatario ni template, lo que limita su reutilización. Un `sendEmail(to: string, template: string)` lo haría genérico de verdad.

3. **Sin tests.** La refactorización creó la estructura necesaria para escribir tests unitarios aislados, pero estos aún no existen. Esa es la validación real de que el SRP se aplicó correctamente: si cada clase se puede probar sola, la separación fue efectiva.

4. **`UserService` no implementa el patrón Repository.** Para proyectos reales, la capa de acceso a datos debería abstraerse detrás de un repositorio para desacoplar la tecnología de persistencia del dominio.
