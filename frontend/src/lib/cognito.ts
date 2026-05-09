import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

const USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

let pool: CognitoUserPool | null = null;
function getPool(): CognitoUserPool {
  if (pool) return pool;
  if (!USER_POOL_ID || !CLIENT_ID) {
    throw new Error("Cognito not configured. Set NEXT_PUBLIC_COGNITO_USER_POOL_ID and NEXT_PUBLIC_COGNITO_CLIENT_ID.");
  }
  pool = new CognitoUserPool({ UserPoolId: USER_POOL_ID, ClientId: CLIENT_ID });
  return pool;
}

export interface SignInResult {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export function signIn(email: string, password: string): Promise<SignInResult> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    const auth = new AuthenticationDetails({ Username: email, Password: password });
    user.authenticateUser(auth, {
      onSuccess: (session: CognitoUserSession) => {
        resolve({
          idToken: session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
          expiresAt: session.getIdToken().getExpiration() * 1000,
        });
      },
      onFailure: (err) => reject(err),
      newPasswordRequired: () => reject(new Error("New password required (handle this flow before demo).")),
    });
  });
}

export function signOut(): void {
  const current = getPool().getCurrentUser();
  current?.signOut();
}

export function getCurrentSession(): Promise<SignInResult | null> {
  return new Promise((resolve) => {
    const current = getPool().getCurrentUser();
    if (!current) return resolve(null);
    current.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return resolve(null);
      resolve({
        idToken: session.getIdToken().getJwtToken(),
        accessToken: session.getAccessToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
        expiresAt: session.getIdToken().getExpiration() * 1000,
      });
    });
  });
}
