export function createRouter() {
  const views = new Map();
  let currentView = null;

  window.addEventListener("popstate", () => handlePopstate());

  function register(viewName, ViewFactory) {
    views.set(viewName, ViewFactory);
  }

  function navigate(viewName, params) {
    if (currentView) {
      currentView.destroy();
    }
    history.pushState({ view: viewName }, "", `/${viewName}`);
    const ViewFactory = views.get(viewName);
    if (ViewFactory) {
      currentView = ViewFactory();
      currentView.init(params);
      currentView.render();
    }
  }

  function handlePopstate() {
    const viewName = history.state?.view || "home";
    navigate(viewName);
  }

  return {
    register,
    navigate,
  };
}
