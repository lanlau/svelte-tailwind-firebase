import { writable } from "svelte/store";

const userInfo = writable(null);

const setUser = user => {
  userInfo.set(user);
};

const removeUser = () => {
  userInfo.set(null);
};

const currentUser = {
  subscribe: userInfo.subscribe,
  set: setUser,
  remove: removeUser
};

export { currentUser };
