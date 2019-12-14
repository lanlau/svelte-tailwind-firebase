<script>
  import { replace } from "svelte-spa-router";
  import { Auth } from "../../firebase";

  let email = "";
  let password = "";
  const login = () => {
    Auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        replace("/admin");
      })
      .catch(error => {
        console.error("error", error);
      });
  };
</script>

<div class="bg-blue-400 h-screen w-screen">
  <div
    class="flex flex-col items-center flex-1 h-full justify-center px-4 sm:px-0">
    <div
      class="flex rounded-lg shadow-lg w-full sm:w-3/4 lg:w-1/2 bg-white sm:mx-0"
      style="height: 500px">
      <div class="flex flex-col w-full md:w-1/2 p-4">
        <div class="flex flex-col flex-1 justify-center mb-8">
          <h1 class="text-4xl text-center font-thin">MySite</h1>
          <div class="w-full mt-4">
            <form class="form-horizontal w-3/4 mx-auto">
              <div class="flex flex-col mt-4">
                <input
                  id="email"
                  type="text"
                  class="flex-grow h-8 px-2 border rounded border-grey-400"
                  name="email"
                  value=""
                  placeholder="Email"
                  bind:value={email} />
              </div>
              <div class="flex flex-col mt-4">
                <input
                  id="password"
                  type="password"
                  class="flex-grow h-8 px-2 rounded border border-grey-400"
                  name="password"
                  required
                  bind:value={password}
                  placeholder="Password" />
              </div>
              <div class="flex flex-col mt-8">
                <button
                  type="submit"
                  class="bg-blue-500 hover:bg-blue-700 text-white text-sm
                  font-semibold py-2 px-4 rounded"
                  on:click|preventDefault={login}>
                  Login
                </button>
              </div>
            </form>
            <div class="hidden text-center mt-4">
              <a
                class="no-underline hover:underline text-blue-dark text-xs"
                href="/">
                Forgot Your Password?
              </a>
            </div>
          </div>
        </div>
      </div>
      <div class="hidden md:flex md:w-1/2 rounded-r-lg flex items-center">
        <i class="material-icons text-blue-500 m-auto" style="font-size:300px">
          poll
        </i>

      </div>
    </div>
  </div>
</div>
