import admin from "firebase-admin";

let serviceAccount: any = null;
try {
  // central.json may not exist in some environments (secrets kept out of repo)
  // require here so TypeScript won't fail if file is absent
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  serviceAccount = require("../../../central.json");
} catch (e) {
  serviceAccount = null;
}

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export default admin;