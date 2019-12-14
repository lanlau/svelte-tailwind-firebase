<script>
  import Router from "svelte-spa-router";
  import Sessions from "./sessions/sessions.svelte";
  import Session from "./session/session.svelte";
  import Notfound from "../public/Notfound.svelte";

  const routes = {
    "/": Sessions,
    "/sessions": Sessions,
    "/session": Session,
    "*": Notfound
  };
</script>

<h1>Protected Routes</h1>
<Router {routes} prefix="/admin" />
