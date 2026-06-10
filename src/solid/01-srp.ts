interface User {
    id: number;
    name: string;
}

// Esta clase viola el Principio de Responsabilidad Única (SRP)
class UserBloc {

    loadUser( id: number ) {
        // Simula la carga de un usuario
        console.log('Cargando usuario con id:', id);
    }

    saveUser( user: User ) {
        // Simula el guardado en base de datos
        console.log('Guardando en base de datos:', user );
    }

    notifyUser() {
        // Simula el envío de notificaciones
        console.log('Enviando correo a los usuarios');
    }

    onAddSubscription( subscriptionId: number ) {
        // Simula la gestión de suscripciones
        console.log('Agregando suscripción:', subscriptionId );
    }

}

const userBloc = new UserBloc();

userBloc.loadUser(10);
userBloc.saveUser({ id: 10, name: 'Fernando' });
userBloc.notifyUser();
userBloc.onAddSubscription(1234);
