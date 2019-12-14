<script>
  import Loading from "../components/loading/loading.svelte";
  import Nav from "../components/nav/nav.svelte";
  import publicRoutes from "./public/routes.svelte";
  import protectedRoutes from "./protected/routes.svelte";
  import Router, { link, wrap, replace, location } from "svelte-spa-router";
  import { currentUser } from "../stores/user";

  import { watchAuthState, signOut } from "../middleware/auth.js";

  let showPage = false;

  watchAuthState();

  const routes = {
    "/admin": wrap(protectedRoutes, detail => {
      console.log("check protected1", $currentUser && $currentUser.id !== 0);
      return $currentUser && $currentUser.id !== 0;
    }),
    "/admin/*": wrap(protectedRoutes, detail => {
      console.log("check protected2", $currentUser && $currentUser.id !== 0);
      return $currentUser && $currentUser.id !== 0;
    }),
    "*": wrap(publicRoutes, detail => {
      return true;
    })
  };
  const conditionsFailed = event => {
    console.log("conditionFailed", event);
    replace("/signin");
  };

  const logout = () => {
    signOut();
  };

  $: if (!$currentUser) {
    showPage = false;
  } else {
    showPage = true;
  }
</script>

{#if !showPage}
  <Loading />
{:else}
  {#if $location !== '/signin'}
    <Nav user={$currentUser} on:logout={logout} />
  {/if}

  <Router {routes} on:conditionsFailed={conditionsFailed} />
{/if}
