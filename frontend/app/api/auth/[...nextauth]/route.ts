import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { query } from "@/lib/db";

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
    async signIn({ user, account, profile }) {
      // Create or update user in database
      try {
        if (!user.email) return false;

        const existingUser = await query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        );

        if (existingUser.rows.length === 0) {
          // Create new user
          const newUser = await query(
            `INSERT INTO users (email, name, image, provider, provider_account_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            [
              user.email,
              user.name || user.email,
              user.image || null,
              account?.provider || 'google',
              account?.providerAccountId || user.id
            ]
          );

          // Create default plan for new user
          if (newUser.rows.length > 0) {
            const userId = newUser.rows[0].id;
            await query(
              `INSERT INTO plans (user_id, tier, status)
               VALUES ($1, $2, $3)
               ON CONFLICT (user_id) DO NOTHING`,
              [userId, 'free', 'active']
            );
          }
        }

        return true;
      } catch (error) {
        console.error('Error creating user:', error);
        return false;
      }
    },
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

