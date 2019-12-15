import { Auth } from "../firebase";
import { authState } from "rxfire/auth";
import { currentUser } from "../stores/user";
import FbEmployees from "./employees";
const watchAuthState = () => {
  const unsubscribe = authState(Auth).subscribe(u => {
    if (Auth.currentUser) {
      let userInfo = {
        email: Auth.currentUser.email,
        id: Auth.currentUser.uid,
        phoneNumber: Auth.currentUser.phoneNumber,
        photoUrl: Auth.currentUser.photoUrl
      };

      FbEmployees.findOne(userInfo.id).then(doc => {
        userInfo = { ...userInfo, ...doc.data(), id: doc.id };

        Auth.currentUser.getIdTokenResult().then(idTokenResult => {
          userInfo.claims = idTokenResult.claims;
          console.log("userInfoxx", userInfo);
          currentUser.set(userInfo);
          return;
        });
      });
    } else {
      currentUser.set({ id: 0 });
    }
  });
};

const signOut = () => {
  Auth.signOut();
};

export { watchAuthState, signOut };
