import { Firestore } from "../firebase";

const FirebaseEmployees = Firestore.collection("users");

const findOne = employeeId => {
  return FirebaseEmployees.doc(employeeId).get();
};

export default { findOne };
