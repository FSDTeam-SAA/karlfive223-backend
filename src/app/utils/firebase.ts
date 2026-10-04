import admin from "firebase-admin";

let serviceAccount: any = null;
try {
  // central.json may not exist in some environments (secrets kept out of repo)
  // require here so TypeScript won't fail if file is absent
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  serviceAccount = require("../../../central.json");
} catch (e) {
  serviceAccount = null;
  // Was previously silent, which is exactly how this went unnoticed before:
  // the file was there but under a different name, so every push
  // notification call ran with an uninitialized admin SDK and failed
  // silently downstream instead of here.
  console.warn(
    "⚠️ Firebase Admin service account (central.json) not found — push notifications are disabled."
  );
}

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
  console.log("✅ Firebase Admin initialized — push notifications enabled");
}

export default admin;