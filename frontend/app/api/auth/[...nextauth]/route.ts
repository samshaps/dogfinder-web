import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getUserByEmail, createUser, createUserPlan, testSupabaseConnection } from "../../../../lib/supabase-auth";

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
    async redirect({ url, baseUrl }) {
      // Handle callbackUrl parameter for post-authentication redirects
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async signIn({ user, account, profile }) {
      // Create or update user in database using Supabase
      try {
        console.log('🔍 NextAuth signIn callback started');
        console.log('User:', { email: user.email, name: user.name, id: user.id });
        console.log('Account:', { provider: account?.provider, providerAccountId: account?.providerAccountId });
        
        if (!user.email) {
          console.log('❌ No user email provided');
          return false;
        }

        // Test Supabase connection first
        console.log('🔍 Testing Supabase connection...');
        const connectionTest = await testSupabaseConnection();
        if (!connectionTest) {
          console.log('❌ Supabase connection failed');
          return false;
        }

        // Check if user exists
        const existingUser = await getUserByEmail(user.email);

        if (!existingUser) {
          console.log('🔍 Creating new user...');
          
          // Create new user
          const newUser = await createUser({
            email: user.email,
            name: user.name || user.email,
            image: user.image || undefined,
            provider: account?.provider || 'google',
            provider_account_id: account?.providerAccountId || user.id
          });

          // Create default plan for new user
          if (newUser?.id) {
            console.log('🔍 Creating default plan for user:', newUser.id);
            await createUserPlan(newUser.id);
            console.log('✅ Default plan created');
          }
        } else {
          console.log('✅ User already exists:', existingUser.id);
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

