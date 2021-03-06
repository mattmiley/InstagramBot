const fss = require("fs");
const fs = require("fs").promises;
const { createCanvas, loadImage } = require("canvas");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const Gram = require("instagram-private-api");

dotenv.config();

var util = require("util");
var log_file = fss.createWriteStream(__dirname + "/debug.log", { flags: "a" });
var log_stdout = process.stdout;

console.log = function (d) {
  log_file.write(new Date() + " " + util.format(d) + "\n");
  log_stdout.write(new Date() + " " + util.format(d) + "\n");
};

function numCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getDateStamp(offset) {
  var today = new Date();
  today.setDate(today.getDate() - offset);
  var month = today.getMonth() + 1;
  if (month < 10) {
    month = "0" + month;
  }
  var day = today.getDate();
  if (day < 10) {
    day = "0" + day;
  }
  return today.getFullYear() + "-" + month + "-" + day;
}

var lastPostedDate = getDateStamp(2);

async function updatePost() {
  try {
    var todaysDateStamp = getDateStamp(1);

    if (todaysDateStamp === lastPostedDate) {
      console.log("already posted");
      return;
    }

    var states = ["ohio", "florida", "california"];
    var i;
    for (i = 0; i < states.length; i++) {
      // await response of fetch call
      let response = await fetch(
        "https://covid-api.com/api/reports?date=" +
          todaysDateStamp +
          "&q=US%20" +
          states[i] +
          "&iso=USA&region_name=US&region_province=" +
          states[i]
      );
      // only proceed once promise is resolved
      let data = await response.json();

      if (data.data.length === 0) {
        console.log("no data yet: " + todaysDateStamp);
        return;
      }

      var stats = data.data[0];
      console.log(stats.region.province);
      console.log(stats.date);
      console.log(stats.confirmed);
      console.log(stats.confirmed_diff);
      console.log(stats.active);
      console.log(stats.active_diff);
      console.log(stats.deaths);
      console.log(stats.deaths_diff);

      var dates = stats.date.split("-");
      var date = dates[1] + "-" + dates[2] + "-" + dates[0];

      const width = 800;
      const height = 800;

      const canvas = createCanvas(width, height);
      const context = canvas.getContext("2d");

      context.textAlign = "center";
      context.fillStyle = "#fff";
      context.font = "bold 45pt Menlo";
      context.fillText(stats.region.province + " Covid Stats", 400, 80);
      context.font = "bold 30pt Menlo";
      context.fillText(date, 400, 160);
      context.font = "bold 35pt Menlo";

      context.fillText("Confirmed: " + numCommas(stats.confirmed), 400, 260);
      context.fillText(
        "(+" +
          numCommas(stats.confirmed_diff) +
          ") (" +
          ((stats.confirmed_diff / stats.confirmed) * 100).toFixed(2) +
          "%)",
        400,
        310
      );

      context.fillText("Active: " + numCommas(stats.active), 400, 460);
      context.fillText(
        "(+" +
          numCommas(stats.active_diff) +
          ") (" +
          ((stats.active_diff / stats.active) * 100).toFixed(2) +
          "%)",
        400,
        510
      );

      context.fillText("Deaths: " + stats.deaths, 400, 660);
      context.fillText(
        "(+" +
          numCommas(stats.deaths_diff) +
          ") (" +
          ((stats.deaths_diff / stats.deaths) * 100).toFixed(2) +
          "%)",
        400,
        710
      );

      await loadImage("./artwork/" + states[i] + ".png").then(async (image) => {
        context.drawImage(image, 20, 700, 80, 80);
        const buffer = canvas.toBuffer("image/jpeg");
        await fs.writeFile("./" + states[i] + ".jpg", buffer);
      });

      const ig = new Gram.IgApiClient();

      // basic login-procedure
      var ig_user_name = states[i] + "_covid_stats";
      ig.state.generateDevice(ig_user_name);
      // ig.state.proxyUrl = process.env.IG_PROXY;
      await ig.account.login(ig_user_name, process.env.IG_PASSWORD);

      const path = "./" + states[i] + ".jpg";

      const { latitude, longitude, searchQuery } = {
        latitude: 0.0,
        longitude: 0.0,
        searchQuery: states[i],
      };

      const locations = await ig.search.location(
        latitude,
        longitude,
        searchQuery
      );

      const mediaLocation = locations[0];
      console.log(mediaLocation.name);

      var buf = await fs.readFile(path);

      const publishResult = await ig.publish.photo({
        file: buf,
        caption:
          "#" +
          states[i].charAt(0).toUpperCase() +
          states[i].slice(1) +
          "Covid19 #covid19 #covid_19 #covid Stats for " +
          date,
        location: mediaLocation,
      });

      console.log(publishResult.status);
      if (publishResult.status === "ok") {
        lastPostedDate = todaysDateStamp;
      }
    }
  } catch (err) {
    console.log(err.message);
    console.log(err);
  }
}

if (
  typeof process.env.username !== "undefined" &&
  process.env.username === "mmiley"
) {
  console.log("dev run.");
  updatePost(); //dev
} else {
  setInterval(updatePost, 1800000); //Runs this funtion every 30 minutes
}
