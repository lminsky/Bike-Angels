// Initialize Firebase
  var config = {
    apiKey: "AIzaSyDjVkk2CrXYPyBqL2aKlVYwX9Tl6KSugvE",
    authDomain: "citibike-tracker.firebaseapp.com",
    databaseURL: "https://citibike-tracker.firebaseio.com",
    projectId: "citibike-tracker",
    storageBucket: "citibike-tracker.appspot.com",
    messagingSenderId: "1068264952309"
  };
  firebase.initializeApp(config);

getLocation();
Push.Permission.request();

var currentPos;
var stations;
var previousStations;
var lastUpdate;
var maxDist;

function success(pos) {
  currentPos = pos.coords;
  firebase.database().ref('stations/current').on('value', function(snapshot) {
    stations = snapshot.val();
  });
  firebase.database().ref('stations/previous').on('value', function(snapshot) {
    previousStations = snapshot.val();
  });
  firebase.database().ref('stations/lastupdate').on('value', function(snapshot) {
    lastUpdate = snapshot.val().time;
    updatePage();
  });
  window.onhashchange = updatePage;
}

function updatePage() {
  maxDist = document.getElementById("distInput").value;
  maxDist = Number(maxDist);
  if(maxDist == NaN) {
    maxDist = .6;
    document.getElementById("distInput").value = .6;
  }
  var angelStations = [];
  for(var i = 0; i < stations.length; i++) {
    var lat1 = currentPos.latitude;
    var lon1 = currentPos.longitude;
    var prop = stations[i].properties;
    var geo = stations[i].geometry;
    var lat2 = geo.coordinates[1];
    var lon2 = geo.coordinates[0];
    var d = distance(lat1, lon1, lat2, lon2);
    if(d < maxDist && (prop.bike_angels_action == "give" || prop.bike_angels_action == "take")) {
      angelStations.push({
        index: i,
        id: prop.station_id,
        dist: d,
        name: prop.name,
        action: prop.bike_angels_action,
        points: prop.bike_angels_points,
        previousPoints: previousStations[i].properties.bike_angels_points,
        bikes: prop.bikes_available,
        docks: prop.docks_available,
        lat: geo.coordinates[1],
        lon: geo.coordinates[0],
      });
    }
  }

  angelStations.sort(function(a, b) {
    return a.dist - b.dist;
  });

  angelStations.sort(function(a, b) {
    return b.points - a.points;
  });

  var t = document.getElementById("t1");
  t.innerHTML = "<tr><th>Points</th><th>Location</th><th>Distance (miles)</th></tr>";
  for(i in angelStations) {
    var tr = document.createElement("tr");
    var td1 = document.createElement("td");
    var pointDiff = Number(angelStations[i].points) - Number(angelStations[i].previousPoints);
    var points = angelStations[i].points;
    if(pointDiff > 0) {
      points += "<span class='more points'>(+" + pointDiff + ")</span>";
    } else if(pointDiff < 0) {
      points += "<span class='fewer points'>(" + pointDiff + ")</span>";
    }
    td1.innerHTML = points;
    var prevPoints = document.createElement("span");
    var td3 = document.createElement("td");
    var link = "https://www.google.com/maps/place/" + angelStations[i].lat + "+" + angelStations[i].lon;
    td3.innerHTML = "<a href='" + link + "' target='_blank'>" + angelStations[i].name + "</a>";
    var td4 = document.createElement("td");
    td4.innerHTML = Math.round(angelStations[i].dist * 100) / 100;
    tr.appendChild(td1);
    tr.appendChild(td3);
    tr.appendChild(td4);
    if(angelStations[i].action == "take") {
      tr.setAttribute("class", "take");
    }
    t.appendChild(tr);

    points = Number(angelStations[i].points);
    if(i == 0 || points > 1) {
      var icon = "/assets/give.png";
      if(angelStations[i].action == "take") {
        icon = "/assets/take.png";
      }
      Push.create(points + " Points", {
        body: angelStations[i].name,
        vibrate: [100, 100, 100],    // An array of vibration pulses for mobile devices.
        icon: icon,
        requireInteraction: true,
        tag: angelStations[i].id,
        onClick: function() {
            window.open(link);
        }  
      });
    }
  }
  var tim = new Date(lastUpdate);
  document.getElementById("info").innerHTML = "Last updated: " + tim.toLocaleString();
}

function error(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

function getLocation() {
  navigator.geolocation.getCurrentPosition(success, error, {
    enableHighAccuracy: true
  });
}

function distance(lat1, lon1, lat2, lon2, unit) {
  var radlat1 = Math.PI * lat1/180;
  var radlat2 = Math.PI * lat2/180;
  var theta = lon1-lon2;
  var radtheta = Math.PI * theta/180;
  var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  if (dist > 1) {
    dist = 1;
  }
  dist = Math.acos(dist);
  dist = dist * 180/Math.PI;
  dist = dist * 60 * 1.1515;
  if (unit=="K") { dist = dist * 1.609344; }
  if (unit=="N") { dist = dist * 0.8684; }
  return dist;
}
