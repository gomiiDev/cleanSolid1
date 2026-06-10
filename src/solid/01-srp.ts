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

}

class SubscriptionBloc {

    onAddSubscription( subscriptionId: number ) {
        console.log('Agregando suscripción:', subscriptionId );
    }

}

const userBloc = new UserBloc();
const subscriptionBloc = new SubscriptionBloc();

userBloc.loadUser(10);
userBloc.saveUser({ id: 10, name: 'Fernando' });
userBloc.notifyUser();
subscriptionBloc.onAddSubscription(1234);
