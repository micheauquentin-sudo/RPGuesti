import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  // Routes nécessitant une authentification
  const requiresAuth = pathname.startsWith('/admin') || pathname.startsWith('/scan') || pathname.startsWith('/promoter');

  if (!requiresAuth) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as CookieOptions)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Si non connecté, redirection vers /login
  if (!user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Vérification du rôle dans la table profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || 'promoter';

  // Protection /admin : réservé strictement aux administrateurs
  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    // Si staff, rediriger vers le scanner
    if (userRole === 'staff') {
      return NextResponse.redirect(new URL('/scan', request.url));
    }
    // Si promoter, rediriger vers son espace RP
    if (userRole === 'promoter') {
      return NextResponse.redirect(new URL('/promoter', request.url));
    }
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
  }

  // Protection /promoter : accessible aux promoters et à l'admin
  if (pathname.startsWith('/promoter') && !['admin', 'promoter'].includes(userRole)) {
    if (userRole === 'staff') {
      return NextResponse.redirect(new URL('/scan', request.url));
    }
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
  }

  // Protection /scan : réservé au staff et à l'admin
  if (pathname.startsWith('/scan') && !['admin', 'staff'].includes(userRole)) {
    if (userRole === 'promoter') {
      return NextResponse.redirect(new URL('/promoter', request.url));
    }
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/scan/:path*', '/promoter/:path*'],
};
