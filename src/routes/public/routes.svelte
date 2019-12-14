<script>
  import Router, { link } from "svelte-spa-router";
  import Nav from "../../components/nav/nav.svelte";
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

<Nav />
<h1>Public Routes</h1>
<Router {routes} />
