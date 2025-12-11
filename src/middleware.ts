// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // FORCE LOG untuk memastikan middleware berjalan

  // Get session menggunakan auth function
  const session = await auth();

  // --- 1. Handle unauthenticated users ---
  if (
    !session &&
    !pathname.startsWith("/sign-in") &&
    !pathname.startsWith("/sign-up") &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/")
  ) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // --- 2. Define role access for each sub-module based on SideBar.tsx ---
  const subModuleRoles: { [key: string]: string[] } = {
    // Dashboard
    "/": ["OWNER", "ADMIN", "WAREHOUSE", "HELPER", "KEUANGAN"], // Allow all roles to access dashboard

    // Sales module
    "/sales": ["SALES", "OWNER", "ADMIN"],
    "/sales/fields": ["SALES"],
    "/sales/field-visits": ["SALES"],
    "/sales/orders": ["SALES"],
    "/sales/order-history": ["SALES"],
    "/sales/invoice": ["OWNER", "ADMIN"],
    "/sales/invoice-cancellation": ["OWNER", "ADMIN"],
    "/sales/pengiriman": ["OWNER", "HELPER", "ADMIN"],
    "/sales/surat-jalan": ["OWNER", "ADMIN"],
    "/sales/tukar": ["OWNER", "ADMIN"],

    // Inventory module
    "/inventory/produksi": ["WAREHOUSE", "OWNER"],
    "/inventory/manajemen-stok": ["WAREHOUSE", "OWNER"],
    "/inventory/stok-opname": ["WAREHOUSE", "OWNER"],
    "/inventory/produk": ["WAREHOUSE", "OWNER"],

    // Purchasing module
    "/purchasing/daftar-po": ["OWNER", "ADMIN"],
    "/purchasing/pengeluaran": ["OWNER", "ADMIN"],
    "/purchasing/transaction-history": ["OWNER", "ADMIN"],
    "/purchasing/pembayaran": ["OWNER", "ADMIN"],

    // Finance module
    "/management/finance/revenue-analytics": ["OWNER", "KEUANGAN"],
    "/management/finance/expenses": ["OWNER", "KEUANGAN"],
    "/management/finance/piutang": ["OWNER", "KEUANGAN"],
    "/management/finance/detailed": ["OWNER", "KEUANGAN"],

    // Management module
    "/management": ["ADMIN", "OWNER"],
    "/management/kategori": ["WAREHOUSE", "OWNER"],
    "/management/kustomer": ["OWNER", "ADMIN"],
    "/management/pajak": ["OWNER"],
    "/management/profil": ["OWNER"],
    "/management/users": ["OWNER"],
    "/management/sales-target": ["OWNER"],
    "/management/field-visits": ["OWNER"],
  };

  // --- 3. Function to get default redirect path based on role ---
  const getDefaultRedirectPath = (userRole: string): string => {
    switch (userRole) {
      case "SALES":
        return "/sales";
      case "WAREHOUSE":
        return "/inventory/produksi";
      case "HELPER":
        return "/sales/pengiriman";
      case "KEUANGAN":
        return "/management/finance/revenue-analytics";
      case "ADMIN":
        return "/sales/invoice";
      case "OWNER":
        return "/";
      default:
        return "/";
    }
  };

  // --- 4. Prevent authenticated users from accessing auth pages ---
  if (
    session &&
    (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up"))
  ) {
    const defaultPath = getDefaultRedirectPath(session.user.role);
    return NextResponse.redirect(new URL(defaultPath, request.url));
  }

  // --- 5. Sub-Module Role-Based Access Control ---
  if (session) {
    const userRole = session.user.role;

    // Find the most specific matching path
    let matchedPath = "";
    let matchedRoles: string[] = [];

    // Sort paths by length (longest first) to get most specific match
    const sortedPaths = Object.keys(subModuleRoles).sort(
      (a, b) => b.length - a.length
    );

    for (const rulePath of sortedPaths) {
      if (
        pathname === rulePath ||
        (rulePath !== "/" && pathname.startsWith(rulePath + "/"))
      ) {
        matchedPath = rulePath;
        matchedRoles = subModuleRoles[rulePath];
        break;
      }
    }

    // If we found a matching path and user doesn't have access
    if (matchedPath && !matchedRoles.includes(userRole)) {
      const defaultPath = getDefaultRedirectPath(userRole);
      // Prevent redirect loop
      if (pathname !== defaultPath) {
        return NextResponse.redirect(new URL(defaultPath, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  // Matcher untuk semua URL yang perlu dilindungi
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
