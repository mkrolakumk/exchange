import { createRouter } from "./router.js";
import { createHomeView } from "./views/home.js";

const router = createRouter();
router.register("home", createHomeView);
router.navigate("home");

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
