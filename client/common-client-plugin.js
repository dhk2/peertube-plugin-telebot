function register({ registerHook, peertubeHelpers }) {
  const redirectURL = "https://p2ptube.us/plugins/telebot/router/callback";
  const robotName = "p2pptbot";
  const elem = document.createElement('div')
  var instance = undefined;
  elem.className = 'hello-world-h4'
  elem.innerHTML = "<script async src=\"https://telegram.org/js/telegram-widget.js?19\" data-telegram-login=\"" + robotName + "\" data-size=\"large\" data-auth-url=\"" + redirectURL + "\" data-request-access=\"write\"></script>"
  registerHook({
    target: 'action:router.navigation-end',
    handler: async ({ path }) => {
      if (!(await peertubeHelpers.isLoggedIn())) {
        var pluginSettings = await peertubeHelpers.getSettings();
        var serverSettings = await peertubeHelpers.getServerConfig();
        console.log(serverSettings.instance);
        instance = serverSettings.instance.name;
        if (instance == "PeerTube") { instance = "p2ptube.us" }
        var instanceUrl = "https://" + instance;
        console.log("peertube site", instance, instanceUrl);
        const panel = document.createElement('div');
        panel.setAttribute('class', 'telebot-button');

        const html = `<div _ngcontent-cav-c133="" class="login-buttons-block ng-star-inserted">
        <a _ngcontent-cav-c133="" routerlink="/plugins/telebot/router/telegram" display="none" class="peertube-button-link orange-button ng-star-inserted" href="/plugins/telebot/router/telegram" data-alli-title-id="24507269" title="Login with Telegram">Login with Telegram</a>
        </div>`;
        panel.innerHTML = html;

        setInterval(async function () {
          if ((document.querySelector('.top-menu .telebot-button') === null)) {
            const topMenu = document.querySelector('.top-menu');
            if (topMenu) {
              topMenu.appendChild(panel);
            }
          }
          const button = document.querySelector('.telebot-button');
          if (button) {
            if (await peertubeHelpers.isLoggedIn() == true) {
              button.style.display = "none";
            } else {
              button.style.display = "block";
            }
          } else {
          }
        }, 1)
      } else {
        console.log("logged in");
      }
    }
  })
}
export {
  register
}
