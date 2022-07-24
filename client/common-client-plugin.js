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
      //document.getElementById('plugin-placeholder-player-next').appendChild(elem);
      if (!(await peertubeHelpers.isLoggedIn())) {
        console.log("\n\n\npath", path);
        var pluginSettings = await peertubeHelpers.getSettings();
        var serverSettings = await peertubeHelpers.getServerConfig();
        console.log(serverSettings.instance);
        instance = serverSettings.instance.name;
        if (instance == "PeerTube") { instance = "p2ptube.us" }
        var instanceUrl = "https://" + instance;
        console.log(instance, instanceUrl);
        const panel = document.createElement('div');
        panel.setAttribute('class', 'custom-links');

        //const html = `<script src="https://telegram.org/js/telegram-widget.js?19" data-telegram-login="p2pptbot" data-size="large" data-auth-url="https://p2ptube.us/plugins/telebot/router/callback" data-request-access="write"></script>`
        //const html = "<script async src=\"https://telegram.org/js/telegram-widget.js?19\" data-telegram-login=\"" + robotName + "\" data-size=\"large\" data-auth-url=\"" + redirectURL + "\" data-request-access=\"write\"></script>";
        //const html = c + "<h1>what the actual fuck";
        const html = `<button><a href="/plugins/telebot/router/telegram">Login With Telegram</a></button>`;
        panel.innerHTML = html;
        console.log("panel", panel);
        console.log("html", html);

        setInterval(async function () {
          if ((document.querySelector('.top-menu .custom-links') === null) && (!(await peertubeHelpers.isLoggedIn()))) {
            const topMenu = document.querySelector('.top-menu');
            console.log("topmenu", topMenu);
            if (topMenu) {
              console.log("eat me", panel)
              topMenu.appendChild(panel);
              console.log("i've been eaten!", topMenu);
            }
          }
          if ((document.querySelector('.menu-wrapper .custom-links') === null) && (!(await peertubeHelpers.isLoggedIn()))) {
            const mainContent = document.querySelector('.menu-wrapper');
            console.log("maincontent", mainContent)
            if (mainContent) {
              panel.classList.add('section')
              mainContent.appendChild(panel)
              console.log("Panels ", panel);
            }
          }
        }, 1)
      } else {
        console.log("logged in");
        //TODO need to remove login prompt from menu when already logged in without needing refresh
        /*
        const panel = document.getElementsByClassName("customer-links");
        if (document.querySelector('.top-menu .custom-links') != null) {
          const topMenu = document.querySelector('.top-menu');
          console.log("topmenu", topMenu);
          if (topMenu) {
            topMenu.removeChild(panel);
          }
        }
        if (document.querySelector('.menu-wrapper .custom-links') != null) {
          const mainContent = document.querySelector('.menu-wrapper');
          console.log("maincontent", mainContent)
          if (mainContent) {
            mainContent.removeChild(panel)
          }
        }
        */
      }
    }
  })
}


export {
  register
}
