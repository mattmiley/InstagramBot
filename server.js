const fss = require("fs");
const fs = require("fs").promises;
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const Gram = require("instagram-private-api");
const get = require("request-promise");
const nodeHtmlToImage = require("node-html-to-image");

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
  today.setDate(today.getDate() - 1)
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

  var dates = stats.date.split("-");
  var date = dates[1] + "-" + dates[2] + "-" + dates[0];

  var html =
    `<html>
  <head>
    <style>
      body {
        width: 800px;
        height: 800px;
      }
    </style>
  </head>
  <body style="background: black;">
  <h1 style="color: black; text-align: center; font-size:10px;">Hello world!</h4>
  <h1 style="color: white; text-align: center; font-size:60px;">` +
    stats.region.province +
    ` Covid Stats</h4>
    <h1 style="color: white; text-align: center; font-size:30px;">` +
    date +
    `</h1>
    <h1 style="color: white; text-align: center; font-size:50px;">Confirmed: ` +
    numCommas(stats.confirmed) +
    `</h1>
    <h1 style="color: white; text-align: center; font-size:50px;">` +
    "(+" +
    numCommas(stats.confirmed_diff) +
    ") (" +
    ((stats.confirmed_diff / stats.confirmed) * 100).toFixed(2) +
    "%)" +
    `</h1>
    <h1 style="color: white; text-align: center; font-size:50px;">` +
    "Active: " +
    numCommas(stats.active) +
    `</h1>
    <h1 style="color: white; text-align: center; font-size:50px;">` +
    "(+" +
    numCommas(stats.active_diff) +
    ") (" +
    ((stats.active_diff / stats.active) * 100).toFixed(2) +
    "%)" +
    `</h1>
    <h1 style="color: white; text-align: center; font-size:50px;">` +
    "Deaths: " +
    stats.deaths +
    `</h1>
    <h1 style="color: white; text-align: center; font-size:50px;">` +
    "(+" +
    numCommas(stats.deaths_diff) +
    ") (" +
    ((stats.deaths_diff / stats.deaths) * 100).toFixed(2) +
    "%)" +
    `</h1>
  </body>
</html>`;

  await nodeHtmlToImage({
    output: "./pic.jpg",
    html: html,
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
  if (publishResult.status === "ok") {
    lastPostedDate = todaysDateStamp;
  }
}

//updatePost(); //dev
setInterval(updatePost, 600000); //Runs this funtion every 10 minutes
