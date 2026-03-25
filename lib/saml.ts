import { SAML } from "@node-saml/node-saml";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const SP_ENTITY_ID = process.env.SAML_SP_ENTITY_ID || BASE_URL;

const spPrivateKey = (process.env.SP_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const spPublicCert = (process.env.SP_PUBLIC_CERT || "").replace(/\\n/g, "\n");

// Stanford IdP certificate — from https://login.stanford.edu/idp.crt
const STANFORD_IDP_CERT = `MIIDnzCCAoegAwIBAgIJAJl9YtyaxKsZMA0GCSqGSIb3DQEBBQUAMGYxCzAJBgNV
BAYTAlVTMRMwEQYDVQQIDApDYWxpZm9ybmlhMREwDwYDVQQHDAhTdGFuZm9yZDEU
MBIGA1UECgwLSVQgU2VydmljZXMxGTAXBgNVBAMMEGlkcC5zdGFuZm9yZC5lZHUw
HhcNMTMwNDEwMTYzMTAwWhcNMzMwNDEwMTYzMTAwWjBmMQswCQYDVQQGEwJVUzET
MBEGA1UECAwKQ2FsaWZvcm5pYTERMA8GA1UEBwwIU3RhbmZvcmQxFDASBgNVBAoM
C0lUIFNlcnZpY2VzMRkwFwYDVQQDDBBpZHAuc3RhbmZvcmQuZWR1MIIBIjANBgkq
hkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAm6466Bd6mDwNOR2qZZy1WRZdjyrG2/xW
amGEMekg38fyuoSCIiMcgeA9UIUbiRCpAN87yI9HPcgDEdrmCK3Ena3J2MdFZbRE
b6fdRt76K+0FSl/CnyW9xaIlAhldXKbsgUDei3Xf/9P8H9Dxkk+PWd9Ha1RZ9Viz
dOLe2S2iDKc1CJg2kdGQTuQu6mUEGrB9WJmrLHJS7GkGDqy96owFjRL/p0i9KBdR
kgWG+GFHWkxzeNQ99yrQra3+C9FQXa/xLCdOY+BGOsAG7ej4094NZXRNTyXui4jR
WCm2GVdIVl7YB9++XSntS7zQEJ9QBnC1D4bS0tljMfdOGAvdUuJY7QIDAQABo1Aw
TjAdBgNVHQ4EFgQUJk4zcQ4JupEcAp0gEkob4YRDkckwHwYDVR0jBBgwFoAUJk4z
cQ4JupEcAp0gEkob4YRDkckwDAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQUFAAOC
AQEAKvf9AO4+osJZOmkv6AVhNPm6JKoBSm9dr9NhwpSS5fpro6PrIjDZDLh/L5d/
+CQTDzuVsw3xwDtlm89lrzbqw5rSa2+ghJk79ijysSC0zOcD6ka9c17zauCNmFx9
lj9iddUw3aYHQcQRktWL8pvI2WCY6lTU+ouNM+owStya7umZ9rBdjg/fQerzaQxF
T0yV3tYEonL3hXMzSqZxWirwsyZ0TnhWJsgEnqqG9tCFAcFu2p+glwXn1WL2GCRv
BfuJMPzg7ZB419AEoeYnLktqAWiU+ISnVfbwFOJ+OM/O7VQOeHDm2AeYcwo12CAc
4GC9KWTs3QtS3GREPKYDlHRNxQ==`;

export const saml = new SAML({
  entryPoint: "https://login.stanford.edu/idp/profile/SAML2/Redirect/SSO",
  issuer: SP_ENTITY_ID,
  callbackUrl: `${BASE_URL}/api/auth/callback`,
  idpCert: STANFORD_IDP_CERT,
  privateKey: spPrivateKey,
  decryptionPvk: spPrivateKey,
  signatureAlgorithm: "sha256",
  identifierFormat: "urn:oasis:names:tc:SAML:2.0:nameid-format:transient",
  wantAssertionsSigned: true,
  acceptedClockSkewMs: 5000,
  logoutUrl: "https://login.stanford.edu/idp/profile/Logout",
});

function stripPemHeaders(pem: string): string {
  return pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s/g, "");
}

export async function generateMetadata(): Promise<string> {
  if (!spPublicCert) {
    throw new Error("SP_PUBLIC_CERT is not set");
  }
  const certData = stripPemHeaders(spPublicCert);
  return saml.generateServiceProviderMetadata(certData, certData);
}

export function mapSamlAttributes(profile: Record<string, unknown>) {
  return {
    uid:
      (profile["urn:oid:0.9.2342.19200300.100.1.1"] as string) ||
      (profile["uid"] as string) ||
      "",
    displayName:
      (profile["urn:oid:2.16.840.1.113730.3.1.241"] as string) ||
      (profile["displayName"] as string) ||
      "",
    email:
      (profile["urn:oid:0.9.2342.19200300.100.1.3"] as string) ||
      (profile["mail"] as string) ||
      "",
  };
}
