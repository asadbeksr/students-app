// Modified from polito/students-app — 2026-04-13
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getApiClient } from '@/lib/api/client';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'PoliTO',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        ssoUid: { label: 'SSO UID', type: 'text' },
        ssoKey: { label: 'SSO Key', type: 'text' },
      },
      async authorize(credentials) {
        const client = getApiClient();
        try {
          let res;
          if (credentials?.ssoUid && credentials?.ssoKey) {
            // SSO login flow
            res = await client.login({
              uid: credentials.ssoUid,
              key: credentials.ssoKey,
              loginType: 'sso',
              preferences: { language: 'en' },
            });
          } else if (credentials?.username && credentials?.password) {
            // Basic login flow
            res = await client.login({
              username: credentials.username,
              password: credentials.password,
              loginType: 'basic',
              preferences: { language: 'en' },
            });
          } else {
            return null;
          }
          const data = (res as any).data;
          if (!data?.token) return null;
          if (data.type && data.type !== 'student') return null;
          getApiClient(data.token);
          return {
            id: data.username,
            name: data.username,
            email: `${data.username}@studenti.polito.it`,
            token: data.token,
            clientId: data.clientId,
          };
        } catch (e) {
          console.error('Login failed:', e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).token;
        token.clientId = (user as any).clientId;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).clientId = token.clientId;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
};
