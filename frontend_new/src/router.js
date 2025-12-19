export function createRouter() {
  const views = new Map();
  let currentView = null;

  function register(viewName, ViewFactory) {
    views.set(viewName, ViewFactory);
  }

  function navigate(viewName, params) {
    if (currentView) {
      currentView.destroy();
    }
    const ViewFactory = views.get(viewName);
    if (ViewFactory) {
      currentView = ViewFactory();
      currentView.init(params);
      currentView.render();
    }
  }

  return {
    register,
    navigate,
  };
}
