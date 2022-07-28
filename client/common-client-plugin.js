function register({ registerHook, peertubeHelpers }) {
  const redirectURL = "https://p2ptube.us/plugins/telebot/router/callback";
  const robotName = "p2pptbot";
  const elem = document.createElement('div')
  var instance = undefined;
  elem.className = 'hello-world-h4'
  elem.innerHTML = "<script async src=\"https://telegram.org/js/telegram-widget.js?19\" data-telegram-login=\"" + robotName + "\" data-size=\"large\" data-auth-url=\"" + redirectURL + "\" data-request-access=\"write\"></script>"
  registerHook({
    target: 'action:auth-user.information-loaded',
    handler: async ({ user }) => {
      //TODO make this use a route to grab the Photo_url
      var avatarUrl = 'https://t.me/i/userpic/320/b3GL7orI5QS4tx8MfH7Ty9zm1p2kN6t8DSnTByZUWGghH9AFvX4A-cqom2k0-iR3.jpg';
      var avatar = undefined;
      const options = {
        method: "GET",
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      };
      let response = await fetch(avatarUrl, options);
      if (response.status === 200) {
        avatar = await response.blob()
        console.log("image set to blob", avatar);
      }
      else {
        console.log("unable to download avatar\n HTTP-Error: " + response.status)
      }
      //var avatar = fetch(avatarUrl);
      console.log(user.account.name, user.username, user.videoChannels, user.account.avatars);
      console.log(avatarUrl, avatar);
      if ((user.account.avatars.length == 0) && (avatarUrl)) {
        console.log("updating avatar to", avatarUrl);
        console.log(user.tokens.accessToken);
        fetch('p2ptube.us/api/v1/users/me/avatar/pick', {
          method: "PUT", // or "PUT" with the url changed to, e.g "https://reqres.in/api/users/2"
          headers: {
            'Content-Type': 'multipart/form-data',
            'RequestMode': 'no-cors',
            'Authorization': 'Bearer ' + user.tokens.accessToken
          },
          body: JSON.stringify(
            { data: { bannerfile: avatar } }
          )
        });
      }
    }
  })

  registerHook({
    target: 'action:router.navigation-end',
    handler: async ({ path }) => {
      if (!(await peertubeHelpers.isLoggedIn())) {
        console.log("\n\n\npath", path);
        var pluginSettings = await peertubeHelpers.getSettings();
        var serverSettings = await peertubeHelpers.getServerConfig();
        console.log(serverSettings.instance);
        instance = serverSettings.instance.name;
        if (instance == "PeerTube") { instance = "p2ptube.us" }
        var instanceUrl = "https://" + instance;
        console.log("peertube site",instance, instanceUrl);
        const panel = document.createElement('div');
        panel.setAttribute('class', 'telebot-button');
        const html = `<div _ngcontent-cav-c133="" class="login-buttons-block ng-star-inserted">
        <a _ngcontent-cav-c133="" routerlink="/plugins/telebot/router/telegram" class="peertube-button-link orange-button ng-star-inserted" href="/plugins/telebot/router/telegram" data-alli-title-id="24507269" title="Login with Telegram">Login with Telegram</a>
        </div>`;
        panel.innerHTML = html;

        setInterval(async function () {
          if ((document.querySelector('.top-menu .telebot-button') === null) && (!(await peertubeHelpers.isLoggedIn()))) {
            const topMenu = document.querySelector('.top-menu');
            console.log("topmenu", topMenu);
            if (topMenu) {
              console.log("insterting panel into topmenu", panel)
              topMenu.appendChild(panel);
            }
          }
          if ((document.querySelector('.menu-wrapper .telebot-button') === null) && (!(await peertubeHelpers.isLoggedIn()))) {
            const mainContent = document.querySelector('.menu-wrapper');
            console.log("maincontent", mainContent)
            if (mainContent) {
              panel.classList.add('section')
              mainContent.appendChild(panel)
              console.log("Panel added to main content", panel);
            }
          }
        }, 1)
      } else {
        console.log("logged in");
        //TODO need to remove login prompt from menu when already logged in without needing refresh
      }
    }
  })
}

export {
  register
}
