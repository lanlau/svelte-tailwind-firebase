import { Auth } from "../firebase";
import { authState } from "rxfire/auth";
import { currentUser } from "../stores/user";

const watchAuthState = () => {
  const unsubscribe = authState(Auth).subscribe(u => {
    const user = u ? u : { id: 0 };
    return currentUser.set(user);
  });
};

const signOut = () => {
  Auth.signOut();
};

export { watchAuthState, signOut };
