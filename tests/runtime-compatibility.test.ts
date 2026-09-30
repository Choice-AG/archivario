import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";
it("Firebase Admin carga y resuelve claves públicas sin require de ESM", () => {
  const script = `
 require("firebase-admin/auth");
 const {generateKeyPairSync}=require("node:crypto");
 const {dirname,join}=require("node:path");
 const {retrieveSigningKeys}=require(join(dirname(require.resolve("jwks-rsa")),"utils.js"));
 const {publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
 retrieveSigningKeys([{...publicKey.export({format:"jwk"}),kid:"test",alg:"RS256"}])
 .then(keys=>{if(keys.length!==1||!keys[0].getPublicKey().includes("BEGIN PUBLIC KEY"))process.exit(1);console.log("ok");})
 .catch(()=>process.exit(1));
 `;
  const result = execFileSync(
    process.execPath,
    ["--no-experimental-require-module", "-e", script],
    { encoding: "utf8", cwd: process.cwd() },
  );
  expect(result.trim()).toBe("ok");
});
