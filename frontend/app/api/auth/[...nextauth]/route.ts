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
        console.log('🔍 NextAuth signIn callback started');
        console.log('User:', { email: user.email, name: user.name, id: user.id });
        console.log('Account:', { provider: account?.provider, providerAccountId: account?.providerAccountId });
        
        if (!user.email) {
          console.log('❌ No user email provided');
          return false;
        }

        // Test database connection first
        console.log('🔍 Testing database connection...');
        const testQuery = await query('SELECT NOW() as current_time');
        console.log('✅ Database connection successful:', testQuery.rows[0]);

        const existingUser = await query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        );
        console.log('🔍 Existing user check:', existingUser.rows.length > 0 ? 'Found' : 'Not found');

        if (existingUser.rows.length === 0) {
          console.log('🔍 Creating new user...');
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
          console.log('✅ New user created:', newUser.rows[0]);

          // Create default plan for new user
          if (newUser.rows.length > 0) {
            const userId = newUser.rows[0].id;
            console.log('🔍 Creating default plan for user:', userId);
            await query(
              `INSERT INTO plans (user_id, tier, status)
               VALUES ($1, $2, $3)
               ON CONFLICT (user_id) DO NOTHING`,
              [userId, 'free', 'active']
            );
            console.log('✅ Default plan created');
          }
        }

        console.log('✅ NextAuth signIn callback completed successfully');
        return true;
      } catch (error) {
        console.error('❌ Error in NextAuth signIn callback:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: (error as any)?.code,
          detail: (error as any)?.detail,
          hint: (error as any)?.hint,
          position: (error as any)?.position,
          where: (error as any)?.where,
          schema: (error as any)?.schema,
          table: (error as any)?.table,
          column: (error as any)?.column,
          dataType: (error as any)?.dataType,
          constraint: (error as any)?.constraint
        });
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

