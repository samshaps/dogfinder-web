import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.NEXTAUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.NEXTAUTH_GOOGLE_SECRET || "",
      authorization: { params: { prompt: "consent", access_type: "offline", response_type: "code" } },
    }),
  ],
  session: { strategy: "jwt" },
  debug: true,
});

export { handler as GET, handler as POST };

