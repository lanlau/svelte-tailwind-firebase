<script>
  import { link } from "svelte-spa-router";
  import { createEventDispatcher } from "svelte";
  export let user;

  const dispatch = createEventDispatcher();

  const logout = () => {
    dispatch("logout");
  };

  let menuVisible = false;
</script>

<nav class="flex items-center justify-between flex-wrap bg-blue-500 p-6">
  <div class="flex items-center flex-shrink-0 text-white mr-6">
    <i class="material-icons fill-current text-3xl mr-2">poll</i>
    <span class="font-semibold text-xl tracking-tight">HeroicPolls</span>
  </div>
  <div class="block lg:hidden">
    <button
      class="flex items-center px-3 py-2 border rounded text-white border-white
      hover:text-white hover:border-white"
      on:click={() => (menuVisible = !menuVisible)}>
      <svg
        class="fill-current h-3 w-3"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg">
        <title>Menu</title>
        <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
      </svg>
    </button>
  </div>
  <div
    class:hidden={!menuVisible}
    class="w-full block flex-grow lg:flex lg:items-center lg:w-auto">
    <div class="text-sm lg:flex-grow">
      {#if user && user.id !== 0}
        <a
          href="/"
          class="block mt-4 lg:inline-block lg:mt-0 text-white hover:text-white
          mr-4"
          use:link>
          Home
        </a>
        <a
          href="/admin/sessions"
          class="block mt-4 lg:inline-block lg:mt-0 text-white hover:text-white
          mr-4"
          use:link>
          Sessions
        </a>
      {/if}
    </div>
    <div>
      {#if !user || user.id === 0}
        <a
          href="/signin"
          class="inline-block text-sm px-4 py-2 leading-none border rounded
          text-white border-white hover:border-transparent hover:text-blue-500
          hover:bg-white mt-4 lg:mt-0"
          use:link>
          Signin
        </a>
      {:else}
        <a
          href="/"
          class="inline-block text-sm px-4 py-2 leading-none border rounded
          text-white border-white hover:border-transparent hover:text-blue-500
          hover:bg-white mt-4 lg:mt-0"
          on:click={logout}
          use:link>
          {user.firstname} {user.lastname}
        </a>
      {/if}
    </div>
  </div>
</nav>
