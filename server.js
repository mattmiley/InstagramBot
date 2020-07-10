const fss = require("fs");
const fs = require("fs").promises;
const { createCanvas, loadImage } = require("canvas");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const Gram = require("instagram-private-api");
const get = require("request-promise");
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

function getDateStamp() {
  var today = new Date();
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

var lastPostedDate = "2020-07-09";

async function updatePost() {
  var todaysDateStamp = getDateStamp();

  if (todaysDateStamp === lastPostedDate) {
    console.log("already posted");
    return;
  }
  // await response of fetch call
  let response = await fetch(
    "https://covid-api.com/api/reports?date=" +
      todaysDateStamp +
      "&q=US%20Ohio&iso=USA&region_name=US&region_province=Ohio&city_name=Lake"
  );
  // only proceed once promise is resolved
  let data = await response.json();

  if (data.data.length === 0) {
    console.log("no data yet");
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

  const width = 800;
  const height = 800;

  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  // context.fillStyle = "#000";
  // context.fillRect(0, 0, width, height);

  const text = "Hello, World!";

  context.textAlign = "center";
  context.fillStyle = "#fff";
  context.font = "bold 45pt Menlo";
  context.fillText(stats.region.province + " Covid Stats", 400, 80);
  context.font = "bold 30pt Menlo";
  var dates = stats.date.split("-");
  var date = dates[1] + "-" + dates[2] + "-" + dates[0];
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

  await loadImage("./ohio.png").then(async (image) => {
    context.drawImage(image, 20, 700, 80, 80);
    const buffer = canvas.toBuffer("image/jpeg");
    await fs.writeFile("./pic.jpg", buffer);
  });

  const ig = new Gram.IgApiClient();

  // basic login-procedure
  ig.state.generateDevice(process.env.IG_USERNAME);
  // ig.state.proxyUrl = process.env.IG_PROXY;
  await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);

  const path = "./pic.jpg";
  const { latitude, longitude, searchQuery } = {
    latitude: 40.865487,
    longitude: -82.69551,
    searchQuery: "ohio",
  };

  const locations = await ig.search.location(latitude, longitude, searchQuery);

  const mediaLocation = locations[0];
  console.log(mediaLocation.name);

  var buf = await fs.readFile(path);

  const publishResult = await ig.publish.photo({
    file: buf,
    caption: "my caption",
    location: mediaLocation,
  });

  console.log(publishResult.status);
}

setInterval(updatePost, 600000); //Runs this funtion every 10 minutes
