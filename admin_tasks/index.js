var admin = require("firebase-admin");
var serviceAccount = require(`./settings/adminsdk.json`);

const [node, file, task, ...args] = process.argv;

const actions = {
  addSuperAdmin,
  addAdmin,
  addLinkToCompany
};

if (!actions[task]) {
  console.log("You must give a valid task name");
} else {
  _initApp();
  actions[task](args);
}

function _initApp() {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.projectId}.firebaseio.com`
  });
}

function _getUser(uid) {
  return admin.auth().getUser(uid);
}

function _setCustomUserClaims(uid, claims) {
  return admin.auth().setCustomUserClaims(uid, claims);
}

function addSuperAdmin([uid]) {
  if (!uid) {
    console.log("uid is required");
    process.exit();
  }
  _getUser(uid)
    .then(user => {
      const currentUserClaims = user.customClaims;
      const newUserClaims = {
        ...currentUserClaims,
        roles: { ...currentUserClaims.roles, superadmin: true, admin: true }
      };

      _setCustomUserClaims(uid, newUserClaims).then(() => {
        console.log("SuperAdmin claims added");
        process.exit();
      });
    })
    .catch(error => {
      console.log("Error adding SuperAdmin", error);
      process.exit();
    });
}

function addAdmin([uid]) {
  if (!uid) {
    console.log("This command must have an userId");
    process.exit();
  }
  _getUser(uid)
    .then(user => {
      const currentUserClaims = user.customClaims;
      const newUserClaims = {
        ...currentUserClaims,
        roles: {
          ...currentUserClaims.roles,
          admin: true
        }
      };
      _setCustomUserClaims(uid, newUserClaims).then(() => {
        console.log("Admin right claim added");
        process.exit();
      });
    })
    .catch(error => {
      console.log("Error adding Admin claim", error);
      process.exit();
    });
}
function addLinkToCompany([uid, companyId]) {
  if (!uid || !companyId) {
    console.log(
      "This command must have an userId and companyId to work properly"
    );
    process.exit();
  }

  _getUser(uid)
    .then(user => {
      const currentUserClaims = user.customClaims;
      const newUserClaims = {
        ...currentUserClaims,
        company: companyId
      };
      _setCustomUserClaims(uid, newUserClaims).then(() => {
        console.log("CompanyId claims added");
        process.exit();
      });
    })
    .catch(error => {
      console.log("Error adding Company claim", error);
      process.exit();
    });
}
