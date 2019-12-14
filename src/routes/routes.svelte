<script>
  import publicRoutes from "./public/routes.svelte";
  import protectedRoutes from "./protected/routes.svelte";
  import Router, { link } from "svelte-spa-router";
  const routes = {
    "/admin": protectedRoutes,
    "/admin/*": protectedRoutes,
    "*": publicRoutes
  };
</script>

<Router {routes} />
