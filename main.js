const axios = require('axios');
const fs = require('fs');
const tiny = require('tiny-json-http')
const Downloader = require('nodejs-file-downloader');
const { Telegraf } = require('telegraf')
const { Keyboard } = require('telegram-keyboard');
const { channel } = require('diagnostics_channel');
const { Console } = require('console');
//const tiny = require('tiny-json-http')
botApiUrl = "https://api.telegram.org/bot5396896142:AAHoEXAWjWrMPZ-M1H4H5K2gxAH7-2cVGrc/sendMessage?chat_id=-1001745964654&text=";
var announceChannel = undefined;
var announcePlaylist = undefined;
var announcePlaylistId = undefined;
var adminUser = "root";
var adminUser = "test";
var botName = undefined;
var botKey = undefined;
var botChats = [];
var instance = "https://p2ptube.us";
var debug = true;
var bot = undefined;
var defaultInvidious = "https://invidious.peertube.support";
var importedVideos = [];
var basePath = undefined;
var testWebServer = undefined;
//var chatID = "unset";
var syncChannels = [];
async function register({
  registerExternalAuth,
  getRouter,
  peertubeHelpers,
  registerSetting,
  settingsManager,
  storageManager,
  registerHook
}) {
  //                                     Settings
  registerSetting({
    name: 'telegram-admin-user',
    label: 'Administrative user name, needed for youtube sync and video importing',
    type: 'input',
    private: true
  })
  registerSetting({
    name: 'telegram-admin-password',
    label: 'Administrative user password, needed for youtube sync and video importing',
    type: 'input-password',
    private: true
  })
  registerSetting({
    name: 'telegram-invidious',
    label: 'invidious instance to use for synching videos with youtube',
    type: 'input',
    private: true
  })
  registerSetting({
    name: 'telegram-key',
    label: 'Telegram Bot Key',
    type: 'input-password',
    private: true
  })
  registerSetting({
    name: 'telegram-name',
    label: 'Telegram Bot name',
    type: 'input',
    private: false
  })
  registerSetting({
    name: 'telegram-announce-channel',
    label: 'Channel UUID to send new videos to all unmuted chatters',
    type: 'input',
    private: true
  })
  registerSetting({
    name: 'telegram-announce-playlist',
    label: 'playlist UUID to send newly added videos to all unmuted chatters',
    type: 'input',
    private: true
  })
  registerSetting({
    name: 'telegram-default-announcements',
    label: 'mute announcements by default',
    type: 'input-checkbox',
    private: false
  })
  registerSetting({
    name: 'telegram-default-subscriptions',
    label: 'mute subscription notifications by default',
    type: 'input-checkbox',
    private: false
  })
  registerSetting({
    name: 'telegram-default-lives',
    label: 'mute live notifications by default',
    type: 'input-checkbox',
    private: false
  })
  registerSetting({
    name: 'telegram-default-welcome',
    label: 'mute chat welcome message by default',
    type: 'input-checkbox',
    private: false
  })
  //                                  global plugin variables
  //
  try {
    botName = await settingsManager.getSetting("telegram-name");
    botKey = await settingsManager.getSetting("telegram-key");
    adminUser = await settingsManager.getSetting("telegram-admin-user");
    adminPassword = await settingsManager.getSetting("telegram-admin-password");
    announceChannel = await settingsManager.getSettings("telegram-announce-channel");
    announcePlaylist = await settingsManager.getSettings("telegram-announce-playlist");
    //defaultInvidious = await settingsManager.getSettings("telegram-invidious");
  } catch { console.log("error loading settings") }
  if (botName == undefined) {
    console.log("No Bot information available, unable to initialize plugin");
    return;
  }
  //                               plugin initialization
  basePath = peertubeHelpers.plugin.getDataDirectoryPath();
  var base = peertubeHelpers.config.getWebserverUrl();
  console.log("Initializing Telegram Bot Plug In", basePath, base);
  if (base.indexOf("9000") > 1) {
    testWebServer = base;
    instance = "https://p2ptube.us"
    console.log("pre-alpha test site detected", instance,);
  } else {
    instance = base;
    console.log("instance name:", instance);
  }
  try {
    var storageBotChats = await storageManager.getData('telegram-chats');
  } catch { console.log("error loading existing telegram users") }
  if (storageBotChats != undefined) {
    //console.log("storageBotchats", storageBotChats);
    botChats = storageBotChats;
    // console.log("botChats", botChats);
  } else {
    console.log("no known telegram users");
    botChats = [];
  }
  try {
    importedVideos = await storageManager.getData('telegram-imports');
  } catch { console.log("error loading imported video list") }
  if (importedVideos == undefined) {
    console.log("initializing imported videos");
    importedVideos = [];
  }
  //console.log("imported videos", importedVideos);
  var bearerToken = "";
  try {
    if (testWebServer) {
      bearerToken = await getToken(adminUser, adminPassword, testWebServer + "/api/v1");
    } else {
      bearerToken = await getToken(adminUser, adminPassword, instance + "/api/v1");
    }
  } catch { console.log("error getting bearer token") }
  console.log("\n\n\n\n\n\n\nring bear: ", bearerToken);
  try {
    syncChannels = await storageManager.getData('telegram-sync');
  } catch { console.log("error loading youtube sync list") }
  if (syncChannels == undefined) {
    console.log("initializing sync channels");
    syncChannels = [];
  }
  if (announcePlaylist) {
    var playlists = undefined;
    try {
      var playlistsresult = await axios.get(instance + "/api/v1/video-playlists");
      playlists = playlistsresult.data.data;
    } catch (err) {
      console.log("unable to load playlists, looking for ", announcePlaylist, err);
    }
    console.log(playlists);
    if (playlists) {
      for (i = 0; i < playlists.length; i++) {
        console.log("announcement playlists", announcePlaylist)
        if (playlists[i].uuid == announcePlaylist) {
          announcePlaylistId = playlists[i].id
        }
      }
    }
  } else {
    console.log("no playlist");
  }
  console.log("instance", instance);
  console.log("telegram announce playlist ID", announcePlaylistId);
  console.log("telegram-name", botName);
  console.log("telegram-key length", botKey.length);
  console.log("telegram-admin-user", adminUser);
  console.log("telegram-admin-password length", adminPassword.length);
  console.log("telegram-announce-channel", announceChannel);
  console.log("telegram-announce-playlist", announcePlaylist);
  console.log("telegram-invidious", defaultInvidious);
  console.log("sync channels", syncChannels.length);
  console.log("telegram linked accounts", botChats.length);
  console.log("imported videos", importedVideos.length);
  //
  //                                       BOT stuff
  try {
    bot = new Telegraf(botKey);
  } catch {
    console.log("unable to start bot, may be already running");
  }
  bot.start((ctx) => ctx.reply('Welcome to Telebot for PeerTube'))
  bot.help((ctx) => ctx.reply('Communication channel with peertube instance at ' + instance))
  /*
  bot.url(async (ctx) => {
    sentUrl = ctx.update.message.text;
    //console.log(ctx.update);
    hack1 = sentUrl.indexOf("watch?v=");
    var videoUuid = undefined;
    if (hack1 > 1) {
      console.log("video link hack 1")
      videoUuid = sentUrl.substring(hack1 + 8);
      ctx.reply("need to import " + videoUuid);
    }
    hack2 = sentUrl.indexOf("youtu.be");
    if (hack2 > 1) {
      console.log("video link hack2");
      videoUuid = sentUrl.substring(hack2 + 9);
      ctx.reply("need to import " + videoUuid);
    }
    let chatter = ctx.update.message.from.id;
    console.log("chatter", chatter)
    var user = await storageManager.getData(chatter);
    console.log("chatter name", user.displayname)
    var userChannels = await axios.get(`${instance}/api/v1/accounts/${user.username}/video-channels`);
    console.log("chatter", chatter, "user channels", userChannels.data.data[0]);
    var importResult = await importVideo(userChannels.data.data[0].id, sentUrl, bearerToken);
    console.log("importresult", importResult);
    if (videoUuid) {
      var videoJson = await getInvidiousJSON(defaultInvidious, videoUuid);
      console.log("video JSON from invidious", videoJson.captions);
      if (videoJson.captions) {
        var captions = videoJson.captions
        for (i = 0; i < captions.length; i++) {
          var downloader = new Downloader({
            url: defaultInvidious + captions[i].url,//If the file name already exists, a new file with the name 200MB1.zip is created.
            directory: basePath,//This folder will be created, if it doesn't exist.
            fileName: videoUuid + captions[i].label,
            cloneFiles: false
          })
          try {
            var captionDownloadResult = await downloader.download();//Downloader.download() returns a promise.
            console.log('downloaded', downloader, captionDownloadResult);
          } catch (error) {//IMPORTANT: Handle a possible error. An error is thrown in case of network errors, or status codes of 400 and above.
            console.log('Download failed', filename, error)
          }
        }
      } else {
        console.log("no captions available");
      }
    } else {
      console.log("no youtube id found");
    }
    ctx.reply(' imported ' + importResult.data.video.url);
  })
  */
  //TODO set sticker as avatar
  bot.on('sticker', (ctx) => ctx.reply('Thanks for the sticker'))

  bot.command('settings', async (ctx) => {
    //console.log("message from", ctx.update.message.from);
    //console.log("message chat", ctx.update.message.chat);
    var statusUser = "";
    try {
      var user = await storageManager.getData(ctx.update.message.from.id);
    } catch {
      console.log("error getting user from peertube db for settings", ctx.update.message.from)
    }
    //console.log("user", user);
    if (user == undefined) {
      console.log("failed to determine user to find status for");
      ctx.reply("no settings for you");
      return;
    }
    user.pending = "";
    storageManager.storeData(ctx.update.message.from.id, user);
    statusUser = "User Name: " + user.username +
      "\nDisplay Name: " + user.displayname +
      "\nEmail: " + user.email +
      "\nChat ID: " + ctx.update.message.from.id +
      "\nNotifications: ";
    var notes = "";
    if (!user.muteAnnouncements) {
      notes = notes + "Announcements ";
    }
    if (!user.muteLives) {
      notes = notes + "Livestreams ";
    }
    if (!user.muteSubscriptions) {
      notes = notes + "Subscriptions ";
    }
    if (!user.muteWelcome) {
      notes = notes + "Greeting ";
    }
    if (notes == "") {
      notes = "Muted";
    }
    if (notes.length == 49) {
      notes = "All";
    }
    statusUser = statusUser + notes;
    console.log("getting video channels", `${instance}/api/v1/accounts/${user.username}/video-channels`);
    try {
      var userChannels = await axios.get(`${instance}/api/v1/accounts/${user.username}/video-channels`);
    } catch {
      console.log("API call failure getting channels", instance, user);
    }
    //console.log("\n\n user channels", userChannels);
    //console.log("how many channels", userChannels.data.data.length);
    let c = userChannels.data.data;
    if (c) {
      statusUser = statusUser + "\nChannels:\n"

      for (let j = 0; j < c.length; j++) {
        //console.log("temp step", j, c[j].name);
        statusUser = statusUser + "\n (" + c[j].name + ") " + c[j].displayName;
        if (syncChannels) {
          for (let i = 0; i < syncChannels.length; i++) {
            console.log(c[j].name, syncChannels[i].handle);
            if (syncChannels[i].handle == c[j].name) {
              statusUser = statusUser + " synched to https://youtube.com/channel/" + syncChannels[i].uuid;
            }
          }
        }
      }
    }
    console.log("imported videos:", importedVideos.length);
    console.log("synched channels:", syncChannels.length, syncChannels);
    console.log("telegram linked users", botChats.length, botChats);
    return ctx.reply(statusUser);
  })

  bot.command('setname', async (ctx) => {
    var chatID = ctx.update.message.from.id;
    var user = await storageManager.getData(chatID);
    user.pending = "name";
    storageManager.storeData(chatID, user);
    ctx.reply("what do you want the name to be");
    console.log("Message:\n", ctx.update.message);
    console.log("\nChat:\n", ctx.update.chat);

  })

  bot.command('setsync', async (ctx) => {
    var chatID = ctx.update.message.from.id;
    var user = await storageManager.getData(chatID);
    user.pending = "sync";
    storageManager.storeData(chatID, user);
    ctx.reply("youtube channel ID to sync");
    //console.log("Message:\n", ctx.update.message);
    //console.log("\nChat:\n", ctx.update.chat);

  })

  bot.command('setchannelbanner', async (ctx) => {
    var chatID = ctx.update.message.from.id;
    var user = await storageManager.getData(chatID);
    //need to find out if there is a better way to get responses
    user.pending = "banner";
    storageManager.storeData(chatID, user);
    ctx.reply("url of banner");
    //console.log("Message:\n", ctx.update.message);
    //console.log("\nChat:\n", ctx.update.chat);

  })

  bot.command('setchannelavatar', async (ctx) => {
    var chatID = ctx.update.message.from.id;
    var user = await storageManager.getData(chatID);
    //need to find out if there is a better way to get responses
    user.pending = "channelavatar";
    storageManager.storeData(chatID, user);
    ctx.reply("url of avatar");
    //console.log("Message:\n", ctx.update.message);
    //console.log("\nUpdate:\n", ctx.update);

  })
  bot.command('clearcache', async (ctx) => {
    var chatID = ctx.update.message.from.id;
    var user = await storageManager.getData(chatID);
    botChats = [];
    await storageManager.storeData('telegram-chats', botChats);
    importedVideos = [];
    await storageManager.storeData('telegram-imports', importedVideos);
    syncChannels = [];
    await storageManager.storeData('telegram-sync', syncChannels);
    ctx.reply("cache files cleared");
  })
  bot.command('clearsync', async (ctx) => {
    //var chatID = ctx.update.message.from.id;
    //var user = await storageManager.getData(chatID);
    syncChannels = [];
    await storageManager.storeData('telegram-sync', syncChannels);
    ctx.reply("sync links cleared");
  })
  bot.command('mute', async (ctx) => {
    var chatID = ctx.update.message.from.id;
    var user = await storageManager.getData(chatID);
    user.pending = "mute";
    storageManager.storeData(chatID, user);
    var keyboardOptions = [];
    console.log("mute announcements", user.muteAnnouncements, keyboardOptions);
    if (!user.muteAnnouncements) { keyboardOptions.push("Announcements") }
    if (!user.muteSubscriptions) { keyboardOptions.push("Subscriptions") }
    if (!user.muteLives) { keyboardOptions.push("Livestreams") }
    if (!user.muteWelcome) { keyboardOptions.push("Welcome") }
    if (keyboardOptions.length > 1) { keyboardOptions.push("All") }
    if (keyboardOptions.length == 0) {
      ctx.reply("all notifications already muted");
      return;
    }
    console.log("keyboard options", keyboardOptions);
    const keyboard = Keyboard.make(keyboardOptions, {
      columns: 2
    });
    console.log("keyboard", keyboard, keyboard.reply());
    await storageManager.storeData(chatID, user);
    await ctx.reply('Which notifictions to mute ', keyboard.inline());
  })

  bot.command('unmute', async (ctx) => {
    var chatID = ctx.update.message.from.id;
    var user = await storageManager.getData(chatID);
    user.pending = "unmute";
    storageManager.storeData(chatID, user);
    var keyboardOptions = [];
    if (user.muteAnnouncements) { keyboardOptions.push("Announcements") }
    if (user.muteSubscriptions) { keyboardOptions.push("Subscriptions") }
    if (user.muteLives) { keyboardOptions.push("Livestreams") }
    if (user.muteWelcome) { keyboardOptions.push("Welcome") }
    if (keyboardOptions.length > 1) { keyboardOptions.push("All") }
    if (keyboardOptions.length == 0) {
      ctx.reply("nothing currently muted");
      return;
    }
    console.log("keyboard options", keyboardOptions);
    const keyboard = Keyboard.make(keyboardOptions, {
      columns: 2
    });
    console.log("keyboard", keyboard, keyboard.reply());
    await storageManager.storeData(chatID, user);
    await ctx.reply('Which notifictions to unmute ', keyboard.inline());
  })
  bot.on('message', async (ctx) => {
    console.log("\n\nnew incoming message:" + ctx.update.message.text);
    var chatID = ctx.update.message.from.id;
    var user = await storageManager.getData(chatID);
    console.log("user pending", user.pending);
    if (!user) { return }
    if (user.pending == 'name') {
      user.pending = "";
      var newName = ctx.update.message.text;
      console.log("Changing name to ", ctx.update.message.text);
      console.log("Message:\n", ctx.update.message.text);
      console.log("\nChat:\n", ctx.update.message.from.id);
      var displayname = ctx.update.message.text;
      user.displayname = displayname;
      user.username = displayname.toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, ".");
      user.role = 2;
      user.email = user.username + `@telegram.com`
      console.log("new user", user);
      await storageManager.storeData(chatID, user);
      ctx.reply('user name changed to ' + user.username);
    } else if (user.pending == "banner") {
      user.pending = "";
      await storageManager.storeData(chatID, user);
      var newBanner = ctx.update.message.text;
      console.log("\n\n\n new banner url", newBanner);
      var userChannels = await axios.get(`${instance}/api/v1/accounts/${user.username}/video-channels`);
      console.log("userChannels for updating banner", userChannels);
      await updateChannelBanner(userChannels.data.data[0].name, newBanner, bearerToken);
    } else if (user.pending == "channelavatar") {
      user.pending = "";
      await storageManager.storeData(chatID, user);
      var newAvatar = ctx.update.message.text;
      console.log("\n\n\n new avatar url", newAvatar);
      var userChannels = await axios.get(`${instance}/api/v1/accounts/${user.username}/video-channels`);
      console.log("userChannels for updating avatar", userChannels);
      await updateChannelAvatar(userChannels.data.data[0].name, newAvatar, bearerToken);
    } else if (user.pending == "sync") {
      user.pending = "";
      var youtubeId = undefined;
      var keyboardOptions = [];
      var rawChannel = ctx.update.message.text;
      console.log(rawChannel, rawChannel.length);
      if (rawChannel.length == 24) {
        youtubeId = rawChannel;
      }
      if (rawChannel.indexOf('UC') > 0) {
        youtubeId = rawChannel.substring(rawChannel.indexOf('UC'));
      }
      if (rawChannel.indexOf('/c/') > 0) {
        var channelSearch = defaultInvidious + "/api/v1/search?type=channel&q=" + rawChannel.substring(rawChannel.lastIndexOf("/") + 1);
        var searchResult = await axios.get(channelSearch);
        var channels = searchResult.data;
        if (channels) {
          youtubeId = channels[0].authorId;
        }

      }
      console.log("here's the youtube id", youtubeId);
      if (youtubeId == undefined) {
        ctx.reply("failed to find youtube channel information, supported formats:\nUC-lHJZR3Gqxm24_Vd_AJ5Yw\nhttps://www.youtube.com/channel/UC-lHJZR3Gqxm24_Vd_AJ5Yw\nhttps://www.youtube.com/c/crashcourse");
        return;
      }
      for (let i = 0; i < syncChannels.length; i++) {
        if (syncChannels[i].uuid == youtubeId) {
          ctx.reply("Channel already copied by " + syncChannels[i].handle);
          return;
        }
      }
      var userChannels = await axios.get(`${instance}/api/v1/accounts/${user.username}/video-channels`);
      console.log("how many channels", userChannels.data.data.length);
      let c = userChannels.data.data;
      for (let i = 0; i < c.length; i++) {
        console.log("\n\n menu build", i, c[i]);
        keyboardOptions.push(c[i].name);
      }
      console.log("keyboard options", keyboardOptions);
      const keyboard = Keyboard.make(keyboardOptions, {
        columns: 2
      });
      console.log("keyboard", keyboard, keyboard.reply());
      user.pending = youtubeId;
      await storageManager.storeData(chatID, user);
      await ctx.reply('PeerTube channel to sync', keyboard.inline());
    } else if (user.pending == "syncPick") {
      user.pending = "";
      console.log(user.pending2);
      console.log(youtubeId);
    } else {
      ctx.reply('work in progress, useful commands forthcoming');
      console.log("Message:\n", ctx.update.message.text);
      console.log("\nChat:\n", ctx.update.message.from.id);
    }
  })

  bot.on('callback_query', async (ctx) => {
    console.log("\n callback query", ctx.callbackQuery);
    var chatter = ctx.callbackQuery.from.id;
    console.log("callback chatter", chatter);
    var callbackData = ctx.callbackQuery.data;
    var callbackText = ctx.callbackQuery.message.text;
    console.log("callback text", callbackText);
    var user = await storageManager.getData(chatter);
    console.log("user pending ", user.pending)
    if (callbackText == "PeerTube channel to sync") {
      console.log("user pending", user.pending);
      var channelName = callbackData;
      console.log("need to sync" + user.pending + " to " + channelName);
      if (syncChannels == undefined) {
        syncChannels = [];
      }
      var syncChannel = {}
      syncChannel.uuid = user.pending;
      syncChannel.handle = channelName;
      syncChannels.push(syncChannel);
      console.log("sync channels", syncChannels);
      await storageManager.storeData("telegram-sync", syncChannels);
      await cloneChannel(syncChannel.handle, syncChannel.uuid, bearerToken);
      ctx.deleteMessage();
      ctx.reply("Synchronization configured");
      return // ctx.answerCbQuery(ctx.callbackQuery.data);
    }
    if (callbackText == "Which notifictions to mute") {
      console.log("before mute flips", user);
      if (callbackData == "Announcements" || callbackData == "All") { user.muteAnnouncements = true }
      if (callbackData == "Subscriptions" || callbackData == "All") { user.muteSubscriptions = true }
      if (callbackData == "Livestreams" || callbackData == "All") { user.muteLives = true }
      if (callbackData == "Welcome" || callbackData == "All") { user.muteWelcome = true }
      console.log("after wards", user);
      await storageManager.storeData(chatter, user);
      ctx.deleteMessage();
      ctx.reply(callbackData + " muted");
    }
    if (callbackText == "Which notifictions to unmute") {
      console.log("before mute flips", user);
      if (callbackData == "Announcements" || callbackData == "All") { user.muteAnnouncements = false }
      if (callbackData == "Subscriptions" || callbackData == "All") { user.muteSubscriptions = false }
      if (callbackData == "Livestreams" || callbackData == "All") { user.muteLives = false }
      if (callbackData == "Welcome" || callbackData == "All") { user.muteWelcome = false }
      console.log("after wards", user);
      await storageManager.storeData(chatter, user);
      ctx.deleteMessage();
      ctx.reply(callbackData + " unmuted");
    }
  })
  bot.launch();
  //
  //                                                        Hooks
  //
  registerHook({
    target: 'action:api.live-video.created',
    handler: async ({ video }) => {
      var updateMessage = await videoAnnounce(video.dataValues);
      console.log("live video announcement", updateMessage);
      for (chat of botChats) {
        var tempUser = await storageManager.getData(chat);
        console.log("live mute check", chat, tempUser.username, tempUser.muteAnnouncements)
        if (!tempUser.muteLives) {
          sendTelegram(chat, updateMessage);
        }
      }
    }
  })
  registerHook({
    target: 'action:api.video.updated',
    handler: async ({ video }) => {
      var updateMessage = await videoAnnounce(video.dataValues);
      console.log("video updated announcement", updateMessage);
      for (chat of botChats) {
        var tempUser = await storageManager.getData(chat);
        console.log("announcement mute check for updated video", chat, tempUser);
        //console.log("updated mute check", chat, tempUser.username, tempUser.muteAnnouncements)
        if (!tempUser.muteAnnouncements) {
          sendTelegram(chat, updateMessage);
        }
      }
    }
  })
  registerHook({
    target: 'action:api.video.uploaded',
    handler: async ({ video }) => {
      var updateMessage = await videoAnnounce(video.dataValues, "uploaded");
      console.log("video uploaded announcement", updateMessage);
      for (chat of botChats) {
        var tempUser = storageManager.getData(chat);
        console.log("uploaded mute check", chat, tempUser.username, tempUser.muteAnnouncements)
        if (!tempUser.muteAnnouncements) {
          sendTelegram(chat, updateMessage);
        }
      }
    }
  })
  registerHook({
    target: 'action:api.video-playlist-element.created',
    handler: async ({ playlistElement }) => {

      console.log("play list element", playlistElement);
      if (announcePlaylistId != playlistElement.datavalues.videoPlaylistId) {
        console.log("not a monitored playlist");
        //return;
      }
      videoApiUrl = instance + "/api/v1/videos/" + playlistElement.dataValues.videoId;
      playlistId = playlistElement.datavalues.videoPlaylistId;
      console.log("video api url", videoApiUrl);
      console.log("PlayList ID", playlistId);
      var videoJson = await axios.get(videoApiUrl);
      console.log("video json", videoJson);
      var videoWatchUrl = videoJson.data.url;
      var author = videJson.data.channel.displayName;
      //var updateMessage = await videoAnnounce(video.dataValues);
      var updateMessage = "new video by " + author + "\n" + videoWatchUrl;
      for (chat of botChats) {
        sendTelegram(chat, updateMessage);
      }
    }
  })
  const result = registerExternalAuth({
    authName: 'telebot',
    authDisplayName: () => 'Telegram Authentication',
    getWeight: () => 60,
    onAuthRequest: async (req, res) => {
      /*      var base = peertubeHelpers.config.getWebserverUrl();
            if (base.indexOf("9000") > 1) {
              base = "https://p2ptube.us"
            }
      */
      var redirectURL = instance + '/plugins/telebot/router/callback';
      var telegramWidget = "<html><body><script async src=\"https://telegram.org/js/telegram-widget.js?19\" data-telegram-login=\"" + botName + "\" data-size=\"large\" data-auth-url=\"" + redirectURL + "\" data-request-access=\"write\"></script></body></html>"
      console.log("\n\n\n widget script", telegramWidget);
      console.log("redirect", redirectURL);
      console.log("bot key", botKey);
      console.log("bot name", botName, "\n\n");
      return res.status(200).send(telegramWidget);
    },
  });
  //
  //                                                Routers
  //
  const router = getRouter();
  router.use('/callback', async (req, res) => {
    console.log(req.query.id, req.query.first_name, req.query.last_name, req.query.username);
    var chatID = req.query.id;
    console.log("\n\nchatID", chatID);
    //console.log("req", req, "\nres", res);
    var user = {};
    if (!botChats.includes(chatID)) {
      botChats.push(chatID);
      await storageManager.storeData("telegram-chats", botChats);
      console.log("added chat id " + chatID + " to existing telegram users")
    }
    try {
    user = await storageManager.getData(chatID)
    console.log("user data loaded", user);
    } catch (err){
      console.log("error loading user data",err);
    }
    var userChannels = "";
    if (user) {
      //upgrade hacks
      console.log("existing user detected");
      if (user.muteAnnouncements == undefined) { user.muteAnnouncements = false }
      if (user.muteLives == undefined) { user.muteLives = false }
      if (user.muteSubscriptions == undefined) { user.muteSubscriptions = false }
      if (user.muteWelcome == undefined) { user.muteWelcome = false }
      if (user.pending) { user.pending = undefined }
      if (user.pending2) { user.pending = undefined }
      await storageManager.storeData(user.id, user);
      if (botChats == undefined) {
        console.log("need to initialize botchats");
        botChats = [user.id];

      }
      console.log("\n\nStored telegram user info", user);
      javascriptisstupid = user.id;
      console.log(javascriptisstupid, "welcome back to peertube " + user.displayname);
      if (!user.muteWelcome) {
        sendTelegram(javascriptisstupid, "welcome back to peertube " + user.displayname);
      }
      if (user.avatar != req.query.photo_url) {
        user.avatar = req.query.photo_url;
        console.log("need to update avatar url for user", user.avatar);
        await storageManager.storeData(user.id, user);
      }
      console.log("getting user channels for ", user.username);
      console.log(`/api/v1/accounts/${user.username}/video-channels`)
      userChannels = await axios.get(`${instance}/api/v1/accounts/${user.username}/video-channels`);
      console.log("User channels loaded during authentication ", userChannels);
      for (const channel of userChannels.data.data) {
        console.log("channel name:", channel.name, "\ndisplay name", channel.displayName, channel.sync);
      }

    } else {
      console.log("Building new user", req.query);
      var displayname = req.query.username;
      if (displayname == undefined) {
        displayname = req.query.first_name + "." + req.query.last_name;
      }
      if (displayname == undefined) {
        displayname = req.query.id;
      }
      console.log("displayname: ", displayname);
      user.displayname = displayname;
      user.id = req.query.id;
      user.username = displayname.toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, ".");
      user.role = 2;
      user.email = user.username + `@telegram.com`
      user.avatar = req.query.photo_url;
      user.muteAnnouncements = await settingsManager.getSetting("telegram-default-announcements");
      user.muteLives = await settingsManager.getSetting("telegram-default-lives");
      user.muteSubscriptions = await settingsManager.getSetting("telegram-default-subscriptions");
      user.muteWelcome = await settingsManager.getSetting("telegram-default-welcome");
      console.log("saving new user", user);
      await storageManager.storeData(user.id, user);
      if (user.avatar != undefined) {
        console.log("attempting to download avatar", user.avatar);
        avatar = await axios.get(user.avatar);
        //const basePath = peertubeHelpers.plugin.getDataDirectoryPath()
        //writeResult = await fs.writeFile(path.join(basePath, 'avatar'), 'content of my file', function (err) {
      }
      sendTelegram(chatID, "welcome to peertube " + user.displayname);
    }
    console.log("pre-authentication user returned", user, user.id, user.username, user.email, user.role);
    return result.userAuthenticated({
      req,
      res,
      username: user.username,
      email: user.email,
      role: user.role,
      displayName: user.displayname,
    });
  });
  router.use('/telegram', async (req, res) => {
    var redirectURL = instance + '/plugins/telebot/router/callback';
    //      var botName =  await settingsManager.getSetting("telegram-name");
    var telegramWidget = "<html><body><script async src=\"https://telegram.org/js/telegram-widget.js?19\" data-telegram-login=\"" + botName + "\" data-size=\"large\" data-auth-url=\"" + redirectURL + "\" data-request-access=\"write\"></script></body></html>"
    console.log("\n\n\n widget script", telegramWidget);
    console.log("redirect", redirectURL);
    console.log("bot key", botKey);
    console.log("bot name", botName, "\n\n");
    return res.status(200).send(telegramWidget);

  })
  router.use('/doSync', async (req, res) => {
    console.log("instance", instance);
    var videoDataUrl = "";
    var videoApiData = "";
    var limit = 5;
    for (let i = 0; i < syncChannels.length; i++) {
      videoDataUrl = defaultInvidious + "/api/v1/channels/" + syncChannels[i].uuid
      console.log("video data url", videoDataUrl);
      if (syncChannels[i].uuid.length != 24) { continue }
      console.log("passed the uuid sanity checking");
      try {
        console.log("getting video data from ", videoDataUrl);
        videoApiData = await axios.get(videoDataUrl);
        //console.log("the video api data supposably", videoApiData);
        var latestVideos = videoApiData.data.latestVideos;
        //console.log("latest video got ", importedVideos);
        console.log("how many latest videos", latestVideos.length);
        var limit = 5;//TODO, make configurable, 60 is a bit much for testing.
        for (let j = 0; j < limit; j++) {
          console.log(j, "synclist", syncChannels[i].handle, " - ", latestVideos[j].videoId, latestVideos[j].title);
          var duped = false;
          if (importedVideos) {
            console.log("imported video length:", importedVideos.length);
            for (k = 0; k < importedVideos.length; k++) {
              //console.log("duplicate checking", importedVideos[k].yuid, latestVideos[j].videoId);
              if (importedVideos[k].yuid == latestVideos[j].videoId) {
                duped = true;
                k = importedVideos.length;
                console.log("already imported", latestVideos[j].title)
                continue;
              }
            }
          }
          if (duped) {
            continue;
          }

          channelDataUrl = instance + "/api/v1/video-channels/" + syncChannels[i].handle;
          //console.log("channel data url", channelDataUrl);
          channelData = await axios.get(channelDataUrl);
          //console.log(channelData);
          //console.log("channel data data", channelData.data);
          var importResult = await importVideo(channelData.data.id, defaultInvidious + "/watch?v=" + latestVideos[j].videoId, bearerToken);
          console.log("import result", importResult.data.video.uuid);
          newImport = {};
          newImport.puid = importResult.data.video.uuid
          newImport.yuid = latestVideos[j].videoId;
          importedVideos.push(newImport);
          await storageManager.storeData('telegram-imports', importedVideos);
          //var videoJson = getInvidiousJSON(defaultInvidious, latestVideos[j].videoId);
          // console.log("invidious data for video after sync", videoJson);
        }
      } catch (err) {
        console.log('\n\n\n\n\n\nerror getting new videos for ' + err);

      }
    }
  })


}
async function unregister() {
  return;
}
module.exports = {
  register,
  unregister,
};
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
//
//                         functions
//
async function sendTelegram(id, message) {
  console.log("\n\n\n\n\n\nthis is the chat id and message", id, message);
  botApiUrl = "https://api.telegram.org/bot" + botKey + "/sendMessage?chat_id=" + id + "&text=";
  let fixedMessage = encodeURI(message);
  let fullUrl = botApiUrl + fixedMessage;
  var JSON = undefined;
  try {
    JSON = await axios.get(fullUrl);
    console.log("sent telegram");
  } catch (error) {
    console.log("error sending telegram", error);
  }
}
async function videoAnnounce(videoData, firstLine) {
  console.log("video announcing videoData", videoData);
  var videoDataUrl = instance + "/api/v1/videos/" + videoData.uuid
  console.log(videoDataUrl);
  var videoApiData = await axios.get(videoDataUrl);
  console.log("\n\n\n\n\nVideo announcing api data ", videoApiData.data);
  var videoUrl = instance + "/videos/watch/" + videoData.uuid;
  var response = ""
  //var videoUrl = video.dataValues.url
  if (firstLine) {
    response = firstLine
  } else if (videoApiData.data.isLive) {
    response = "🔴 " + videoApiData.data.account.displayName + " went live";
  } else {
    response = "💯 " + videoApiData.data.channel.displayName + " uploaded a new video";
  }
  //response = response + "\n" + videoData.name;
  response = response + "\n" + videoUrl;

  if (debug) {
    //response = response + "\n isLive: " + videoData.isLive;
    //response = response + "\n privacy" + videoApiData.data.privacy.label;
    //response = response + "\n status" + videoApiData.data.state.label;

  }
  console.log("video announce response", response);
  return response;
}
async function getToken(ptuser, ptpassword, ptApi) {
  //console.log("get token", ptuser, ptpassword);
  var clientTokenPath = ptApi + "/oauth-clients/local";
  var userTokenPath = ptApi + "/users/token";
  var username = ptuser;
  var password = ptpassword;
  try {
    let clientresult = await axios.get(clientTokenPath);
    let clientId = clientresult.data.client_id;
    let clientSecret = clientresult.data.client_secret;
    //console.log("obtained client id", clientId, clientSecret);
    var data = new URLSearchParams();
    data.append('client_id', clientId);
    data.append('client_secret', clientSecret);
    data.append('grant_type', 'password');
    data.append('response_type', 'code');
    data.append('username', username);
    data.append('password', password);
    var postData = data.toString();
    //console.log("post data", postData)
    let tokenresponse = await axios.post(userTokenPath, data);
    console.log("returned token", tokenresponse.data.access_token, ptuser, ptpassword.ptApi);
    return (tokenresponse.data.access_token);
  } catch (error) {
    console.log("error in get token", ptuser, ptpassword, ptApi);
    return (-1);
  }
}
async function updateAccountAvatar(avatarUrl, ptcuid, ptApi, bearerToken) {
  /*let url = ptApi + "/users/me/avatar/pick";
  if (undefined == avatarUrl) {
    var avatarURL = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Sepia.svg/180px-Sepia.svg.png"
  } else { var avatarURL = avatarUrl.url }
  let downloadresult = await downloadImage(avatarURL, tempDir + 'aavatar.jpg');
  console.log("download result", downloadresult);
  let cavatarResult = await tiny.post({
    url: url,
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': 'Bearer ' + bearerToken
    },
    data: { avatarfile: fs.createReadStream(tempDir + 'aavatar.jpg') }
  },
    await function _post(err, form) {
      if (err) {
        console.log("account avatar error", err);
        return false;
      }
      else {
        console.log("account avatar updated for " + ptcuid);
        return true;
      }
    });
    */
}
async function updateChannelBanner(channelHandle, bannerUrl, bearerToken) {
  let apiUrl = instance + "/api/v1/video-channels/" + channelHandle + "/banner/pick";
  var fileName = channelHandle + "-banner.jpg";
  var downloader = new Downloader({
    url: bannerUrl,
    directory: basePath + "/banners",//This folder will be created, if it doesn't exist.
    fileName: fileName,
    cloneFiles: false
  })
  console.log("downloader", downloader)
  try {
    var bannerDownloadResult = await downloader.download();//Downloader.download() returns a promise.
    console.log('downloaded', bannerDownloadResult);
  } catch (error) {//IMPORTANT: Handle a possible error. An error is thrown in case of network errors, or status codes of 400 and above.
    console.log('Download failed', fileName, error)
  }
  console.log("got banner", bannerDownloadResult);

  let bannerResult = await tiny.post({
    url: apiUrl,
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': 'Bearer ' + bearerToken
    },
    data: { bannerfile: fs.createReadStream(basePath + "/banners/" + fileName) }
  },
    await function _post(err, form) {
      //console.log("testing further concurrencu");
      if (err) {
        console.log("error", err);
        return false;
      }
      else {
        console.log("channel banner updated for ", channelHandle);
        return true;
      }
    });
  console.log("banner result", bannerResult);
  /*
    const headers = {
      'Content-Type': 'multipart/form-data',
      'Authorization': 'Bearer ' + bearerToken
    }
    const fileData = await fs.createReadStream(basePath + "/banners/" + fileName)
    //const fileData = await fs.readFileSync(basePath + "/banners/" + fileName);
  
    console.log("file data:", fileData);
    //const postData = { bannerfile: fileData }
    var postData = { bannerfile: fs.createReadStream(basePath + "/banners/" + fileName) }
    console.log(headers, postData);
    let ptApi = instance + "/api/v1/video-channels/" + channelHandle + "/banner/pick";
    console.log("channel handle", channelHandle, ptApi, headers, postData);
    try {
      let importResult = await axios.post(ptApi, { postData }, { headers }).catch(function (error) {
        if (error.response) {
          // Request made and server responded
          console.log(error.response.data);
          console.log(error.response.status);
          console.log(error.response.headers);
          console.log("error", error);
        } else if (error.request) {
          // The request was made but no response was received
          console.log(error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.log('Error', error.message);
        }
  
      });
    } catch {
      console.log("error updating channel", ptApi, postData, headers);
    }
  */
}
async function updateChannelAvatar(channelHandle, avatarUrl, bearerToken) {
  let apiUrl = instance + "/api/v1/video-channels/" + channelHandle + "/avatar/pick";
  var fileName = channelHandle + "-avatar.jpg";
  var downloader = new Downloader({
    url: avatarUrl,
    directory: basePath + "/avatars",
    fileName: fileName,
    cloneFiles: false
  })
  //console.log("downloader", downloader)
  try {
    var avatarDownloadResult = await downloader.download();
    console.log('downloaded', avatarDownloadResult);
  } catch (error) {
    console.log('Download failed', fileName, error)
  }
  console.log("banner downloaded", avatarDownloadResult);

  let avatarResult = await tiny.post({
    url: apiUrl,
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': 'Bearer ' + bearerToken
    },
    data: { avatarfile: fs.createReadStream(basePath + "/avatars/" + fileName) }
  },
    await function _post(err, form) {
      //console.log("testing further concurrencu");
      if (err) {
        console.log("error", err);
        return false;
      }
      else {
        console.log("channel avatar updated for ", channelHandle);
        return true;
      }
    });
  console.log("avatar result", avatarResult)
}
async function getInvidiousJSON(invidious, uuid) {
  let url = invidious + "/api/v1/videos/" + uuid;
  try {
    let response = await axios.get(url);
    //console.log(response.data);
    return (response.data);
  } catch (error) {
    console.log("getting invidious JSON failed:", uuid, error);
    return (error);
  }
}

async function importVideo(channelId, videoUrl, bearerToken) {
  console.log("youtube link:", videoUrl);
  const headers = {
    'Content-Type': 'multipart/form-data',
    'Authorization': 'Bearer ' + bearerToken
  }
  const postData =
  {
    //'name': 'shared',
    'targetUrl': videoUrl,
    'channelId': channelId,
    'privacy': 1,
    'license': 2,
    'language': 'en'
  }

  let ptApi = instance + "/api/v1/videos/imports";
  console.log("post data", postData);
  console.log("headers", headers);
  console.log("ptApi", ptApi);
  var importResult = undefined;
  try {
    importResult = await axios.post(ptApi, postData, { headers });
  } catch (err) { console.log("error attempting to import video @", videoUrl, err) }
  console.log("subroutine import result", importResult);
  return importResult;
}
async function getPeertubeVideoInfo(videoUUID, videoHost) {
  console.log("getting peertubveVideoInfo", videoUUID, videoHost);
  if (!videoHost) {
    videoHost = instance;
  }
  var videoJSON = {};
  videoJSON.code = -1;
  if (videoUUID == undefined || videoHost == undefined) {
    console.log("both variables need to be defined", videoHost, videoUUID);
    return videoJSON;
  }
  if (videoHost.indexOf(":") < 1) {
    videoHost = "https://" + videoHost;
  }
  var url = videoHost + "/api/v1/videos/" + videoUUID;
  //console.log(url);
  try {
    var JSON = await axios.get(url);
    if (JSON != undefined) {
      videoJSON = JSON;
      videoJSON.code = JSON.data.state.id;
    } else {
      //console.log("undefined state");
    }
  } catch (error) {
    //console.log("error in getting peertube video info", url);
    if (error) {
      if (error.response) {
        if (error.response.status) {
          //console.log(error.response.status);
          videoJSON.code = error.response.status;
          return videoJSON.code;
        }
      }
    }
  }
  return videoJSON;
}
async function cloneChannel(channelHandle, youtubeUuid, bearerToken) {
  var invidiousDataUrl = defaultInvidious + "/api/v1/channels/" + youtubeUuid;
  var channelResult = await axios.get(invidiousDataUrl);
  var channelJson = channelResult.data
  //console.log("channel jason", channelJson);
  var apiDataUrl = instance + "/api/v1/";
  var description = channelJson.description;
  var author = channelJson.author;
  let updateUrl = instance + "/api/v1/video-channels/" + channelHandle;
  var banner = undefined;
  if (channelJson.authorBanners) {
    banner = channelJson.authorBanners[0].url;
    console.log(channelJson.authorBanners);
    console.log
  }
  var avatar = undefined;
  if (channelJson.authorThumbnails) {
    avatar = channelJson.authorThumbnails[0].url;
    console.log(channelJson.authorThumbnails);
  }
  console.log("attempting to update channel", updateUrl, description, banner, avatar);
  const headers = {
    'Authorization': 'Bearer ' + bearerToken
  }
  const postData =
  {
    'description': description,
    'displayName': author
  }
  console.log("\nheaders", headers, "\n\n body", postData);
  try {
    let putresponse = await axios.put(updateUrl, postData, { headers });
    console.log("put update", putresponse.status);
    //return putresponse.status;
  } catch (error) {
    if (error) {
      console.log("channel update error", error);
      var reply = -1;
    }
    //return (reply);

  }
  await updateChannelAvatar(channelHandle, avatar, bearerToken);
  console.log("avatar updated");
  await updateChannelBanner(channelHandle, banner, bearerToken);
  console.log("banner updated");
}