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

    private mailer = new Mailer();

    notifyUser(){
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
        // Simula la carga de un usuario
        console.log('Cargando usuario con id:', id);
    }

    saveUser( user: User ) {
        // Simula el guardado en base de datos
        console.log('Guardando en base de datos:', user );
    }

}


const userBloc = new UserBloc();
const subscriptionBloc = new SubscriptionBloc();
const userService = new UserService();

userService.loadUser(10);
userService.saveUser({ id: 10, name: 'Fernando' });
userBloc.notifyUser();
subscriptionBloc.onAddSubscription(1234);
