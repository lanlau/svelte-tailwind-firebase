<script>
  import Router, { link } from "svelte-spa-router";
  import Home from "./Home.svelte";
  import Signin from "./Signin.svelte";
  import Signup from "./Signup.svelte";
  import Notfound from "./Notfound.svelte";
  const routes = {
    "/": Home,
    "/Signin": Signin,
    "/signup": Signup,
    "*": Notfound
  };
</script>

<Router {routes} />
