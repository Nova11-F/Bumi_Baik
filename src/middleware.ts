import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginHref } from "@/lib/auth";

const PROTECTED_PREFIXES = ["/checkout", "/akun", "/pesanan"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function withRefreshedCookies(
  response: NextResponse,
  cookiesToSet: CookieToSet[],
): NextResponse {
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options);
  }

  return response;
}

function notFoundResponse(request: NextRequest, cookies: CookieToSet[]): NextResponse {
  const response = NextResponse.rewrite(new URL("/404", request.url), { status: 404 });
  return withRefreshedCookies(response, cookies);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  let cookiesToSet: CookieToSet[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(items) {
          cookiesToSet = items;
          for (const { name, value } of items) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          for (const { name, value, options } of items) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (isProtectedPath(pathname) && !user) {
    const redirectUrl = new URL(
      loginHref(`${pathname}${search}`),
      request.url,
    );
    return withRefreshedCookies(NextResponse.redirect(redirectUrl), cookiesToSet);
  }

  if (isAdminPath(pathname)) {
    if (!user) {
      return notFoundResponse(request, cookiesToSet);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return notFoundResponse(request, cookiesToSet);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
