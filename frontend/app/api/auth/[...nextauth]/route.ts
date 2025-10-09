import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || "",
      authorization: { 
        params: { 
          prompt: "consent", 
          access_type: "offline", 
          response_type: "code" 
        } 
      },
    }),
  ],
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken;
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };

